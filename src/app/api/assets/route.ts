import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

export const GET = withAuth(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 24));

  const q = searchParams.get("q");
  const assetType = searchParams.get("assetType");
  const productionStatus = searchParams.get("productionStatus");
  const reviewStatus = searchParams.get("reviewStatus");
  const rightsStatus = searchParams.get("rightsStatus");
  const projectId = searchParams.get("projectId");
  const shootId = searchParams.get("shootId");
  const clientId = searchParams.get("clientId");
  const prefectureCode = searchParams.get("prefectureCode");
  const season = searchParams.get("season");
  const timeOfDay = searchParams.get("timeOfDay");
  const visibility = searchParams.get("visibility");
  const peoplePresent = searchParams.get("peoplePresent");

  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";
  const isUploader = user.role === "UPLOADER";

  // Base filter: soft-delete and role restrictions
  const where: Record<string, unknown> = {
    deletedAt: null,
    ...(isClientRole
      ? {
          client: { organizationId: user.organizationId },
          reviewStatus: "APPROVED",
          rightsStatus: "VALID",
          productionStatus: { in: ["FINAL_DELIVERY", "WEB_DELIVERY", "SNS_VERSION", "EDITED"] },
        }
      : {}),
    ...(isUploader
      ? { shoot: { teamOrgId: user.organizationId } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { assetCode: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(assetType ? { assetType } : {}),
    ...(productionStatus ? { productionStatus } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
    ...(rightsStatus ? { rightsStatus } : {}),
    ...(projectId ? { projectId } : {}),
    ...(shootId ? { shootId } : {}),
    ...(clientId && !isClientRole ? { clientId } : {}),
    ...(prefectureCode
      ? { shoot: { project: { prefectureCode } } }
      : {}),
    ...(season ? { OR: [{ primarySeason: season }, { mixedSeasons: { has: season } }] } : {}),
    ...(timeOfDay ? { OR: [{ primaryTimeOfDay: timeOfDay }, { mixedTimeOfDay: { has: timeOfDay } }] } : {}),
    ...(visibility ? { visibility } : {}),
    ...(peoplePresent !== null ? { peoplePresent: peoplePresent === "true" } : {}),
  };

  const [total, assets] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: {
        files: {
          where: { fileRole: { in: ["THUMBNAIL", "PREVIEW"] }, isCurrent: true },
          select: { id: true, fileRole: true, objectKey: true, width: true, height: true, durationSeconds: true },
        },
        tags: {
          where: { status: "APPROVED" },
          include: { tag: { select: { code: true, labelJa: true, labelEn: true } } },
        },
        shoot: { select: { id: true, name: true, shootDate: true } },
        project: { select: { id: true, name: true, code: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { files: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiResponse({ data: assets, total, page, limit });
});

const bulkUpdateSchema = z.object({
  assetIds: z.array(z.string().uuid()),
  updates: z.object({
    productionStatus: z.string().optional(),
    visibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]).optional(),
    primarySeason: z.string().optional(),
    primaryTimeOfDay: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const POST = withAuth(async ({ user, req }) => {
  // Bulk update endpoint
  requireRole(user, "ASSET_ADMIN");
  const body = await req.json();

  if (!body.assetIds) {
    return apiError("Use POST /api/assets/{id} for single create", 400);
  }

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const { updates } = parsed.data;
  await prisma.asset.updateMany({
    where: { id: { in: parsed.data.assetIds }, deletedAt: null },
    data: {
      ...(updates.visibility ? { visibility: updates.visibility } : {}),
      ...(updates.notes ? { notes: updates.notes } : {}),
    },
  });

  return apiResponse({ updated: parsed.data.assetIds.length });
});
