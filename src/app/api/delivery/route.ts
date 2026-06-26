import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/rbac";

export const GET = withAuth(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = {
    ...(status ? { status } : {}),
    ...(projectId ? { projectId } : {}),
  };

  const [total, packages] = await Promise.all([
    prisma.deliveryPackage.count({ where }),
    prisma.deliveryPackage.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, propertyName: true, code: true } },
        client: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return apiResponse({ data: packages, total, page, limit });
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
  assetIds: z.array(z.string().uuid()).optional(),
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "PROJECT_MANAGER");
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const { assetIds, ...rest } = parsed.data;

  const pkg = await prisma.deliveryPackage.create({
    data: {
      ...rest,
      createdBy: user.id,
      expiresAt: rest.expiresAt ? new Date(rest.expiresAt) : undefined,
      ...(assetIds && assetIds.length > 0
        ? {
            items: {
              create: assetIds.map((assetId, i) => ({
                assetId,
                allowPreview: true,
                allowDownload: false,
                displayOrder: i,
              })),
            },
          }
        : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return apiResponse(pkg, 201);
});
