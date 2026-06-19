import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, AuthError, hasPermission, type SessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    // Cashiers can only see their own orders; admins/managers see all
    if (!hasPermission(user.role, 'orderViewAll')) {
      where.cashierId = user.id
    }

    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(orders)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission('orderCreate')
    const body = await request.json()
    const { items, paymentMethod, customerName, discount, taxRate, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const productIds = items.map((i: { productId: string }) => i.productId).filter(Boolean)
    const products = await db.product.findMany({ where: { id: { in: productIds } } })
    const productMap = new Map(products.map((p) => [p.id, p]))

    const orderItems = items.map((item: { productId: string; name: string; price: number; quantity: number }) => {
      const product = item.productId ? productMap.get(item.productId) : null
      const price = product ? product.price : Number(item.price)
      const quantity = Number(item.quantity)
      return {
        productId: product?.id || null,
        name: product?.name || item.name,
        price,
        quantity,
        subtotal: Math.round(price * quantity * 100) / 100,
      }
    })

    const subtotal = orderItems.reduce((s: number, it: { subtotal: number }) => s + it.subtotal, 0)
    const discountAmount = Number(discount) || 0
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const taxAmount = Math.round(taxableAmount * (Number(taxRate) || 0.08) * 100) / 100
    const total = Math.round((taxableAmount + taxAmount) * 100) / 100

    const count = await db.order.count()
    const orderNumber = `ORD-${String(1000 + count).padStart(5, '0')}`

    // Decrement stock atomically
    for (const item of orderItems) {
      if (item.productId) {
        await db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }

    const order = await db.order.create({
      data: {
        orderNumber,
        status: 'COMPLETED',
        paymentMethod: paymentMethod || 'CASH',
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total,
        itemsCount: orderItems.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0),
        customerName: customerName || null,
        cashierName: user.name,
        cashierId: user.id,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: true },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST order error:', error)
    return NextResponse.json({ error: 'Failed to create order', detail: String(error) }, { status: 500 })
  }
}
