import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  shootDate: z.string().datetime(),
  teamOrgId: z.string().uuid().optional(),
  managerUserId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ user, req }) => {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));

  const isUploader = user.role === "UPLOADER";
  const isClientRole = user.role === "CLIENT_ADMIN" || user.role === "CLIENT_USER";

  const where: Record<string, unknown> = {
    ...(projectId ? { projectId } : {}),
    ...(status ? { status } : {}),
    // UPLOADER: only shoots assigned to their org
    ...(isUploader ? { teamOrgId: user.organizationId } : {}),
    // CLIENT: only shoots in their projects
    ...(isClientRole
      ? { project: { client: { organizationId: user.organizationId } } }
      : {}),
  };

  const [total, shoots] = await Promise.all([
    prisma.shoot.count({ where }),
    prisma.shoot.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, code: true } },
        teamOrg: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        _count: { select: { assets: true, uploadBatches: true } },
      },
      orderBy: { shootDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiResponse({ data: shoots, total, page, limit });
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "PROJECT_MANAGER");

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const shoot = await prisma.shoot.create({ data: parsed.data });
  return apiResponse(shoot, 201);
});
