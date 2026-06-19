import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('GET categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
    console.error('POST category error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
