import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError, getCurrentUser } from '@/lib/auth'
import { generateSku } from '@/lib/sku'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('productRead')

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
        { brand: { contains: search } },
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET products error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('productCreate')

    const body = await request.json()

    // Auto-generate SKU from name + brand + size + color
    // (unless the user explicitly provided a custom SKU)
    let sku = body.sku?.trim()
    if (!sku) {
      sku = await generateSku(body.name, body.brand, body.size, body.color)
    }

    const product = await db.product.create({
      data: {
        name: body.name,
        sku,
        description: body.description || null,
        brand: body.brand?.trim() || null,
        size: body.size?.trim() || null,
        color: body.color?.trim() || null,
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST product error:', error)
    return NextResponse.json({ error: 'Failed to create product', detail: String(error) }, { status: 500 })
  }
}
