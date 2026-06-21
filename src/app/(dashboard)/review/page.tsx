import { requireSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import { ReviewQueue } from "@/components/assets/review-queue";

async function getPendingAssets() {
  return prisma.asset.findMany({
    where: { reviewStatus: "PENDING", deletedAt: null },
    include: {
      files: { where: { isCurrent: true, fileRole: { in: ["THUMBNAIL", "ORIGINAL"] } } },
      shoot: {
        include: {
          project: { select: { id: true, name: true } },
          permissions: {
            select: { status: true, validUntil: true, permissionType: true },
          },
        },
      },
      tags: { where: { status: "SUGGESTED" }, include: { tag: true } },
      usagePolicies: { include: { policy: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
}

export default async function ReviewPage() {
  const session = await requireSession();
  requireRole(session, "ASSET_ADMIN");

  const assets = await getPendingAssets();
  return <ReviewQueue assets={assets} />;
}
