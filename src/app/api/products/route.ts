import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const lowStockOnly = searchParams.get('lowStock') === 'true'

    const where: Record<string, unknown> = {}
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ]
    }

    let products = await db.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    })

    if (lowStockOnly) {
      products = products.filter((p) => p.stock <= p.lowStock)
    }

    return NextResponse.json(products)
  } catch (error) {
    console.error('GET products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const product = await db.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        description: body.description || null,
        price: Number(body.price),
        cost: Number(body.cost) || 0,
        stock: Number(body.stock) || 0,
        lowStock: Number(body.lowStock) || 10,
        barcode: body.barcode || null,
        categoryId: body.categoryId || null,
        isActive: body.isActive !== false,
      },
      include: { category: true },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('POST product error:', error)
    return NextResponse.json({ error: 'Failed to create product', detail: String(error) }, { status: 500 })
  }
}
