import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  signSession,
  setSessionCookie,
  AuthError,
  type Role,
} from '@/lib/auth'

interface SetupBody {
  name: string
  email: string
  password: string
  role?: Role
}

/**
 * POST /api/auth/setup
 * One-time endpoint to create the FIRST admin user.
 * Returns 409 if any users already exist (prevents privilege escalation).
 */
export async function POST(request: NextRequest) {
  try {
    // Block setup if users already exist
    const userCount = await db.user.count()
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Setup already complete. Ask an admin to create new users.' },
        { status: 409 }
      )
    }

    const body = (await request.json()) as SetupBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const role: Role = body.role === 'ADMIN' || body.role === 'MANAGER' ? body.role : 'ADMIN'

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

    // Email format check (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    // Auto-login the first admin (no permission overrides = full role defaults)
    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      isActive: true,
      permissions: {},
    })
    await setSessionCookie(token)

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      user: { ...user, isActive: true, permissions: {} },
      message: 'Admin account created. You are now logged in.',
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Setup failed', detail: String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/setup
 * Returns whether initial setup is needed (no users exist yet).
 */
export async function GET() {
  try {
    const count = await db.user.count()
    return NextResponse.json({ needsSetup: count === 0 })
  } catch (error) {
    return NextResponse.json({ needsSetup: true })
  }
}
