import type { MemberRole } from "@prisma/client";
import type { SessionUser } from "./session";

// Role hierarchy (higher index = more permissions)
const ROLE_RANK: Record<MemberRole, number> = {
  CLIENT_USER: 1,
  CLIENT_ADMIN: 2,
  UPLOADER: 3,
  SALES: 4,
  PROJECT_MANAGER: 5,
  ASSET_ADMIN: 6,
  SUPER_ADMIN: 7,
};

export function hasRole(user: SessionUser, minimumRole: MemberRole): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimumRole];
}

export function isInternal(user: SessionUser): boolean {
  return hasRole(user, "UPLOADER");
}

export function isAdmin(user: SessionUser): boolean {
  return hasRole(user, "ASSET_ADMIN");
}

export function isSuperAdmin(user: SessionUser): boolean {
  return user.role === "SUPER_ADMIN";
}

export function canApproveAssets(user: SessionUser): boolean {
  return hasRole(user, "ASSET_ADMIN");
}

export function canManageProjects(user: SessionUser): boolean {
  return hasRole(user, "PROJECT_MANAGER");
}

export function canUpload(user: SessionUser): boolean {
  return hasRole(user, "UPLOADER");
}

export function canViewClientAssets(
  user: SessionUser,
  clientId: string | null
): boolean {
  if (isInternal(user)) return true;
  // CLIENT_ADMIN / CLIENT_USER: their org must match the client's org
  // This is checked at the query level via organizationId
  return clientId !== null;
}

// Throw if role requirement not met
export function requireRole(user: SessionUser, minimumRole: MemberRole): void {
  if (!hasRole(user, minimumRole)) {
    throw new Error("FORBIDDEN");
  }
}
