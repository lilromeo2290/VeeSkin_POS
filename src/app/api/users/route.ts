import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  requirePermission,
  AuthError,
  getCurrentUser,
  type Role,
  PERMISSIONS,
  serializePermissionsJson,
  type Permission,
} from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    await requirePermission('userCreate')

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissionsJson: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Parse permissionsJson for each user
    const result = users.map((u) => ({
      ...u,
      permissions: u.permissionsJson ? JSON.parse(u.permissionsJson) : {},
      permissionsJson: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('userCreate')

    const body = await request.json()
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const role: Role = ['ADMIN', 'MANAGER', 'CASHIER'].includes(body.role) ? body.role : 'CASHIER'
    const isActive = body.isActive !== false
    const permissions = sanitizePermissions(body.permissions)

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        isActive,
        permissionsJson: Object.keys(permissions).length > 0 ? serializePermissionsJson(permissions) : null,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, permissionsJson: true, createdAt: true },
    })

    await logAudit({ user: await getCurrentUser(), action: 'CREATE', entity: 'user', entityId: user.id, description: `Created user: ${user.name} (${user.email}) — role: ${user.role}`, request, statusCode: 201 })
    return NextResponse.json({
      ...user,
      permissions: user.permissionsJson ? JSON.parse(user.permissionsJson) : {},
      permissionsJson: undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
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
