import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, AuthError } from '@/lib/auth'

/**
 * GET /api/audit-logs
 * ADMIN ONLY — returns paginated audit logs with filtering.
 *
 * Query params:
 *   - limit: number of logs (default 100, max 500)
 *   - action: filter by action (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.)
 *   - entity: filter by entity (product, order, user, auth, etc.)
 *   - userId: filter by specific user
 *   - search: text search in description/userEmail/userName
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('viewUsers') // admin-only

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const action = searchParams.get('action')
    const entity = searchParams.get('entity')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { userEmail: { contains: search } },
        { userName: { contains: search } },
      ]
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('GET audit-logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
