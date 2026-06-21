import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import { generateAssetCode } from "@/lib/utils/asset-code";
import { inferShootMethodCode } from "@/lib/utils/infer-shoot-method";

const createSessionSchema = z.object({
  shootId: z.string().uuid(),
  shootLocationId: z.string().uuid().optional(),
  files: z.array(
    z.object({
      originalFileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      fileRole: z
        .enum(["ORIGINAL", "SELECTED_ORIGINAL", "EDIT_MASTER"])
        .default("ORIGINAL"),
    })
  ),
  // Shared metadata applied to all files in this batch
  assetType: z.enum(["VIDEO", "IMAGE", "DRONE_VIDEO", "DRONE_IMAGE", "VIDEO_360", "VR", "CG", "AUDIO", "THUMBNAIL", "DOCUMENT"]).default("VIDEO"),
  productionStatus: z.enum(["ORIGINAL", "SELECTED_ORIGINAL", "EDITED"]).default("ORIGINAL"),
  visibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]).default("INTERNAL"),
  peoplePresent: z.boolean().default(false),
  notes: z.string().optional(),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const ALLOWED_MIME_PREFIXES = ["video/", "image/", "audio/", "application/pdf"];

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "UPLOADER");

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  // Verify shoot access
  const shoot = await prisma.shoot.findFirst({
    where: {
      id: parsed.data.shootId,
      ...(user.role === "UPLOADER" ? { teamOrgId: user.organizationId } : {}),
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    include: { project: true },
  });

  if (!shoot) return apiError("Shoot not found or not accessible", 404);

  // Validate files
  for (const file of parsed.data.files) {
    if (file.sizeBytes > MAX_FILE_SIZE) {
      return apiError(`File ${file.originalFileName} exceeds 10GB limit`, 422);
    }
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => file.mimeType.startsWith(p));
    if (!allowed) {
      return apiError(`File type not allowed: ${file.mimeType}`, 422);
    }
  }

  // Create upload batch
  const batch = await prisma.uploadBatch.create({
    data: {
      shootId: parsed.data.shootId,
      shootLocationId: parsed.data.shootLocationId,
      uploadedBy: user.id,
      totalFiles: parsed.data.files.length,
      status: "UPLOADING",
      inheritedMetadata: {
        assetType: parsed.data.assetType,
        productionStatus: parsed.data.productionStatus,
        visibility: parsed.data.visibility,
        peoplePresent: parsed.data.peoplePresent,
        notes: parsed.data.notes,
      },
    },
  });

  // Create assets + get upload URLs for each file
  const storage = getStorage();
  const fileUploads = await Promise.all(
    parsed.data.files.map(async (file) => {
      const assetCode = generateAssetCode();
      const asset = await prisma.asset.create({
        data: {
          assetCode,
          uploadBatchId: batch.id,
          shootId: shoot.id,
          projectId: shoot.projectId,
          clientId: shoot.project.clientId,
          assetType: parsed.data.assetType,
          productionStatus: parsed.data.productionStatus,
          visibility: parsed.data.visibility,
          peoplePresent: parsed.data.peoplePresent,
          notes: parsed.data.notes,
          reviewStatus: "PENDING",
          rightsStatus: "PENDING",
        },
      });

      const objectKey = storage.generateObjectKey({
        projectId: shoot.projectId,
        assetId: asset.id,
        fileRole: file.fileRole,
        originalFileName: file.originalFileName,
      });

      // Auto-tag shoot method based on asset type
      const methodCode = inferShootMethodCode(parsed.data.assetType);
      if (methodCode) {
        const methodTag = await prisma.masterTag.findUnique({ where: { code: methodCode } });
        if (methodTag) {
          await prisma.assetTag.create({
            data: { assetId: asset.id, tagId: methodTag.id, status: "APPROVED", source: "SYSTEM" },
          });
        }
      }

      const assetFile = await prisma.assetFile.create({
        data: {
          assetId: asset.id,
          fileRole: file.fileRole as never,
          objectKey,
          originalFileName: file.originalFileName,
          mimeType: file.mimeType,
          sizeBytes: BigInt(file.sizeBytes),
          processingStatus: "PENDING",
        },
      });

      const { uploadUrl, fields } = await storage.getUploadUrl(objectKey, {
        contentType: file.mimeType,
        maxSizeBytes: file.sizeBytes,
        expiresInSeconds: 7200,
      });

      return {
        assetId: asset.id,
        assetCode,
        assetFileId: assetFile.id,
        objectKey,
        uploadUrl,
        fields,
      };
    })
  );

  return apiResponse({ sessionId: batch.id, files: fileUploads }, 201);
});
