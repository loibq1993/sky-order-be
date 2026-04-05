/** Quản trị trong tenant (không tính super_admin ở public schema). */
export const TENANT_ADMIN_ROLES = [
  'super_admin',
  'restaurant_owner',
  'restaurant_manager',
] as const;

/**
 * Nhân viên (theo bộ phận). `restaurant_staff` giữ tương thích ngược (toàn quyền vận hành như trước).
 */
export const TENANT_STAFF_ROLES = [
  'restaurant_staff',
  'staff_reception',
  'staff_kitchen',
  'staff_waiter',
] as const;

export type TenantStaffRole = (typeof TENANT_STAFF_ROLES)[number];

export function isTenantStaffRole(role: string | undefined): boolean {
  if (!role) return false;
  return (TENANT_STAFF_ROLES as readonly string[]).includes(role);
}

export function isTenantAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  return (TENANT_ADMIN_ROLES as readonly string[]).includes(role);
}
