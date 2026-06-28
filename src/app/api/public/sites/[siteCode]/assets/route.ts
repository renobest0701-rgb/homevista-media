import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import { createHash } from "crypto";

// Public API — no session auth, but API key validation + CORS origin check
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteCode: string }> }
) {
  const { siteCode } = await params;
  const { searchParams } = new URL(req.url);
  const origin = req.headers.get("origin") ?? "";

  // Validate site
  const site = await prisma.site.findUnique({
    where: { code: siteCode, status: "ACTIVE" },
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // CORS origin check — only enforce if allowedOrigins is non-empty
  if (site.allowedOrigins.length > 0 && origin) {
    const allowed = site.allowedOrigins.some(
      (o) => o === origin || o === "*"
    );
    if (!allowed) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
  }

  // API key check — only enforce if site has a key hash set
  if (site.apiKeyHash) {
    const apiKey = req.headers.get("x-api-key") ?? "";
    const hash = createHash("sha256").update(apiKey).digest("hex");
    if (hash !== site.apiKeyHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const cursor = searchParams.get("cursor");
  const prefecture = searchParams.get("prefecture");
  const category = searchParams.get("category"); // tag code e.g. "cat-exterior"
  const season = searchParams.get("season");
  const assetType = searchParams.get("assetType");
  const projectId = searchParams.get("projectId");
  const timeOfDay = searchParams.get("timeOfDay");

  const now = new Date();

  const [total, assets] = await Promise.all([
    prisma.asset.count({
      where: buildWhere({ site, prefecture, category, season, assetType, projectId, timeOfDay, cursor, now }),
    }),
    prisma.asset.findMany({
      where: buildWhere({ site, prefecture, category, season, assetType, projectId, timeOfDay, cursor, now }),
      select: {
        id: true,
        assetCode: true,
        assetType: true,
        reviewStatus: true,
        title: true,
        primarySeason: true,
        primaryTimeOfDay: true,
        weather: true,
        files: {
          where: {
            fileRole: { in: ["THUMBNAIL", "PREVIEW", "WEB_1080", "WEB_720"] },
            isCurrent: true,
          },
          select: {
            id: true,
            fileRole: true,
            objectKey: true,
            width: true,
            height: true,
            durationSeconds: true,
            mimeType: true,
          },
        },
        tags: {
          where: { status: "APPROVED" as const },
          select: { tag: { select: { code: true, labelJa: true, labelEn: true } } },
        },
        shoot: {
          select: {
            shootDate: true,
            project: {
              select: { id: true, name: true, prefectureCode: true, municipalityCode: true },
            },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      skip: cursor ? 0 : (page - 1) * limit,
    }),
  ]);

  // Resolve CDN URLs (never expose raw object keys)
  const storage = getStorage();
  const data = await Promise.all(
    assets.slice(0, limit).map(async (asset) => ({
      ...asset,
      files: await Promise.all(
        asset.files.map(async (f) => ({
          ...f,
          url: await storage.getDownloadUrl(f.objectKey, 86400),
          objectKey: undefined,
        }))
      ),
    }))
  );

  const corsHeaders: Record<string, string> = {};
  if (origin && (site.allowedOrigins.includes(origin) || site.allowedOrigins.includes("*"))) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
    corsHeaders["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    corsHeaders["Access-Control-Allow-Headers"] = "x-api-key, Content-Type";
  }

  return NextResponse.json(
    {
      data,
      total,
      nextCursor: assets.length > limit ? assets[limit].id : null,
      hasMore: assets.length > limit,
    },
    { headers: corsHeaders }
  );
}

// OPTIONS for preflight
export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ siteCode: string }> }
) {
  const { siteCode } = await params;
  const origin = req.headers.get("origin") ?? "";

  const site = await prisma.site.findUnique({ where: { code: siteCode } });
  if (!site) return new NextResponse(null, { status: 404 });

  const allowed =
    site.allowedOrigins.length === 0 ||
    site.allowedOrigins.includes(origin) ||
    site.allowedOrigins.includes("*");

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowed ? origin : "",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "x-api-key, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

type WhereArgs = {
  site: { id: string };
  prefecture: string | null;
  category: string | null;
  season: string | null;
  assetType: string | null;
  projectId: string | null;
  timeOfDay: string | null;
  cursor: string | null;
  now: Date;
};

function buildWhere({ site, prefecture, category, season, assetType, projectId, timeOfDay, cursor, now }: WhereArgs) {
  return {
    deletedAt: null,
    reviewStatus: "APPROVED" as const,
    rightsStatus: "VALID" as const,
    visibility: "PUBLIC" as const,
    publications: {
      some: {
        siteId: site.id,
        publicationStatus: "PUBLISHED" as const,
        publishFrom: { lte: now },
        OR: [{ publishUntil: null }, { publishUntil: { gte: now } }],
      },
    },
    // Shoot-level filters merged to avoid key overwrite
    ...((prefecture) ? { shoot: { project: { prefectureCode: prefecture } } } : {}),
    ...(assetType ? { assetType: assetType as never } : {}),
    ...(season
      ? { OR: [{ primarySeason: season as never }, { mixedSeasons: { has: season as never } }] }
      : {}),
    ...(timeOfDay ? { primaryTimeOfDay: timeOfDay as never } : {}),
    ...(projectId ? { projectId } : {}),
    // Category filter via tags (tag code e.g. "cat-exterior")
    ...(category
      ? { tags: { some: { status: "APPROVED" as const, tag: { code: category } } } }
      : {}),
    ...(cursor ? { id: { gt: cursor } } : {}),
  };
}
