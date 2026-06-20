import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (user) {
    await logAudit({
      user,
      action: 'LOGOUT',
      entity: 'auth',
      description: `${user.name} (${user.email}) logged out`,
      request,
      statusCode: 200,
    })
  }

  await clearSessionCookie()
  return NextResponse.json({ success: true })
}
