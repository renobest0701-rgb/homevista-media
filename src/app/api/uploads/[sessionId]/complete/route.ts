import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  completedFileIds: z.array(z.string().uuid()),
  failedFileIds: z.array(z.string().uuid()).default([]),
});

export const POST = withAuth(async ({ user, req, params }) => {
  const sessionId = params?.sessionId;
  if (!sessionId) return apiError("Missing sessionId", 400);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const batch = await prisma.uploadBatch.findFirst({
    where: { id: sessionId, uploadedBy: user.id },
  });
  if (!batch) return apiError("Upload session not found", 404);

  // Mark completed files for processing
  if (parsed.data.completedFileIds.length > 0) {
    await prisma.assetFile.updateMany({
      where: { id: { in: parsed.data.completedFileIds }, assetId: { in: [] } },
      data: { processingStatus: "PENDING" },
    });

    // Schedule processing jobs for each completed asset
    const completedFiles = await prisma.assetFile.findMany({
      where: { id: { in: parsed.data.completedFileIds } },
      select: { assetId: true },
    });

    const uniqueAssetIds = [...new Set(completedFiles.map((f) => f.assetId))];
    await prisma.processingJob.createMany({
      data: uniqueAssetIds.flatMap((assetId) => [
        { assetId, jobType: "CHECKSUM_VERIFY" },
        { assetId, jobType: "VIDEO_INFO_EXTRACT" },
        { assetId, jobType: "THUMBNAIL_GENERATE" },
        { assetId, jobType: "PREVIEW_GENERATE" },
        { assetId, jobType: "EXIF_EXTRACT" },
        { assetId, jobType: "DUPLICATE_CHECK" },
        { assetId, jobType: "AI_TAG_SUGGEST" },
      ]),
      skipDuplicates: true,
    });
  }

  const updatedBatch = await prisma.uploadBatch.update({
    where: { id: sessionId },
    data: {
      completedFiles: parsed.data.completedFileIds.length,
      failedFiles: parsed.data.failedFileIds.length,
      status:
        parsed.data.failedFileIds.length === 0
          ? "PROCESSING"
          : parsed.data.completedFileIds.length === 0
          ? "FAILED"
          : "PROCESSING",
      completedAt:
        parsed.data.failedFileIds.length === 0 ? new Date() : null,
    },
  });

  return apiResponse(updatedBatch);
});
