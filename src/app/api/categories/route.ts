import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, AuthError } from '@/lib/auth'

export async function GET() {
  try {
    // Cashiers need categories for the POS terminal, so just require auth
    await requireAuth()

    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json(categories)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requirePermission('productCreate')

    const body = await request.json()
    const category = await db.category.create({
      data: {
        name: body.name,
        icon: body.icon || null,
        color: body.color || null,
      },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST category error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
