import { prisma } from "@/lib/db/client";
import { getVideoProcessor } from "@/lib/video";
import type { JobType } from "@prisma/client";

export async function processAssetJob(assetId: string, jobType: JobType) {
  // Mark job as processing
  await prisma.processingJob.updateMany({
    where: { assetId, jobType, status: "PENDING" },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    await runJob(assetId, jobType);

    await prisma.processingJob.updateMany({
      where: { assetId, jobType, status: "PROCESSING" },
      data: { status: "COMPLETED", completedAt: new Date(), progress: 100 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.processingJob.updateMany({
      where: { assetId, jobType, status: "PROCESSING" },
      data: {
        status: "FAILED",
        errorMessage: message,
        retryCount: { increment: 1 },
      },
    });
    throw err;
  }
}

async function runJob(assetId: string, jobType: JobType) {
  const processor = getVideoProcessor();

  const assetFile = await prisma.assetFile.findFirst({
    where: { assetId, fileRole: "ORIGINAL", isCurrent: true },
  });

  if (!assetFile) throw new Error("No original file found");

  switch (jobType) {
    case "VIDEO_INFO_EXTRACT": {
      if (!assetFile.mimeType?.startsWith("video/")) return;

      const meta = await processor.extractVideoMetadata(assetFile.objectKey);
      await prisma.assetFile.update({
        where: { id: assetFile.id },
        data: {
          width: meta.width,
          height: meta.height,
          durationSeconds: meta.durationSeconds,
          frameRate: meta.frameRate,
          hasAudio: meta.hasAudio,
          processingStatus: "COMPLETED",
        },
      });
      break;
    }

    case "EXIF_EXTRACT": {
      if (!assetFile.mimeType?.startsWith("image/")) return;
      const meta = await processor.extractImageMetadata(assetFile.objectKey);
      await prisma.assetFile.update({
        where: { id: assetFile.id },
        data: {
          width: meta.width,
          height: meta.height,
          processingStatus: "COMPLETED",
        },
      });
      break;
    }

    case "THUMBNAIL_GENERATE": {
      const thumbnailKey = assetFile.objectKey.replace(/\.[^.]+$/, "_thumb.jpg");
      await processor.generateThumbnail(assetFile.objectKey, thumbnailKey);

      await prisma.assetFile.create({
        data: {
          assetId,
          fileRole: "THUMBNAIL",
          objectKey: thumbnailKey,
          mimeType: "image/jpeg",
          processingStatus: "COMPLETED",
        },
      });
      break;
    }

    case "PREVIEW_GENERATE": {
      if (!assetFile.mimeType?.startsWith("video/")) return;
      const previewKey = assetFile.objectKey.replace(/\.[^.]+$/, "_preview.mp4");
      await processor.generatePreview(assetFile.objectKey, previewKey, {
        maxDurationSeconds: 30,
        maxSizeBytes: 50 * 1024 * 1024,
      });

      await prisma.assetFile.create({
        data: {
          assetId,
          fileRole: "PREVIEW",
          objectKey: previewKey,
          mimeType: "video/mp4",
          processingStatus: "COMPLETED",
        },
      });
      break;
    }

    case "CHECKSUM_VERIFY": {
      const checksum = await processor.calculateChecksum(assetFile.objectKey);
      await prisma.assetFile.update({
        where: { id: assetFile.id },
        data: { checksum },
      });
      break;
    }

    case "DUPLICATE_CHECK": {
      const file = await prisma.assetFile.findUnique({ where: { id: assetFile.id } });
      if (!file?.checksum) return;

      const duplicate = await prisma.assetFile.findFirst({
        where: {
          checksum: file.checksum,
          id: { not: assetFile.id },
        },
      });

      if (duplicate) {
        await prisma.asset.update({
          where: { id: assetId },
          data: { notes: `[重複候補] AssetFile ${duplicate.id} と同一チェックサム` },
        });
      }
      break;
    }

    case "AI_TAG_SUGGEST": {
      // Placeholder — integrate AI service in Phase 3
      console.log(`[AI_TAG_SUGGEST] Skipped (Phase 3) for asset ${assetId}`);
      break;
    }
  }
}
