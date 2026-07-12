import { withAuth, apiError } from "@/lib/auth/api-handler";
import { prisma } from "@/lib/db/client";
import { getStorage } from "@/lib/storage";

export const GET = withAuth(async ({ params }) => {
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const asset = await prisma.asset.findFirst({
    where: { id, deletedAt: null },
    include: {
      files: {
        where: {
          fileRole: { in: ["THUMBNAIL", "ORIGINAL", "SELECTED_ORIGINAL"] as never[] },
          isCurrent: true,
        },
        orderBy: [
          // THUMBNAIL first, then ORIGINAL
          { fileRole: "asc" },
        ],
        take: 1,
        select: { objectKey: true },
      },
    },
  });

  if (!asset) return apiError("Not found", 404);
  const file = asset.files[0];
  if (!file) return new Response(null, { status: 204 });

  const storage = getStorage();
  const url = await storage.getDownloadUrl(file.objectKey, 600);

  return Response.redirect(url, 302);
});
