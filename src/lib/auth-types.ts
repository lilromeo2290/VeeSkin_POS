// Client-safe auth types and constants.
// This file must NOT import from 'next/headers', 'next/headers', or @/lib/db.
// Server-only utilities live in src/lib/auth.ts.

export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  /**
   * Per-user permission overrides. Keys that are present override the role default.
   * Absent keys fall back to the role's default from PERMISSIONS.
   * Example: { viewDashboard: true, productDelete: false }
   */
  permissions: Partial<Record<string, boolean>>
}

export interface AuthSession extends SessionUser {
  iat: number
  exp: number
}

// ─── Role Hierarchy ──────────────────────────────────────────────────────────
export const ROLE_LEVEL: Record<Role, number> = {
  CASHIER: 1,
  MANAGER: 2,
  ADMIN: 3,
}

/**
 * Permission Matrix — role defaults. The admin can override any of these per user.
 * Single source of truth for RBAC defaults. Shared between server and client.
 */
export const PERMISSIONS = {
  // Views
  viewDashboard: ['ADMIN', 'MANAGER'] as Role[],
  viewPOS: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  viewProducts: ['ADMIN', 'MANAGER'] as Role[],
  viewOrders: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  viewInventory: ['ADMIN', 'MANAGER'] as Role[],
  viewUsers: ['ADMIN'] as Role[],
  viewSettings: ['ADMIN'] as Role[],
  viewReports: ['ADMIN', 'MANAGER'] as Role[],

  // Product operations
  productRead: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  productCreate: ['ADMIN', 'MANAGER'] as Role[],
  productUpdate: ['ADMIN', 'MANAGER'] as Role[],
  productDelete: ['ADMIN'] as Role[],

  // Order operations
  orderCreate: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  orderViewAll: ['ADMIN', 'MANAGER'] as Role[],
  orderRefund: ['ADMIN', 'MANAGER'] as Role[],

  // Inventory
  inventoryAdjust: ['ADMIN', 'MANAGER'] as Role[],

  // User management
  userCreate: ['ADMIN'] as Role[],
  userUpdate: ['ADMIN'] as Role[],
  userDelete: ['ADMIN'] as Role[],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Catalog of all permissions with human-readable labels, descriptions, and groupings.
 * Used by the admin UI to render the per-user permission editor.
 */
export interface PermissionMeta {
  key: Permission
  label: string
  description: string
  group: 'Views' | 'Products' | 'Orders' | 'Inventory' | 'User Management'
}

export const PERMISSION_CATALOG: PermissionMeta[] = [
  // Views
  { key: 'viewDashboard', label: 'Dashboard', description: 'View sales analytics & KPIs', group: 'Views' },
  { key: 'viewPOS', label: 'POS Terminal', description: 'Process new sales', group: 'Views' },
  { key: 'viewProducts', label: 'Products', description: 'View product catalog management', group: 'Views' },
  { key: 'viewOrders', label: 'Orders', description: 'View order history', group: 'Views' },
  { key: 'viewInventory', label: 'Inventory', description: 'View inventory management', group: 'Views' },
  { key: 'viewUsers', label: 'User Management', description: 'View & manage staff accounts', group: 'Views' },
  { key: 'viewSettings', label: 'Settings', description: 'Edit business information & tax rates', group: 'Views' },
  { key: 'viewReports', label: 'Reports & Analytics', description: 'View sales reports, profit/loss, bestsellers', group: 'Views' },
  // Products
  { key: 'productRead', label: 'Read Products', description: 'Load product list (required for POS)', group: 'Products' },
  { key: 'productCreate', label: 'Create Products', description: 'Add new products', group: 'Products' },
  { key: 'productUpdate', label: 'Edit Products', description: 'Modify product details & stock', group: 'Products' },
  { key: 'productDelete', label: 'Delete Products', description: 'Remove products from catalog', group: 'Products' },
  // Orders
  { key: 'orderCreate', label: 'Create Orders', description: 'Process sales at POS', group: 'Orders' },
  { key: 'orderViewAll', label: 'View All Orders', description: 'See every order (not just own)', group: 'Orders' },
  { key: 'orderRefund', label: 'Refund Orders', description: 'Process refunds', group: 'Orders' },
  // Inventory
  { key: 'inventoryAdjust', label: 'Adjust Stock', description: 'Modify inventory levels', group: 'Inventory' },
  // User Management
  { key: 'userCreate', label: 'Create Users', description: 'Add new staff accounts', group: 'User Management' },
  { key: 'userUpdate', label: 'Edit Users', description: 'Modify user roles & permissions', group: 'User Management' },
  { key: 'userDelete', label: 'Delete Users', description: 'Remove staff accounts', group: 'User Management' },
]

export const PERMISSION_GROUPS: PermissionMeta['group'][] = [
  'Views', 'Products', 'Orders', 'Inventory', 'User Management',
]

// ─── Permission Checks ───────────────────────────────────────────────────────

/**
 * Check if a role has a permission BY DEFAULT (ignoring per-user overrides).
 * Used to show "role default" state in the admin UI.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

/**
 * Get the effective permission for a user, accounting for per-user overrides.
 * 1. If the user has an explicit override for this permission → use it
 * 2. Otherwise → fall back to the role default
 */
export function getEffectivePermission(
  role: Role,
  permission: Permission,
  overrides?: Partial<Record<string, boolean>> | null
): boolean {
  if (overrides && permission in overrides) {
    return overrides[permission] === true
  }
  return hasPermission(role, permission)
}

/**
 * Check the effective permission for a session user (convenience wrapper).
 */
export function hasEffectivePermission(user: SessionUser, permission: Permission): boolean {
  return getEffectivePermission(user.role, permission, user.permissions)
}

/**
 * Check if a user can access a given view, accounting for overrides.
 */
export function canAccessView(role: Role, view: string, overrides?: Partial<Record<string, boolean>> | null): boolean {
  const viewMap: Record<string, Permission> = {
    dashboard: 'viewDashboard',
    pos: 'viewPOS',
    products: 'viewProducts',
    categories: 'viewProducts', // Categories uses the same permission as Products
    orders: 'viewOrders',
    inventory: 'viewInventory',
    users: 'viewUsers',
    settings: 'viewSettings',
    reports: 'viewReports',
  }
  const perm = viewMap[view]
  if (!perm) return false
  return getEffectivePermission(role, perm, overrides)
}

/**
 * Convenience for session users.
 */
export function canUserAccessView(user: SessionUser, view: string): boolean {
  return canAccessView(user.role, view, user.permissions)
}

// ─── Permissions JSON helpers ────────────────────────────────────────────────

export function parsePermissionsJson(json: string | null): Partial<Record<string, boolean>> {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const result: Partial<Record<string, boolean>> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'boolean') result[k] = v
    }
    return result
  } catch {
    return {}
  }
}

export function serializePermissionsJson(overrides: Partial<Record<string, boolean>>): string {
  return JSON.stringify(overrides)
}
