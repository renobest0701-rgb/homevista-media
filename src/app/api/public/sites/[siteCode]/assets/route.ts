import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";

// Public API — no auth required, but API key validation for known sites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteCode: string }> }
) {
  const { siteCode } = await params;
  const { searchParams } = new URL(req.url);

  // Validate site
  const site = await prisma.site.findUnique({
    where: { code: siteCode, status: "ACTIVE" },
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  // Validate API key if set
  const apiKey = req.headers.get("x-api-key");
  if (site.apiKeyHash) {
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(apiKey ?? "").digest("hex");
    if (hash !== site.apiKeyHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const cursor = searchParams.get("cursor");
  const prefecture = searchParams.get("prefecture");
  const category = searchParams.get("category");
  const season = searchParams.get("season");
  const assetType = searchParams.get("assetType");
  const projectId = searchParams.get("projectId");

  const now = new Date();

  const assets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      reviewStatus: "APPROVED",
      rightsStatus: "VALID",
      visibility: "PUBLIC",
      publications: {
        some: {
          siteId: site.id,
          publicationStatus: "PUBLISHED",
          publishFrom: { lte: now },
          OR: [{ publishUntil: null }, { publishUntil: { gte: now } }],
        },
      },
      ...(prefecture
        ? { shoot: { project: { prefectureCode: prefecture } } }
        : {}),
      ...(assetType ? { assetType: assetType as never } : {}),
      ...(season
        ? { OR: [{ primarySeason: season as never }, { mixedSeasons: { has: season as never } }] }
        : {}),
      ...(projectId ? { projectId } : {}),
      ...(cursor ? { id: { gt: cursor } } : {}),
    },
    select: {
      id: true,
      assetCode: true,
      assetType: true,
      productionStatus: true,
      title: true,
      primarySeason: true,
      primaryTimeOfDay: true,
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
        where: { status: "APPROVED" },
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
  });

  // Resolve URLs (strip object keys, return CDN URLs)
  const storage = getStorage();
  const data = await Promise.all(
    assets.slice(0, limit).map(async (asset) => ({
      ...asset,
      files: await Promise.all(
        asset.files.map(async (f) => ({
          ...f,
          url: await storage.getDownloadUrl(f.objectKey, 86400),
          objectKey: undefined, // never expose raw object keys
        }))
      ),
    }))
  );

  return NextResponse.json({
    data,
    nextCursor: assets.length > limit ? assets[limit].id : null,
    hasMore: assets.length > limit,
  });
}
