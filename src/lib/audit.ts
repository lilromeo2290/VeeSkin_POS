import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth-types'

/**
 * Audit Logging Utility
 *
 * Tracks all user activity in the system:
 *   - Who (userId, email, name, role)
 *   - What (action, entity, description)
 *   - When (timestamp)
 *   - Where (IP address, device/user-agent, API path)
 *   - Result (HTTP status code)
 *
 * Used by:
 *   - Auth routes (login, logout, failed login)
 *   - All API routes (products, orders, users, settings, etc.)
 */

export interface AuditLogParams {
  user?: SessionUser | null
  action: string  // LOGIN, LOGOUT, LOGIN_FAILED, CREATE, UPDATE, DELETE, VIEW
  entity: string  // product, order, user, category, company_info, auth
  entityId?: string | null
  description: string
  request?: NextRequest | null
  statusCode?: number
}

/**
 * Log an audit event to the database.
 *
 * This function is non-blocking — if it fails, it logs to console but doesn't
 * throw (so it never breaks the main operation).
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const { user, action, entity, entityId, description, request, statusCode } = params

    // Extract IP and user-agent from the request
    let ipAddress: string | null = null
    let userAgent: string | null = null
    let method: string | null = null
    let path: string | null = null

    if (request) {
      ipAddress = getClientIP(request)
      userAgent = request.headers.get('user-agent') || null
      method = request.method
      path = new URL(request.url).pathname
    }

    await db.auditLog.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        userRole: user?.role || null,
        action,
        entity,
        entityId: entityId || null,
        description,
        ipAddress,
        userAgent,
        statusCode: statusCode || null,
        method,
        path,
      },
    })
  } catch (error) {
    // Never let audit logging break the main operation
    console.error('[AUDIT LOG ERROR]', error)
  }
}

/**
 * Extract the client IP address from a Next.js request.
 * Checks multiple headers since the IP may be behind a proxy.
 */
function getClientIP(request: NextRequest): string | null {
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // x-forwarded-for can be a comma-separated list; take the first
      const ip = value.split(',')[0].trim()
      if (ip) return ip
    }
  }

  return null
}

/**
 * Get a short, human-readable device description from a user-agent string.
 * Examples:
 *   "Chrome on Windows"
 *   "Safari on iPhone"
 *   "Firefox on Linux"
 */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'

  let browser = 'Unknown'
  let os = 'Unknown'

  // Browser detection
  if (userAgent.includes('Edg/')) browser = 'Edge'
  else if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) browser = 'Opera'
  else if (userAgent.includes('Chrome/')) browser = 'Chrome'
  else if (userAgent.includes('Firefox/')) browser = 'Firefox'
  else if (userAgent.includes('Safari/')) browser = 'Safari'

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac OS')) os = 'macOS'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
  else if (userAgent.includes('Linux')) os = 'Linux'

  return `${browser} on ${os}`
}
