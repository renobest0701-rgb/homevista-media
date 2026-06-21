import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  shootDate: z.string().datetime().optional(),
  teamOrgId: z.string().uuid().optional(),
  managerUserId: z.string().uuid().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ user, params }) => {
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const isUploader = user.role === "UPLOADER";
  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  const shoot = await prisma.shoot.findFirst({
    where: {
      id,
      ...(isUploader ? { teamOrgId: user.organizationId } : {}),
      ...(isClientRole
        ? { project: { client: { organizationId: user.organizationId } } }
        : {}),
    },
    include: {
      project: { include: { client: true } },
      teamOrg: true,
      manager: { select: { id: true, name: true, email: true } },
      locations: { include: { location: true } },
      permissions: {
        select: {
          id: true, permissionType: true, status: true,
          validFrom: true, validUntil: true,
          authorityOrganization: true,
          // Hide sensitive contact info from uploaders / clients
          ...(isUploader || isClientRole
            ? {}
            : {
                contactPerson: true,
                contactPhone: true,
                contactEmail: true,
              }),
        },
      },
      _count: { select: { assets: true } },
    },
  });

  if (!shoot) return apiError("Shoot not found", 404);
  return apiResponse(shoot);
});

export const PATCH = withAuth(async ({ user, req, params }) => {
  requireRole(user, "PROJECT_MANAGER");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const shoot = await prisma.shoot.update({ where: { id }, data: parsed.data });
  return apiResponse(shoot);
});
