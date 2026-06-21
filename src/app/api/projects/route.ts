import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import { generateProjectCode } from "@/lib/utils/asset-code";

const createSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  propertyName: z.string().optional(),
  propertyType: z.string().optional(),
  description: z.string().optional(),
  countryCode: z.string().default("JP"),
  prefectureCode: z.string().optional(),
  municipalityCode: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  defaultVisibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]).default("INTERNAL"),
  defaultUsagePolicyId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const GET = withAuth(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const q = searchParams.get("q");

  // CLIENT_ADMIN / CLIENT_USER: only see projects linked to their org
  const isClientRole =
    user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  const where: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { propertyName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(isClientRole
      ? {
          client: {
            organizationId: user.organizationId,
          },
        }
      : {}),
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiResponse({ data: projects, total, page, limit });
});

export const POST = withAuth(
  async ({ user, req }) => {
    requireRole(user, "PROJECT_MANAGER");

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message, 422);
    }

    const code = generateProjectCode();
    const project = await prisma.project.create({
      data: { ...parsed.data, code },
    });

    return apiResponse(project, 201);
  }
);
