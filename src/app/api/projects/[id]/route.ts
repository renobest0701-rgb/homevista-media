import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  propertyName: z.string().optional(),
  propertyType: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED", "CANCELLED"]).optional(),
  prefectureCode: z.string().optional(),
  municipalityCode: z.string().optional(),
  address: z.string().optional(),
  defaultVisibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]).optional(),
  defaultUsagePolicyId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const GET = withAuth(async ({ user, params }) => {
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  const project = await prisma.project.findFirst({
    where: {
      id,
      ...(isClientRole
        ? { client: { organizationId: user.organizationId } }
        : {}),
    },
    include: {
      client: true,
      defaultPolicy: true,
      shoots: { orderBy: { shootDate: "desc" } },
      _count: { select: { assets: true } },
    },
  });

  if (!project) return apiError("Project not found", 404);
  return apiResponse(project);
});

export const PATCH = withAuth(async ({ user, req, params }) => {
  requireRole(user, "PROJECT_MANAGER");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const project = await prisma.project.update({
    where: { id },
    data: parsed.data,
  });
  return apiResponse(project);
});
