import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'

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
    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku,
        description: body.description || null,
        price: Number(body.price),
        cost: Number(body.cost) || 0,
        stock: Number(body.stock),
        lowStock: Number(body.lowStock) || 10,
        barcode: body.barcode || null,
        categoryId: body.categoryId || null,
        isActive: body.isActive !== false,
      },
      include: { category: true },
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
