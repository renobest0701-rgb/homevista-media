import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  productionStatus: z.string().optional(),
  visibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]).optional(),
  primarySeason: z.string().optional(),
  primaryTimeOfDay: z.string().optional(),
  weather: z.string().optional(),
  mixedSeasons: z.array(z.string()).optional(),
  mixedTimeOfDay: z.array(z.string()).optional(),
  mixedLocations: z.boolean().optional(),
  mixedFacilities: z.boolean().optional(),
  peoplePresent: z.boolean().optional(),
  recognizablePeople: z.boolean().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ user, params }) => {
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  const asset = await prisma.asset.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(isClientRole
        ? {
            client: { organizationId: user.organizationId },
            reviewStatus: "APPROVED",
          }
        : {}),
    },
    include: {
      files: { where: { isCurrent: true }, orderBy: { fileRole: "asc" } },
      tags: {
        where: isClientRole ? { status: "APPROVED" } : {},
        include: { tag: true, approver: { select: { id: true, name: true } } },
      },
      versions: { orderBy: { versionNumber: "desc" } },
      usagePolicies: { include: { policy: true } },
      publications: isClientRole ? { where: { publicationStatus: "PUBLISHED" } } : undefined,
      shoot: {
        include: {
          project: true,
          locations: { include: { location: true } },
          permissions: isClientRole
            ? { select: { id: true, permissionType: true, status: true, validFrom: true, validUntil: true } }
            : true,
        },
      },
      derivedFrom: { include: { sourceAsset: { select: { id: true, assetCode: true, title: true } } } },
      usedIn: { include: { derivedAsset: { select: { id: true, assetCode: true, title: true } } } },
      processingJobs: isClientRole ? false : { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!asset) return apiError("Asset not found", 404);
  return apiResponse(asset);
});

export const PATCH = withAuth(async ({ user, req, params }) => {
  requireRole(user, "ASSET_ADMIN");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      peoplePresent: parsed.data.peoplePresent,
      recognizablePeople: parsed.data.recognizablePeople,
      mixedLocations: parsed.data.mixedLocations,
      mixedFacilities: parsed.data.mixedFacilities,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      entityType: "Asset",
      entityId: id,
      action: "UPDATE",
      afterData: parsed.data as object,
    },
  });

  return apiResponse(asset);
});

export const DELETE = withAuth(async ({ user, params }) => {
  requireRole(user, "ASSET_ADMIN");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  // Soft delete
  await prisma.asset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      entityType: "Asset",
      entityId: id,
      action: "SOFT_DELETE",
    },
  });

  return apiResponse({ success: true });
});
