import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const createSchema = z.object({
  category: z.string().min(1),
  code: z.string().min(1).max(100),
  labelJa: z.string().min(1),
  labelZhCn: z.string().optional(),
  labelEn: z.string().optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().default(0),
});

export const GET = withAuth(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const tags = await prisma.masterTag.findMany({
    where: {
      status: "ACTIVE",
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { labelJa: { contains: q, mode: "insensitive" } },
              { labelEn: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { labelJa: "asc" }],
    include: { children: { where: { status: "ACTIVE" } } },
  });

  return apiResponse(tags);
});

export const POST = withAuth(async ({ user, req }) => {
  requireRole(user, "ASSET_ADMIN");
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 422);

  const existing = await prisma.masterTag.findUnique({ where: { code: parsed.data.code } });
  if (existing) return apiError("Tag code already exists", 409);

  const tag = await prisma.masterTag.create({ data: parsed.data });
  return apiResponse(tag, 201);
});
