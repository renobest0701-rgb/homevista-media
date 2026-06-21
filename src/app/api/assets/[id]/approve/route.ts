import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

export const POST = withAuth(async ({ user, params }) => {
  requireRole(user, "ASSET_ADMIN");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const asset = await prisma.asset.findFirst({
    where: { id, deletedAt: null },
    include: { shoot: { include: { permissions: true } }, usagePolicies: true },
  });

  if (!asset) return apiError("Asset not found", 404);

  // Check permissions are valid
  const hasValidPermission = asset.shoot?.permissions.some(
    (p) => p.status === "OBTAINED" || p.status === "NOT_REQUIRED"
  ) ?? true;

  if (!hasValidPermission) {
    return apiError("Cannot approve: no valid permission record for this shoot", 422);
  }

  const updated = await prisma.asset.update({
    where: { id },
    data: { reviewStatus: "APPROVED", rightsStatus: "VALID" },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      entityType: "Asset",
      entityId: id,
      action: "APPROVE",
    },
  });

  return apiResponse(updated);
});
