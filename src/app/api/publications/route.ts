import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const createSchema = z.object({
  assetId: z.string().min(1),
  siteId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  channelType: z.enum([
    "AREA_SITE", "PROPERTY_SITE", "CLIENT_PORTAL", "CORPORATE_SITE",
    "INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK", "LINE", "EXTERNAL_SITE", "OTHER",
  ]),
  externalReference: z.string().optional(),
  pageUrl: z.string().url().optional(),
  publishFrom: z.string().datetime().optional(),
  publishUntil: z.string().datetime().optional(),
});

export const GET = withAuth(async ({ user, req }) => {
  requireRole(user, "PROJECT_MANAGER");

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const assetId = searchParams.get("assetId");
  const siteId = searchParams.get("siteId");
  const status = searchParams.get("status");

  const where = {
    ...(assetId ? { assetId } : {}),
    ...(siteId ? { siteId } : {}),
    ...(status ? { publicationStatus: status as never } : {}),
  };

  const [total, publications] = await Promise.all([
    prisma.assetPublication.count({ where }),
    prisma.assetPublication.findMany({
      where,
      include: {
        asset: { select: { id: true, assetCode: true, title: true, assetType: true, reviewStatus: true } },
        site: { select: { id: true, name: true, code: true, type: true } },
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiResponse({ data: publications, total, page, limit });
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "ASSET_ADMIN");

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  // Verify asset is approved before publishing
  const asset = await prisma.asset.findUnique({
    where: { id: parsed.data.assetId },
    select: { id: true, reviewStatus: true, rightsStatus: true, visibility: true },
  });
  if (!asset) return apiError("Asset not found", 404);
  if (asset.reviewStatus !== "APPROVED") {
    return apiError("Only APPROVED assets can be published", 422);
  }

  // Prevent duplicate publication to same site/channel
  if (parsed.data.siteId) {
    const existing = await prisma.assetPublication.findFirst({
      where: {
        assetId: parsed.data.assetId,
        siteId: parsed.data.siteId,
        publicationStatus: { notIn: ["UNPUBLISHED"] },
      },
    });
    if (existing) return apiError("Asset already published to this site", 409);
  }

  const pub = await prisma.assetPublication.create({
    data: {
      ...parsed.data,
      publishFrom: parsed.data.publishFrom ? new Date(parsed.data.publishFrom) : new Date(),
      publishUntil: parsed.data.publishUntil ? new Date(parsed.data.publishUntil) : undefined,
      publicationStatus: "DRAFT",
    },
    include: {
      asset: { select: { id: true, assetCode: true, title: true } },
      site: { select: { id: true, name: true, code: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "AssetPublication",
      entityId: pub.id,
      action: "PUBLICATION_CREATED",
      afterData: { assetId: pub.assetId, siteId: pub.siteId, channelType: pub.channelType },
    },
  });

  return apiResponse(pub, 201);
});
