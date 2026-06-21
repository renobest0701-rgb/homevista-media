import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";

const schema = z.object({
  fileRole: z.string().optional(),
  expiresInSeconds: z.number().min(60).max(86400).default(3600),
});

export const POST = withAuth(async ({ user, req, params }) => {
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  // Verify access
  const asset = await prisma.asset.findFirst({
    where: {
      id,
      deletedAt: null,
      rightsStatus: "VALID",
      reviewStatus: "APPROVED",
      ...(isClientRole
        ? {
            client: { organizationId: user.organizationId },
          }
        : {}),
    },
    include: {
      files: {
        where: {
          isCurrent: true,
          ...(parsed.data.fileRole ? { fileRole: parsed.data.fileRole as never } : {}),
          // Clients cannot download ORIGINAL files
          ...(isClientRole
            ? { fileRole: { in: ["CLIENT_DELIVERY", "WEB_1080", "WEB_720"] as never[] } }
            : {}),
        },
      },
      deliveryItems: isClientRole
        ? { where: { allowDownload: true } }
        : undefined,
    },
  });

  if (!asset) return apiError("Asset not found or access denied", 404);

  const file = asset.files[0];
  if (!file) return apiError("No downloadable file found", 404);

  // Verify client has download permission via delivery package
  if (isClientRole) {
    const hasDeliveryAccess = asset.deliveryItems && asset.deliveryItems.length > 0;
    if (!hasDeliveryAccess) {
      return apiError("Download not permitted for this asset", 403);
    }
  }

  const storage = getStorage();
  const url = await storage.getDownloadUrl(file.objectKey, parsed.data.expiresInSeconds);

  // Log download
  await prisma.downloadLog.create({
    data: {
      userId: user.id,
      orgId: user.organizationId,
      assetId: id,
      assetFileId: file.id,
    },
  });

  return apiResponse({ url, expiresInSeconds: parsed.data.expiresInSeconds, fileRole: file.fileRole });
});
