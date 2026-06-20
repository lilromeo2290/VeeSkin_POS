import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, AuthError } from '@/lib/auth'

/**
 * GET /api/expiring
 * Returns products grouped by expiry urgency:
 *   - expired: already past expiry date
 *   - critical: expiring within 7 days
 *   - soon: expiring within 30 days
 *   - warning: expiring within 90 days
 *
 * Query params:
 *   - days: override the "soon" threshold (default 30)
 *
 * Requires: authenticated user (any role can see expiry alerts)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const soonDays = parseInt(searchParams.get('days') || '30')

    const now = new Date()
    const criticalDate = new Date(now.getTime() + 7 * 86400000)   // 7 days
    const soonDate = new Date(now.getTime() + soonDays * 86400000) // 30 days
    const warningDate = new Date(now.getTime() + 90 * 86400000)   // 90 days

    // Fetch all active products with expiry dates
    const products = await db.product.findMany({
      where: {
        isActive: true,
        expiryDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        batchNumber: true,
        manufacturingDate: true,
        expiryDate: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { expiryDate: 'asc' },
    })

    const expired: typeof products = []
    const critical: typeof products = []
    const soon: typeof products = []
    const warning: typeof products = []

    for (const p of products) {
      if (!p.expiryDate) continue
      const expDate = new Date(p.expiryDate)
      if (expDate < now) {
        expired.push(p)
      } else if (expDate <= criticalDate) {
        critical.push(p)
      } else if (expDate <= soonDate) {
        soon.push(p)
      } else if (expDate <= warningDate) {
        warning.push(p)
      }
    }

    // Calculate days until expiry for each product
    function withDays(items: typeof products) {
      return items.map(p => ({
        ...p,
        daysUntilExpiry: p.expiryDate
          ? Math.floor((new Date(p.expiryDate).getTime() - now.getTime()) / 86400000)
          : null,
      }))
    }

    const response = NextResponse.json({
      expired: withDays(expired),
      critical: withDays(critical),
      soon: withDays(soon),
      warning: withDays(warning),
      summary: {
        expired: expired.length,
        critical: critical.length,
        soon: soon.length,
        warning: warning.length,
        total: expired.length + critical.length + soon.length + warning.length,
      },
    })
    // Prevent browser caching so deleted/replaced products disappear immediately
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return response
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET expiring error:', error)
    return NextResponse.json({ error: 'Failed to fetch expiring products' }, { status: 500 })
  }
}
