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

  const [pendingReview, processingFailed, expiryData, todayUploads, pendingDelivery, recentAudit] =
    await Promise.all([
      prisma.asset.count({ where: { reviewStatus: "PENDING", deletedAt: null } }),
      prisma.processingJob.count({ where: { status: "FAILED" } }),
      getExpiryDashboard(),
      prisma.asset.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, deletedAt: null },
      }),
      prisma.deliveryPackage.count({ where: { status: "DRAFT" } }),
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
