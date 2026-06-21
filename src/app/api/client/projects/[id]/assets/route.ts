import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";

export const GET = withAuth(async ({ user, params }) => {
  requireRole(user, "CLIENT_USER");
  const projectId = params?.id;
  if (!projectId) return apiError("Missing id", 400);

  // Verify project belongs to client's org
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      client: { organizationId: user.organizationId },
    },
  });
  if (!project) return apiError("Project not found", 404);

  const assets = await prisma.asset.findMany({
    where: {
      projectId,
      deletedAt: null,
      reviewStatus: "APPROVED",
      rightsStatus: "VALID",
      productionStatus: {
        in: ["FINAL_DELIVERY", "WEB_DELIVERY", "SNS_VERSION", "EDITED"],
      },
      deliveryItems: { some: { allowPreview: true } },
    },
    include: {
      files: {
        where: {
          isCurrent: true,
          fileRole: { in: ["THUMBNAIL", "PREVIEW", "WEB_1080", "CLIENT_DELIVERY"] },
        },
      },
      tags: {
        where: { status: "APPROVED" },
        include: { tag: { select: { code: true, labelJa: true } } },
      },
      deliveryItems: { select: { allowDownload: true, downloadVariant: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate presigned preview URLs (don't expose object keys)
  const storage = getStorage();
  const result = await Promise.all(
    assets.map(async (asset) => ({
      id: asset.id,
      assetCode: asset.assetCode,
      assetType: asset.assetType,
      productionStatus: asset.productionStatus,
      title: asset.title,
      primarySeason: asset.primarySeason,
      primaryTimeOfDay: asset.primaryTimeOfDay,
      canDownload: asset.deliveryItems.some((d) => d.allowDownload),
      tags: asset.tags.map((t) => t.tag),
      files: await Promise.all(
        asset.files.map(async (f) => ({
          id: f.id,
          fileRole: f.fileRole,
          mimeType: f.mimeType,
          width: f.width,
          height: f.height,
          durationSeconds: f.durationSeconds,
          url: await storage.getDownloadUrl(f.objectKey, 3600),
        }))
      ),
    }))
  );

  return apiResponse(result);
});
