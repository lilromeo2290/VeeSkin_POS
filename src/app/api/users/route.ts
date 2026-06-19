import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword,
  requirePermission,
  AuthError,
  type Role,
} from '@/lib/auth'

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
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
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
      data: { name, email, passwordHash, role, isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
