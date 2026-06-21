import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { processAssetJob } from "@/lib/jobs/process-asset";
import type { JobType } from "@prisma/client";

const schema = z.object({
  assetId: z.string().uuid(),
  jobType: z.enum([
    "VIDEO_INFO_EXTRACT",
    "THUMBNAIL_GENERATE",
    "PREVIEW_GENERATE",
    "CHECKSUM_VERIFY",
    "DUPLICATE_CHECK",
    "AI_TAG_SUGGEST",
    "EXIF_EXTRACT",
  ]),
});

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 422 });
  }

  await processAssetJob(parsed.data.assetId, parsed.data.jobType as JobType);
  return NextResponse.json({ success: true });
}

// Process pending jobs (poll-based for development)
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const pendingJobs = await prisma.processingJob.findMany({
    where: { status: "PENDING", retryCount: { lt: 3 } },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  const results = [];
  for (const job of pendingJobs) {
    try {
      await processAssetJob(job.assetId, job.jobType);
      results.push({ jobId: job.id, status: "completed" });
    } catch (err) {
      results.push({ jobId: job.id, status: "failed", error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
