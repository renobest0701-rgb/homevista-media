import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const updateSchema = z.object({
  publicationStatus: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "UNPUBLISHED", "ERROR"]).optional(),
  publishFrom: z.string().datetime().optional().nullable(),
  publishUntil: z.string().datetime().optional().nullable(),
  pageUrl: z.string().url().optional().nullable(),
  externalReference: z.string().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});

export const GET = withAuth(async ({ user, params }) => {
  requireRole(user, "PROJECT_MANAGER");

  const { id } = params as { id: string };
  const pub = await prisma.assetPublication.findUnique({
    where: { id },
    include: {
      asset: { select: { id: true, assetCode: true, title: true, assetType: true } },
      site: { select: { id: true, name: true, code: true, type: true } },
      project: { select: { id: true, name: true, code: true } },
    },
  });
  if (!pub) return apiError("Publication not found", 404);

  return apiResponse(pub);
});

export const PATCH = withAuth(async ({ user, req, params }) => {
  requireRole(user, "ASSET_ADMIN");

  const { id } = params as { id: string };
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const existing = await prisma.assetPublication.findUnique({ where: { id } });
  if (!existing) return apiError("Publication not found", 404);

  const now = new Date();
  const nextStatus = parsed.data.publicationStatus;

  const pub = await prisma.assetPublication.update({
    where: { id },
    data: {
      ...parsed.data,
      publishFrom: parsed.data.publishFrom ? new Date(parsed.data.publishFrom) : undefined,
      publishUntil: parsed.data.publishUntil ? new Date(parsed.data.publishUntil) : undefined,
      // Track timestamps for status transitions
      ...(nextStatus === "PUBLISHED" && existing.publicationStatus !== "PUBLISHED"
        ? { publishedAt: now }
        : {}),
      ...(nextStatus === "UNPUBLISHED" && existing.publicationStatus === "PUBLISHED"
        ? { unpublishedAt: now }
        : {}),
      lastSyncAt: now,
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
      entityId: id,
      action: "PUBLICATION_UPDATED",
      beforeData: { status: existing.publicationStatus },
      afterData: { status: pub.publicationStatus },
    },
  });

  return apiResponse(pub);
});

export const DELETE = withAuth(async ({ user, params }) => {
  requireRole(user, "ASSET_ADMIN");

  const { id } = params as { id: string };
  const existing = await prisma.assetPublication.findUnique({ where: { id } });
  if (!existing) return apiError("Publication not found", 404);

  if (existing.publicationStatus === "PUBLISHED") {
    return apiError("Unpublish before deleting", 409);
  }

  await prisma.assetPublication.delete({ where: { id } });

  return apiResponse({ deleted: true });
});
