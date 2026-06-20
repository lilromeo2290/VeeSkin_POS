import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'

/**
 * GET /api/reports
 * Returns comprehensive reporting data:
 *   - Daily, weekly, monthly sales summaries
 *   - Profit/loss summary (revenue, cost, gross profit, margin)
 *   - Best-selling products (by quantity and revenue)
 *   - Low stock alerts (products at or below reorder point)
 *
 * Requires: viewReports permission (ADMIN, MANAGER)
 */
export async function GET() {
  try {
    await requirePermission('viewReports')

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now.getTime() - 7 * 86400000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Fetch all orders with items for the calculations
    const [todayOrders, weekOrders, monthOrders, yearOrders, allProducts] = await Promise.all([
      db.order.findMany({
        where: { createdAt: { gte: startOfToday }, status: 'COMPLETED' },
        include: { items: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: startOfWeek }, status: 'COMPLETED' },
        include: { items: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: startOfMonth }, status: 'COMPLETED' },
        include: { items: true },
      }),
      db.order.findMany({
        where: { createdAt: { gte: startOfYear }, status: 'COMPLETED' },
        include: { items: true },
      }),
      db.product.findMany({
        include: { category: true },
      }),
    ])

    // ─── Sales Reports (daily, weekly, monthly) ──────────────────────────────
    function summarize(orders: typeof todayOrders) {
      const revenue = orders.reduce((s, o) => s + o.total, 0)
      const cost = orders.reduce((s, o) =>
        s + o.items.reduce((cs, item) => {
          // Find the product to get its cost
          const product = allProducts.find(p => p.id === item.productId)
          return cs + (product ? product.cost * item.quantity : 0)
        }, 0)
      , 0)
      const itemsSold = orders.reduce((s, o) => s + o.itemsCount, 0)
      const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0
      const grossProfit = revenue - cost
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
      return {
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        orderCount: orders.length,
        itemsSold,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      }
    }

    const sales = {
      today: summarize(todayOrders),
      week: summarize(weekOrders),
      month: summarize(monthOrders),
      year: summarize(yearOrders),
    }

    // ─── Daily sales breakdown (last 7 days) ─────────────────────────────────
    const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 86400000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayOrders = weekOrders.filter(o => o.createdAt >= dayStart && o.createdAt < dayEnd)
      const revenue = dayOrders.reduce((s, o) => s + o.total, 0)
      return {
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: Math.round(revenue * 100) / 100,
        orders: dayOrders.length,
      }
    })

    // ─── Monthly sales breakdown (last 6 months) ─────────────────────────────
    const monthlyBreakdown = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
      const monthOrders = yearOrders.filter(o => o.createdAt >= monthDate && o.createdAt < monthEnd)
      const revenue = monthOrders.reduce((s, o) => s + o.total, 0)
      const cost = monthOrders.reduce((s, o) =>
        s + o.items.reduce((cs, item) => {
          const product = allProducts.find(p => p.id === item.productId)
          return cs + (product ? product.cost * item.quantity : 0)
        }, 0)
      , 0)
      return {
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        profit: Math.round((revenue - cost) * 100) / 100,
        orders: monthOrders.length,
      }
    })

    // ─── Profit/Loss Summary ─────────────────────────────────────────────────
    const profitLoss = {
      today: { revenue: sales.today.revenue, cost: sales.today.cost, profit: sales.today.grossProfit, margin: sales.today.margin },
      week: { revenue: sales.week.revenue, cost: sales.week.cost, profit: sales.week.grossProfit, margin: sales.week.margin },
      month: { revenue: sales.month.revenue, cost: sales.month.cost, profit: sales.month.grossProfit, margin: sales.month.margin },
      year: { revenue: sales.year.revenue, cost: sales.year.cost, profit: sales.year.grossProfit, margin: sales.year.margin },
    }

    // ─── Best-Selling Products ───────────────────────────────────────────────
    // Aggregate across all year orders (or all-time if more data)
    const productSales = new Map<string, { name: string; sku: string; category: string | null; quantity: number; revenue: number; cost: number }>()
    for (const order of yearOrders) {
      for (const item of order.items) {
        const key = item.productId || item.name
        const product = allProducts.find(p => p.id === item.productId)
        const existing = productSales.get(key) || {
          name: item.name,
          sku: product?.sku || '—',
          category: product?.category?.name || null,
          quantity: 0,
          revenue: 0,
          cost: 0,
        }
        existing.quantity += item.quantity
        existing.revenue += item.subtotal
        existing.cost += (product ? product.cost * item.quantity : 0)
        productSales.set(key, existing)
      }
    }

    const bestSellers = Array.from(productSales.values())
      .map(p => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        cost: Math.round(p.cost * 100) / 100,
        profit: Math.round((p.revenue - p.cost) * 100) / 100,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // ─── Low Stock Alerts ────────────────────────────────────────────────────
    const lowStockAlerts = allProducts
      .filter(p => p.isActive && p.stock <= (p.reorderPoint || 20))
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || null,
        currentStock: p.stock,
        minStock: p.lowStock || 10,
        reorderPoint: p.reorderPoint || 20,
        maxStock: p.maxStock || 100,
        status: p.stock === 0 ? 'OUT_OF_STOCK' : p.stock <= (p.lowStock || 10) ? 'LOW' : 'REORDER',
        batchNumber: p.batchNumber,
        expiryDate: p.expiryDate,
      }))
      .sort((a, b) => a.currentStock - b.currentStock)

    return NextResponse.json({
      sales,
      dailyBreakdown,
      monthlyBreakdown,
      profitLoss,
      bestSellers,
      lowStockAlerts,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET reports error:', error)
    return NextResponse.json({ error: 'Failed to generate reports', detail: String(error) }, { status: 500 })
  }
}
