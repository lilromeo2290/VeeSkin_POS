import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, AuthError, getEffectivePermission, type SessionUser } from '@/lib/auth'
import { calculateTax, calculateChange } from '@/lib/tax'
import { sendReceiptSms } from '@/lib/sms'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    // Cashiers can only see their own orders; admins/managers see all (unless overridden)
    if (!getEffectivePermission(user.role, 'orderViewAll', user.permissions)) {
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
    const {
      items, paymentMethod, customerName, customerPhone, discount, notes,
      amountTendered, // for cash payments
    } = body

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
    const tax = calculateTax(subtotal, discountAmount)

    // Validate payment method
    const validPaymentMethods = ['CASH', 'MOMO', 'CARD']
    const payMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'CASH'

    // Calculate change for cash payments
    const tendered = payMethod === 'CASH' ? Number(amountTendered) || 0 : 0
    const change = payMethod === 'CASH' ? calculateChange(tax.grandTotal, tendered) : 0

    // For cash, require amount tendered >= grand total
    if (payMethod === 'CASH' && tendered < tax.grandTotal) {
      return NextResponse.json(
        { error: `Amount tendered (GH₵${tendered.toFixed(2)}) is less than the total due (GH₵${tax.grandTotal.toFixed(2)})` },
        { status: 400 }
      )
    }

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
        paymentMethod: payMethod,
        subtotal: tax.basicAmount,
        discount: tax.discount,
        taxableAmount: tax.taxableAmount,
        nhil: tax.nhil,
        getfund: tax.getfund,
        vat: tax.vat,
        tax: tax.totalTax,
        total: tax.grandTotal,
        amountTendered: tendered,
        changeGiven: change,
        itemsCount: orderItems.reduce((s: number, it: { quantity: number }) => s + it.quantity, 0),
        customerName: customerName || null,
        cashierName: user.name,
        cashierId: user.id,
        notes: customerPhone ? `Customer Phone: ${customerPhone}` : (notes || null),
        items: { create: orderItems },
      },
      include: { items: true },
    })

    // ─── Send SMS receipt to customer ───
    // This runs after the order is saved. If SMS fails, the order still succeeds.
    let smsResult: { success: boolean; message: string } | null = null
    if (customerPhone && customerPhone.trim()) {
      try {
        smsResult = await sendReceiptSms(customerPhone, {
          orderNumber: order.orderNumber,
          total: order.total,
          paymentMethod: order.paymentMethod,
          itemsCount: order.itemsCount,
          customerName: customerName || null,
        })
        console.log(`[SMS] ${smsResult.success ? 'Sent' : 'Failed'}: ${smsResult.message}`)
      } catch (smsError) {
        console.error('[SMS] Error sending receipt SMS:', smsError)
        smsResult = { success: false, message: 'SMS sending failed (order completed)' }
      }
    }

    // Log the order creation
    await logAudit({
      user,
      action: 'CREATE',
      entity: 'order',
      entityId: order.id,
      description: `Created order ${order.orderNumber} — ${order.itemsCount} items, total ${order.total} (${order.paymentMethod})`,
      request,
      statusCode: 201,
    })

    // Return the order with SMS status
    return NextResponse.json({
      ...order,
      smsResult: smsResult || { success: false, message: 'No phone number provided' },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('POST order error:', error)
    return NextResponse.json({ error: 'Failed to create order', detail: String(error) }, { status: 500 })
  }
}
