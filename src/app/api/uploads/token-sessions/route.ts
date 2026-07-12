import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";
import { generateAssetCode } from "@/lib/utils/asset-code";
import { inferShootMethodCode } from "@/lib/utils/infer-shoot-method";

// Public upload endpoint — authenticated by shoot uploadToken instead of session
// Used by the /upload/[token] page (external photographers)

const schema = z.object({
  uploadToken: z.string().min(1),
  shootLocationId: z.string().optional(),
  files: z.array(z.object({
    originalFileName: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number(),
    fileRole: z.enum(["ORIGINAL", "SELECTED_ORIGINAL", "EDIT_MASTER"]).default("ORIGINAL"),
  })),
  assetType: z.enum(["VIDEO", "IMAGE", "DRONE_VIDEO", "DRONE_IMAGE", "VIDEO_360", "VR", "CG", "AUDIO", "THUMBNAIL", "DOCUMENT"]).default("IMAGE"),
  peoplePresent: z.boolean().default(false),
  weather: z.enum(["SUNNY", "CLOUDY", "RAINY", "SNOWY", "AFTER_TYPHOON", "NOT_APPLICABLE"]).optional(),
  primaryTimeOfDay: z.enum(["EARLY_MORNING", "MORNING", "MIDDAY", "AFTERNOON", "DUSK", "TWILIGHT", "NIGHT", "NIGHT_VIEW"]).optional(),
  tagIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["video/", "image/", "audio/", "application/pdf"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 422 });

  // Validate token
  const shoot = await prisma.shoot.findFirst({
    where: {
      uploadToken: parsed.data.uploadToken,
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    include: { project: true },
  });
  if (!shoot) return NextResponse.json({ error: "Invalid or expired upload token" }, { status: 401 });

  // Validate files
  for (const file of parsed.data.files) {
    if (file.sizeBytes > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File ${file.originalFileName} exceeds 10GB limit` }, { status: 422 });
    }
    if (!ALLOWED_MIME_PREFIXES.some((p) => file.mimeType.startsWith(p))) {
      return NextResponse.json({ error: `File type not allowed: ${file.mimeType}` }, { status: 422 });
    }
  }

  // Create upload batch (uploadedBy is null for external uploads)
  const batch = await prisma.uploadBatch.create({
    data: {
      shootId: shoot.id,
      shootLocationId: parsed.data.shootLocationId || undefined,
      totalFiles: parsed.data.files.length,
      status: "UPLOADING",
      inheritedMetadata: {
        assetType: parsed.data.assetType,
        peoplePresent: parsed.data.peoplePresent,
        weather: parsed.data.weather,
        primaryTimeOfDay: parsed.data.primaryTimeOfDay,
        notes: parsed.data.notes,
        source: "token_upload",
      },
    },
  });

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
          productionStatus: "ORIGINAL",
          visibility: "INTERNAL",
          peoplePresent: parsed.data.peoplePresent,
          weather: parsed.data.weather,
          primaryTimeOfDay: parsed.data.primaryTimeOfDay,
          notes: parsed.data.notes,
          reviewStatus: "PENDING",
          rightsStatus: "PENDING",
        },
      });

      // Auto-tag shoot method
      const methodCode = inferShootMethodCode(parsed.data.assetType);
      if (methodCode) {
        const methodTag = await prisma.masterTag.findUnique({ where: { code: methodCode } });
        if (methodTag) {
          await prisma.assetTag.upsert({
            where: { assetId_tagId: { assetId: asset.id, tagId: methodTag.id } },
            update: {},
            create: { assetId: asset.id, tagId: methodTag.id, status: "APPROVED", source: "SYSTEM" },
          });
        }
      }

      // User-selected tags
      if (parsed.data.tagIds?.length) {
        await Promise.all(
          parsed.data.tagIds.map((tagId) =>
            prisma.assetTag.upsert({
              where: { assetId_tagId: { assetId: asset.id, tagId } },
              update: {},
              create: { assetId: asset.id, tagId, status: "SUGGESTED", source: "MANUAL" },
            })
          )
        );
      }

      const objectKey = storage.generateObjectKey({
        projectId: shoot.projectId,
        assetId: asset.id,
        fileRole: file.fileRole,
        originalFileName: file.originalFileName,
      });

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

      return { assetId: asset.id, assetCode, assetFileId: assetFile.id, objectKey, uploadUrl, fields };
    })
  );

  return NextResponse.json({ sessionId: batch.id, files: fileUploads }, { status: 201 });
}
