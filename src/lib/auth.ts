import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import {
  type Role,
  type SessionUser,
  type AuthSession,
  type Permission,
  PERMISSIONS,
  ROLE_LEVEL,
} from '@/lib/auth-types'

// Re-export client-safe types and helpers so server code can import from one place
export {
  type Role,
  type SessionUser,
  type AuthSession,
  type Permission,
  PERMISSIONS,
  ROLE_LEVEL,
  hasPermission,
  canAccessView,
} from '@/lib/auth-types'

// ─── Constants ───────────────────────────────────────────────────────────────
const COOKIE_NAME = 'veeskin_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours
const BCRYPT_ROUNDS = 10

// Secret key — must be set in env. Falls back to a dev-only secret (NOT for prod).
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.AUTH_SECRET || 'veeskin-dev-only-secret-change-me'
)

// ─── Password Hashing ────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters')
  }
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

// ─── JWT ─────────────────────────────────────────────────────────────────────
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .setSubject(user.id)
    .sign(JWT_SECRET)
}

export async function verifySession(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    })
    return payload as unknown as AuthSession
  } catch {
    return null
  }
}

// ─── Cookie Management (server-side) ─────────────────────────────────────────
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function getSessionCookie(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value
}

// ─── Session Resolution ──────────────────────────────────────────────────────
/**
 * Get the current authenticated user from the request cookies.
 * Returns null if not authenticated or session invalid.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionCookie()
  if (!token) return null

  const session = await verifySession(token)
  if (!session) return null

  // Verify user still exists and is active (defense against deleted/deactivated users)
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  })

  if (!user || !user.isActive) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    isActive: user.isActive,
  }
}

/**
 * Require authentication. Throws 401 if not authenticated.
 * Use in API routes to enforce login.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError('Authentication required', 401)
  }
  return user
}

/**
 * Require a specific permission. Throws 403 if user lacks permission.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth()
  const allowedRoles = PERMISSIONS[permission]
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Insufficient permissions. Requires one of: ${allowedRoles.join(', ')}`,
      403
    )
  }
  return user
}

/**
 * Require a minimum role level. Throws 403 if user's role is too low.
 */
export async function requireRole(minRole: Role): Promise<SessionUser> {
  const user = await requireAuth()
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
    throw new AuthError(
      `Insufficient role. Requires ${minRole} or higher.`,
      403
    )
  }
  return user
}

// ─── Custom Error ────────────────────────────────────────────────────────────
export class AuthError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AuthError'
  }
}
