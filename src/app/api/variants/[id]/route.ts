import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productUpdate')
    const { id } = await params
    const body = await request.json()

    const variant = await db.productVariant.update({
      where: { id },
      data: {
        name: body.name,
        size: body.size?.trim() || null,
        color: body.color?.trim() || null,
        scent: body.scent?.trim() || null,
        price: body.price != null ? Number(body.price) : null,
        stock: Number(body.stock) || 0,
        barcode: body.barcode || null,
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json(variant)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('PUT variant error:', error)
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('productDelete')
    const { id } = await params

    await db.productVariant.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('DELETE variant error:', error)
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 })
  }
}
