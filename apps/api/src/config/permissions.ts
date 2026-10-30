export const ROLES = ["super_admin", "administrator", "branch_manager", "staff", "content_manager"] as const;
export type Role = (typeof ROLES)[number];
export type Permission =
  | "branches:read" | "branches:write" | "inquiries:read" | "inquiries:write"
  | "content:write" | "users:manage" | "audit:read";
const all: Permission[] = ["branches:read","branches:write","inquiries:read","inquiries:write","content:write","users:manage","audit:read"];
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: all,
  administrator: all.filter((p) => p !== "users:manage"),
  branch_manager: ["branches:read", "inquiries:read", "inquiries:write"],
  staff: ["inquiries:read", "inquiries:write"],
  content_manager: ["branches:read", "content:write"],
};
export const GLOBAL_ROLES: Role[] = ["super_admin", "administrator"];
