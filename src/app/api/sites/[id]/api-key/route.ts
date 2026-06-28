import { withAuth, apiResponse, apiError } from "@/lib/auth/api-handler";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/client";
import { createHash, randomBytes } from "crypto";

// POST — generate a new API key for the site (old key is invalidated)
export const POST = withAuth(async ({ user, params }) => {
  requireRole(user, "SUPER_ADMIN");

  const { id } = params as { id: string };
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return apiError("Site not found", 404);

  // Generate a random 32-byte key, return it once (never stored in plaintext)
  const rawKey = `hvk_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  await prisma.site.update({
    where: { id },
    data: { apiKeyHash: keyHash },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "Site",
      entityId: id,
      action: "API_KEY_ROTATED",
      afterData: { siteCode: site.code },
    },
  });

  // Return the raw key ONCE — client must save it, it cannot be retrieved again
  return apiResponse({ apiKey: rawKey, warning: "Save this key now. It will not be shown again." }, 201);
});

// DELETE — revoke API key (site becomes public / no key required)
export const DELETE = withAuth(async ({ user, params }) => {
  requireRole(user, "SUPER_ADMIN");

  const { id } = params as { id: string };
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site) return apiError("Site not found", 404);

  await prisma.site.update({ where: { id }, data: { apiKeyHash: null } });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "Site",
      entityId: id,
      action: "API_KEY_REVOKED",
      afterData: { siteCode: site.code },
    },
  });

  return apiResponse({ revoked: true });
});
