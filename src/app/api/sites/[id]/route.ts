import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional().nullable(),
  type: z.enum(["AREA_SITE", "PROPERTY_SITE", "CLIENT_SITE", "CORPORATE_SITE", "CAMPAIGN_SITE", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  defaultLanguage: z.string().optional(),
  countryCode: z.string().optional().nullable(),
  prefectureCode: z.string().optional().nullable(),
  municipalityCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  allowedOrigins: z.array(z.string()).optional(),
});

export const PATCH = withAuth(async ({ user, req, params }) => {
  requireRole(user, "ASSET_ADMIN");

  const { id } = params as { id: string };
  const body = await req.json();
  const parsed = updateSiteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const existing = await prisma.site.findUnique({ where: { id } });
  if (!existing) return apiError("Site not found", 404);

  const site = await prisma.site.update({
    where: { id },
    data: { ...parsed.data, updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "Site",
      entityId: site.id,
      action: "UPDATE",
      beforeData: { name: existing.name, status: existing.status },
      afterData: { name: site.name, status: site.status },
    },
  });

  return apiResponse(site);
});

export const DELETE = withAuth(async ({ user, params }) => {
  requireRole(user, "SUPER_ADMIN");

  const { id } = params as { id: string };
  const existing = await prisma.site.findUnique({ where: { id }, include: { _count: { select: { publications: true } } } });
  if (!existing) return apiError("Site not found", 404);
  if (existing._count.publications > 0) return apiError("Cannot delete site with active publications", 409);

  await prisma.site.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "Site",
      entityId: id,
      action: "DELETE",
      beforeData: { name: existing.name, code: existing.code },
    },
  });

  return apiResponse({ deleted: true });
});
