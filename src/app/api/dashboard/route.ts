import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/auth/api-handler";
import { getExpiryDashboard } from "@/lib/jobs/rights-expiry";
import { MemberRole } from "@prisma/client";

export const GET = withAuth(async () => {
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

  return NextResponse.json({ pendingReview, processingFailed, expiryData, todayUploads, pendingDelivery, recentAudit });
}, { minimumRole: MemberRole.CLIENT_USER });
