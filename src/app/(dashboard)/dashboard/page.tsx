import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getExpiryDashboard } from "@/lib/jobs/rights-expiry";
import { DashboardClient } from "./client";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const isClientRole = session!.role === "CLIENT_ADMIN" || session!.role === "CLIENT_USER";
  const orgId = session!.organizationId;

  // CLIENT roles see only their org's data; staff roles see global stats
  const assetWhere = isClientRole
    ? { reviewStatus: "PENDING" as const, deletedAt: null, shoot: { project: { client: { organizationId: orgId } } } }
    : { reviewStatus: "PENDING" as const, deletedAt: null };
  const todayAssetWhere = isClientRole
    ? { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null, shoot: { project: { client: { organizationId: orgId } } } }
    : { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null };
  const deliveryWhere = isClientRole
    ? { status: "DRAFT" as const, clientId: orgId }
    : { status: "DRAFT" as const };

  const [pendingReview, processingFailed, expiryData, todayUploads, pendingDelivery, recentAudit] =
    await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.processingJob.count({ where: { status: "FAILED" } }),
      getExpiryDashboard(),
      prisma.asset.count({ where: todayAssetWhere }),
      prisma.deliveryPackage.count({ where: deliveryWhere }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
    ]);

  return (
    <DashboardClient
      data={{ pendingReview, processingFailed, expiryData, todayUploads, pendingDelivery, recentAudit }}
    />
  );
}
