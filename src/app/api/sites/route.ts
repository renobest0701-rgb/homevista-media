import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const createSiteSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric/underscore"),
  domain: z.string().optional(),
  type: z.enum(["AREA_SITE", "PROPERTY_SITE", "CLIENT_SITE", "CORPORATE_SITE", "CAMPAIGN_SITE", "OTHER"]),
  defaultLanguage: z.string().default("ja"),
  countryCode: z.string().optional(),
  prefectureCode: z.string().optional(),
  municipalityCode: z.string().optional(),
  description: z.string().optional(),
  allowedOrigins: z.array(z.string()).default([]),
});

export const GET = withAuth(async ({ user }) => {
  requireRole(user, "PROJECT_MANAGER");

  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      domain: true,
      type: true,
      status: true,
      defaultLanguage: true,
      countryCode: true,
      prefectureCode: true,
      municipalityCode: true,
      description: true,
      createdAt: true,
      _count: { select: { publications: { where: { publicationStatus: "PUBLISHED" } } } },
    },
  });

  return apiResponse(sites);
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "ASSET_ADMIN");

  const body = await req.json();
  const parsed = createSiteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const existing = await prisma.site.findUnique({ where: { code: parsed.data.code } });
  if (existing) return apiError("Site code already exists", 409);

  const site = await prisma.site.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "Site",
      entityId: site.id,
      action: "CREATE",
      afterData: { name: site.name, code: site.code, type: site.type },
    },
  });

  return apiResponse(site, 201);
});
