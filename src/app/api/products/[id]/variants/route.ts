import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'
import { generateSku } from '@/lib/sku'

/**
 * GET /api/products/[id]/variants
 * Returns all variants for a product.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productRead')
    const { id } = await params

    const variants = await db.productVariant.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(variants)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET variants error:', error)
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }
}

/**
 * POST /api/products/[id]/variants
 * Creates a new variant for a product.
 * SKU is auto-generated from the parent product name + variant attributes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productCreate')
    const { id } = await params
    const body = await request.json()

    // Get the parent product to use its name for SKU generation
    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Auto-generate SKU from product name + variant size/color/scent
    const variantName = body.name || [body.size, body.color, body.scent].filter(Boolean).join(' - ')
    const sku = body.sku?.trim() || await generateSku(
      `${product.name} ${variantName}`,
      product.brand,
      body.size,
      body.color
    )

    const variant = await db.productVariant.create({
      data: {
        productId: id,
        name: variantName || 'Default',
        size: body.size?.trim() || null,
        color: body.color?.trim() || null,
        scent: body.scent?.trim() || null,
        sku,
        price: body.price != null ? Number(body.price) : null,
        stock: Number(body.stock) || 0,
        barcode: body.barcode || null,
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json(variant, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST variant error:', error)
    return NextResponse.json({ error: 'Failed to create variant', detail: String(error) }, { status: 500 })
  }
}
