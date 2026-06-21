import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const createSchema = z.object({
  shootId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  permissionType: z.enum(["FILMING", "AERIAL", "INTERIOR", "PUBLIC_SPACE", "PRIVATE_PROPERTY", "OTHER"]).default("FILMING"),
  status: z.enum(["PENDING", "OBTAINED", "RENEWAL_REQUIRED", "EXPIRED", "NOT_REQUIRED", "REJECTED"]).default("PENDING"),
  permissionGrantedDate: z.string().datetime().optional(),
  permittedShootDateFrom: z.string().datetime().optional(),
  permittedShootDateTo: z.string().datetime().optional(),
  permittedTimeFrom: z.string().optional(),
  permittedTimeTo: z.string().optional(),
  authorityOrganization: z.string().optional(),
  contactDepartment: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  permissionNumber: z.string().optional(),
  permissionConditions: z.string().optional(),
  permittedMedia: z.array(z.string()).default([]),
  organicSocialAllowed: z.boolean().default(false),
  paidAdvertisingAllowed: z.boolean().default(false),
  secondaryUseAllowed: z.boolean().default(false),
  overseasUseAllowed: z.boolean().default(false),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  renewalDueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ user, req }) => {
  requireRole(user, "PROJECT_MANAGER");
  const { searchParams } = new URL(req.url);
  const shootId = searchParams.get("shootId");
  const expiringDays = searchParams.get("expiringDays");

  const now = new Date();
  const expiryFilter = expiringDays
    ? {
        validUntil: {
          lte: new Date(now.getTime() + Number(expiringDays) * 24 * 3600 * 1000),
          gte: now,
        },
      }
    : {};

  const permissions = await prisma.permissionRecord.findMany({
    where: {
      ...(shootId ? { shootId } : {}),
      ...expiryFilter,
    },
    include: {
      shoot: { select: { id: true, name: true, shootDate: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { validUntil: "asc" },
  });

  // Mask sensitive contact info for non-admin roles
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ASSET_ADMIN" || user.role === "PROJECT_MANAGER";
  const result = isAdmin
    ? permissions
    : permissions.map(({ contactPerson, contactPhone, contactEmail, ...p }) => p);

  return apiResponse(result);
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "PROJECT_MANAGER");
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const permission = await prisma.permissionRecord.create({
    data: { ...parsed.data, createdBy: user.id },
  });
  return apiResponse(permission, 201);
});
