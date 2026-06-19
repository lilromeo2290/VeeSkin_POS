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
 * Permission Matrix — which roles can access which views/features.
 * Single source of truth for RBAC. Shared between server (auth.ts) and client.
 */
export const PERMISSIONS = {
  // Views
  viewDashboard: ['ADMIN', 'MANAGER'] as Role[],
  viewPOS: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  viewProducts: ['ADMIN', 'MANAGER'] as Role[],
  viewOrders: ['ADMIN', 'MANAGER', 'CASHIER'] as Role[],
  viewInventory: ['ADMIN', 'MANAGER'] as Role[],
  viewUsers: ['ADMIN'] as Role[],

  // Product operations
  // NOTE: productRead is granted to CASHIER so they can load the product grid in POS.
  //       Mutations (create/update/delete) are still restricted to managers/admins.
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

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

export function canAccessView(role: Role, view: string): boolean {
  const viewMap: Record<string, Permission> = {
    dashboard: 'viewDashboard',
    pos: 'viewPOS',
    products: 'viewProducts',
    orders: 'viewOrders',
    inventory: 'viewInventory',
    users: 'viewUsers',
  }
  const perm = viewMap[view]
  if (!perm) return false
  return hasPermission(role, perm)
}
