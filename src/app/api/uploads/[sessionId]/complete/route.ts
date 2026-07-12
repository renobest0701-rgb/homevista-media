import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  completedFileIds: z.array(z.string()),
  failedFileIds: z.array(z.string()).default([]),
  // For token-based uploads (external photographers)
  uploadToken: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 422 });

  // Determine auth context: session user or upload token
  let batchWhere: Record<string, unknown> = { id: sessionId };

  if (parsed.data.uploadToken) {
    // Token-based: verify the batch belongs to the shoot with this token
    const shoot = await prisma.shoot.findFirst({
      where: { uploadToken: parsed.data.uploadToken },
      select: { id: true },
    });
    if (!shoot) return NextResponse.json({ error: "Invalid upload token" }, { status: 401 });
    batchWhere = { id: sessionId, shootId: shoot.id, uploadedBy: null };
  } else {
    // Session-based: verify the batch belongs to this user
    const session = await getSession().catch(() => null);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    batchWhere = { id: sessionId, uploadedBy: session.id };
  }

  const batch = await prisma.uploadBatch.findFirst({ where: batchWhere });
  if (!batch) return NextResponse.json({ error: "Upload session not found" }, { status: 404 });

  // Schedule processing jobs for completed files
  if (parsed.data.completedFileIds.length > 0) {
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
      completedAt: parsed.data.failedFileIds.length === 0 ? new Date() : null,
    },
  });

  return NextResponse.json(updatedBatch);
}
