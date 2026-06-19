import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/auth/me
 * Returns the currently authenticated user, or 401 if not logged in.
 * The frontend uses this to determine auth state and route accordingly.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user })
}
