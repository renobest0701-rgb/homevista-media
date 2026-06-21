import { withAuth, apiResponse } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

export const GET = withAuth(async ({ user }) => {
  requireRole(user, "CLIENT_USER");

  const projects = await prisma.project.findMany({
    where: {
      client: { organizationId: user.organizationId },
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    include: {
      client: { select: { id: true, name: true, logoUrl: true } },
      _count: {
        select: {
          assets: { where: { reviewStatus: "APPROVED", deletedAt: null } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiResponse(projects);
});
