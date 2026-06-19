import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
    const startOfWeek = new Date(now.getTime() - 7 * 86400000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [todayOrders, yesterdayOrders, weekOrders, monthOrders, allOrders, products, lowStockProducts] = await Promise.all([
      db.order.findMany({ where: { createdAt: { gte: startOfToday } }, include: { items: true } }),
      db.order.findMany({ where: { createdAt: { gte: startOfYesterday, lt: startOfToday } }, include: { items: true } }),
      db.order.findMany({ where: { createdAt: { gte: startOfWeek } }, include: { items: true } }),
      db.order.findMany({ where: { createdAt: { gte: startOfMonth } }, include: { items: true } }),
      db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { items: true } }),
      db.product.findMany(),
      db.product.findMany({ where: { isActive: true } }),
    ])

    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0)
    const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + o.total, 0)
    const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0)
    const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0)

    const revenueChange = yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10
      : todayRevenue > 0 ? 100 : 0

    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0

    const lowStock = lowStockProducts.filter((p) => p.stock <= p.lowStock)

    const hourlyData = Array.from({ length: 24 }, (_, h) => {
      const hourOrders = todayOrders.filter((o) => o.createdAt.getHours() === h)
      return {
        hour: `${h}:00`,
        sales: Math.round(hourOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
        orders: hourOrders.length,
      }
    }).filter((d) => d.orders > 0 || d.hour === `${now.getHours()}:00`)

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 86400000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayOrders = allOrders.filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
      return {
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: Math.round(dayOrders.reduce((s, o) => s + o.total, 0) * 100) / 100,
        orders: dayOrders.length,
      }
    })

    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const order of allOrders) {
      for (const item of order.items) {
        const key = item.name
        const existing = productSales.get(key) || { name: item.name, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.subtotal
        productSales.set(key, existing)
      }
    }
    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const paymentBreakdown = {
      CASH: todayOrders.filter((o) => o.paymentMethod === 'CASH').length,
      CARD: todayOrders.filter((o) => o.paymentMethod === 'CARD').length,
      DIGITAL: todayOrders.filter((o) => o.paymentMethod === 'DIGITAL').length,
    }

    const categorySales = new Map<string, number>()
    const categoryMap = new Map<string, string>()
    for (const p of products) {
      categoryMap.set(p.id, p.categoryId || 'uncategorized')
    }
    const categories = await db.category.findMany()
    const catIdToName = new Map(categories.map((c) => [c.id, c.name]))
    for (const order of allOrders) {
      for (const item of order.items) {
        if (item.productId) {
          const catId = categoryMap.get(item.productId)
          const catName = catId ? (catIdToName.get(catId) || 'Other') : 'Other'
          categorySales.set(catName, (categorySales.get(catName) || 0) + item.subtotal)
        }
      }
    }
    const categoryData = Array.from(categorySales.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      today: {
        revenue: Math.round(todayRevenue * 100) / 100,
        orders: todayOrders.length,
        itemsSold: todayOrders.reduce((s, o) => s + o.itemsCount, 0),
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        revenueChange,
      },
      week: {
        revenue: Math.round(weekRevenue * 100) / 100,
        orders: weekOrders.length,
      },
      month: {
        revenue: Math.round(monthRevenue * 100) / 100,
        orders: monthOrders.length,
      },
      products: {
        total: products.length,
        active: products.filter((p) => p.isActive).length,
        lowStock: lowStock.length,
        outOfStock: products.filter((p) => p.stock === 0).length,
      },
      hourlyData,
      last7Days,
      topProducts,
      paymentBreakdown,
      categoryData,
      recentOrders: allOrders.slice(0, 8),
      lowStockProducts: lowStock.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, lowStock: p.lowStock })),
    })
  } catch (error) {
    console.error('GET dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data', detail: String(error) }, { status: 500 })
  }
}
