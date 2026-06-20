import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword,
  signSession,
  setSessionCookie,
  parsePermissionsJson,
  type Role,
} from '@/lib/auth'
import { logAudit } from '@/lib/audit'

interface LoginBody {
  email: string
  password: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody
    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      // Log failed login — unknown email
      await logAudit({
        action: 'LOGIN_FAILED',
        entity: 'auth',
        description: `Failed login attempt with email: ${email} (user not found)`,
        request,
        statusCode: 401,
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      await logAudit({
        user: { id: user.id, email: user.email, name: user.name, role: user.role as Role, isActive: false, permissions: {} },
        action: 'LOGIN_FAILED',
        entity: 'auth',
        description: `Login blocked — account deactivated: ${email}`,
        request,
        statusCode: 403,
      })
      return NextResponse.json(
        { error: 'Account deactivated. Contact an administrator.' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      // Log failed login — wrong password
      await logAudit({
        user: { id: user.id, email: user.email, name: user.name, role: user.role as Role, isActive: user.isActive, permissions: {} },
        action: 'LOGIN_FAILED',
        entity: 'auth',
        description: `Failed login attempt — wrong password for: ${email}`,
        request,
        statusCode: 401,
      })
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Issue session
    const token = await signSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      isActive: user.isActive,
      permissions: parsePermissionsJson(user.permissionsJson),
    })
    await setSessionCookie(token)

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Log successful login
    await logAudit({
      user: { id: user.id, email: user.email, name: user.name, role: user.role as Role, isActive: user.isActive, permissions: {} },
      action: 'LOGIN',
      entity: 'auth',
      description: `${user.name} (${user.email}) logged in successfully`,
      request,
      statusCode: 200,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: parsePermissionsJson(user.permissionsJson),
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
