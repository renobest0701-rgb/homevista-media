import { describe, it, expect } from "vitest";
import { hasRole, canApproveAssets, canManageProjects, canUpload, isAdmin } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";

function makeUser(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "test@test.com", name: "Test", role, organizationId: "org1", supabaseId: "s1" };
}

describe("RBAC - hasRole", () => {
  it("SUPER_ADMIN has all roles", () => {
    const user = makeUser("SUPER_ADMIN");
    expect(hasRole(user, "CLIENT_USER")).toBe(true);
    expect(hasRole(user, "ASSET_ADMIN")).toBe(true);
    expect(hasRole(user, "SUPER_ADMIN")).toBe(true);
  });

  it("CLIENT_USER has only CLIENT_USER", () => {
    const user = makeUser("CLIENT_USER");
    expect(hasRole(user, "CLIENT_USER")).toBe(true);
    expect(hasRole(user, "UPLOADER")).toBe(false);
    expect(hasRole(user, "ASSET_ADMIN")).toBe(false);
  });

  it("UPLOADER cannot approve assets", () => {
    const user = makeUser("UPLOADER");
    expect(canApproveAssets(user)).toBe(false);
  });

  it("ASSET_ADMIN can approve assets", () => {
    const user = makeUser("ASSET_ADMIN");
    expect(canApproveAssets(user)).toBe(true);
  });

  it("PROJECT_MANAGER can manage projects", () => {
    const user = makeUser("PROJECT_MANAGER");
    expect(canManageProjects(user)).toBe(true);
  });

  it("SALES cannot manage projects", () => {
    const user = makeUser("SALES");
    expect(canManageProjects(user)).toBe(false);
  });

  it("UPLOADER can upload", () => {
    const user = makeUser("UPLOADER");
    expect(canUpload(user)).toBe(true);
  });

  it("CLIENT_USER cannot upload", () => {
    const user = makeUser("CLIENT_USER");
    expect(canUpload(user)).toBe(false);
  });
});
