import { prisma } from "@/lib/db/client";

/**
 * Daily batch: check permission records and asset rights expiry.
 * Called from /api/jobs/rights-check (cron or manual trigger).
 */
export async function checkRightsExpiry() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  // 1. Mark expired permissions
  const expired = await prisma.permissionRecord.updateMany({
    where: {
      status: { in: ["OBTAINED", "RENEWAL_REQUIRED"] },
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // 2. Mark soon-to-expire permissions
  await prisma.permissionRecord.updateMany({
    where: {
      status: "OBTAINED",
      validUntil: { gte: now, lte: in30Days },
    },
    data: { status: "RENEWAL_REQUIRED" },
  });

  // 3. Find assets whose shoot has expired permissions — mark rights as expired
  const affectedShoots = await prisma.shoot.findMany({
    where: {
      permissions: {
        some: { status: "EXPIRED" },
      },
    },
    select: { id: true },
  });

  if (affectedShoots.length > 0) {
    const shootIds = affectedShoots.map((s) => s.id);
    const unpublished = await prisma.asset.updateMany({
      where: {
        shootId: { in: shootIds },
        rightsStatus: "VALID",
      },
      data: { rightsStatus: "EXPIRED" },
    });

    // Unpublish from HOMEVISTA-managed sites
    await prisma.assetPublication.updateMany({
      where: {
        asset: { shootId: { in: shootIds } },
        publicationStatus: "PUBLISHED",
        site: { type: { in: ["AREA_SITE", "PROPERTY_SITE"] } },
      },
      data: { publicationStatus: "UNPUBLISHED", unpublishedAt: now },
    });

    // Audit
    for (const shoot of affectedShoots) {
      await prisma.auditLog.create({
        data: {
          entityType: "Shoot",
          entityId: shoot.id,
          action: "RIGHTS_EXPIRED_AUTO_UNPUBLISH",
          afterData: { shootId: shoot.id, timestamp: now },
        },
      });
    }

    return {
      expiredPermissions: expired.count,
      affectedAssets: unpublished.count,
      affectedShoots: affectedShoots.length,
    };
  }

  return { expiredPermissions: expired.count, affectedAssets: 0, affectedShoots: 0 };
}

export async function getExpiryDashboard() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in14 = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const [expired7, expired14, expired30, alreadyExpired] = await Promise.all([
    prisma.permissionRecord.count({ where: { validUntil: { gte: now, lte: in7 } } }),
    prisma.permissionRecord.count({ where: { validUntil: { gte: in7, lte: in14 } } }),
    prisma.permissionRecord.count({ where: { validUntil: { gte: in14, lte: in30 } } }),
    prisma.permissionRecord.count({ where: { validUntil: { lt: now }, status: "EXPIRED" } }),
  ]);

  return {
    expiringIn7Days: expired7,
    expiringIn14Days: expired14,
    expiringIn30Days: expired30,
    alreadyExpired,
  };
}
