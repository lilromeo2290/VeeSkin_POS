import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'
import { generateSku } from '@/lib/sku'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productRead')
    const { id } = await params
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET product error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productUpdate')
    const { id } = await params
    const body = await request.json()

    // If name/brand/size/color changed and no custom SKU provided, regenerate
    const existing = await db.product.findUnique({ where: { id } })
    let sku = body.sku?.trim() || existing?.sku
    if (!body.sku && existing) {
      const attrsChanged =
        existing.name !== body.name ||
        existing.brand !== (body.brand?.trim() || null) ||
        existing.size !== (body.size?.trim() || null) ||
        existing.color !== (body.color?.trim() || null)
      if (attrsChanged) {
        sku = await generateSku(body.name, body.brand, body.size, body.color, id)
      }
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        sku,
        description: body.description || null,
        brand: body.brand?.trim() || null,
        size: body.size?.trim() || null,
        color: body.color?.trim() || null,
        price: Number(body.price),
        cost: Number(body.cost) || 0,
        stock: Number(body.stock),
        openingStock: Number(body.openingStock) || 0,
        lowStock: Number(body.lowStock) || 10,
        reorderPoint: Number(body.reorderPoint) || 20,
        maxStock: Number(body.maxStock) || 100,
        batchNumber: body.batchNumber?.trim() || null,
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        barcode: body.barcode || null,
        categoryId: body.categoryId || null,
        isActive: body.isActive !== false,
      },
      include: { category: true, variants: true },
    })
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('PUT product error:', error)
    return NextResponse.json({ error: 'Failed to update product', detail: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productDelete')
    const { id } = await params
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('DELETE product error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
