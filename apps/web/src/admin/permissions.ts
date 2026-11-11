export type Role = "super_admin" | "administrator" | "branch_manager" | "staff" | "content_manager";

export const ROLE_INFO: Record<Role, { label: string; blurb: string; access: string[] }> = {
  super_admin: { label: "Super admin", blurb: "Full system access across all branches.", access: ["Manage branches", "Manage inquiries", "Manage site content", "Manage user accounts", "View activity log", "Access all branches"] },
  administrator: { label: "Administrator", blurb: "Manage operations and content across all branches.", access: ["Manage branches", "Manage inquiries", "Manage site content", "View activity log", "Access all branches", "Cannot manage user accounts"] },
  branch_manager: { label: "Branch manager", blurb: "Handle inquiries and view assigned branches.", access: ["View assigned branches", "Read and update inquiries for assigned branches"] },
  staff: { label: "Staff", blurb: "Handle inquiries for assigned branches.", access: ["Read and update inquiries for assigned branches"] },
  content_manager: { label: "Content manager", blurb: "Manage site content and view assigned branches.", access: ["Manage and publish site content", "View assigned branches"] },
};

const MATRIX = {
  "branches.view": ["super_admin", "administrator", "branch_manager", "content_manager"],
  "branches.edit": ["super_admin", "administrator"],
  "inquiries.view": ["super_admin", "administrator", "branch_manager", "staff"],
  "inquiries.update": ["super_admin", "administrator", "branch_manager", "staff"],
  "inquiries.export": ["super_admin", "administrator"],
  "content.edit": ["super_admin", "administrator", "content_manager"],
  "content.publish": ["super_admin", "administrator", "content_manager"],
  "users.manage": ["super_admin"],
  "audit.view": ["super_admin", "administrator"],
} as const;

export type Perm = keyof typeof MATRIX;
export const can = (role: string | undefined, perm: Perm) =>
  !!role && (MATRIX[perm] as readonly string[]).includes(role);