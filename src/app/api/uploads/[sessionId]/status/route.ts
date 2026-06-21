import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { prisma } from "@/lib/db/client";

export const GET = withAuth(async ({ user, params }) => {
  const sessionId = params?.sessionId;
  if (!sessionId) return apiError("Missing sessionId", 400);

  const batch = await prisma.uploadBatch.findFirst({
    where: {
      id: sessionId,
      ...(user.role === "UPLOADER" ? { uploadedBy: user.id } : {}),
    },
    include: {
      assets: {
        select: {
          id: true,
          assetCode: true,
          reviewStatus: true,
          processingJobs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { jobType: true, status: true, progress: true },
          },
        },
      },
    },
  });

  if (!batch) return apiError("Session not found", 404);

  const progress =
    batch.totalFiles > 0
      ? Math.round((batch.completedFiles / batch.totalFiles) * 100)
      : 0;

  return apiResponse({ ...batch, progress });
});
