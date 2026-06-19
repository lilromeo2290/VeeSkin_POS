import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  requirePermission,
  getCurrentUser,
  AuthError,
  type Role,
  PERMISSIONS,
  serializePermissionsJson,
  type Permission,
} from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('userUpdate')
    const { id } = await params
    const body = await request.json()

    // Prevent self-deactivation or self-demotion (admin locking themselves out)
    if (id === currentUser.id) {
      if (body.isActive === false) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        )
      }
      if (body.role && body.role !== currentUser.role) {
        return NextResponse.json(
          { error: 'You cannot change your own role' },
          { status: 400 }
        )
      }
      // Prevent admin from removing their own user-management permissions (lockout prevention)
      if (body.permissions && typeof body.permissions === 'object') {
        const p = body.permissions as Record<string, boolean>
        if (p.userCreate === false || p.userUpdate === false) {
          return NextResponse.json(
            { error: 'You cannot remove your own user-management permissions' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: {
      name?: string
      email?: string
      role?: Role
      isActive?: boolean
      passwordHash?: string
      permissionsJson?: string | null
    } = {}

    if (body.name) updateData.name = body.name.trim()
    if (body.email) {
      const email = body.email.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
      updateData.email = email
    }
    if (body.role && ['ADMIN', 'MANAGER', 'CASHIER'].includes(body.role)) {
      updateData.role = body.role
    }
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive

    // Optional password reset
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
      updateData.passwordHash = await hashPassword(body.password)
    }

    // Per-user permission overrides
    if (body.permissions !== undefined) {
      const sanitized = sanitizePermissions(body.permissions)
      updateData.permissionsJson = Object.keys(sanitized).length > 0
        ? serializePermissionsJson(sanitized)
        : null // null = use role defaults
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, permissionsJson: true, createdAt: true },
    })

    return NextResponse.json({
      ...user,
      permissions: user.permissionsJson ? JSON.parse(user.permissionsJson) : {},
      permissionsJson: undefined,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('PUT user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requirePermission('userDelete')
    const { id } = await params

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Prevent deleting the last admin
    const target = await db.user.findUnique({ where: { id }, select: { role: true } })
    if (target?.role === 'ADMIN') {
      const adminCount = await db.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin account' },
          { status: 400 }
        )
      }
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('DELETE user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}

/**
 * Sanitize an incoming permissions object — keep only valid Permission keys with boolean values.
 */
function sanitizePermissions(raw: unknown): Partial<Record<Permission, boolean>> {
  if (typeof raw !== 'object' || raw === null) return {}
  const validKeys = Object.keys(PERMISSIONS) as Permission[]
  const result: Partial<Record<Permission, boolean>> = {}
  for (const k of validKeys) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === 'boolean') {
      result[k] = v
    }
  }
  return result
}
