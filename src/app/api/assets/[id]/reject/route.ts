import { z } from "zod";
import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";

const schema = z.object({ reason: z.string().min(1) });

export const POST = withAuth(async ({ user, req, params }) => {
  requireRole(user, "ASSET_ADMIN");
  const id = params?.id;
  if (!id) return apiError("Missing id", 400);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Rejection reason is required", 422);

  const updated = await prisma.asset.update({
    where: { id },
    data: { reviewStatus: "REJECTED", notes: parsed.data.reason },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      organizationId: user.organizationId,
      entityType: "Asset",
      entityId: id,
      action: "REJECT",
      afterData: { reason: parsed.data.reason },
    },
  });

  return apiResponse(updated);
});
