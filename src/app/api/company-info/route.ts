import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, getCurrentUser, AuthError } from '@/lib/auth'

/**
 * GET /api/company-info
 * PUBLIC endpoint — no auth required.
 * Returns the business information shown on receipts.
 *
 * Used by:
 *   - The receipt component (to display company header)
 *   - The public receipt verification endpoint
 *   - The print-receipt HTML generator
 *   - The Settings page (to populate the edit form)
 */
export async function GET() {
  try {
    let info = await db.companyInfo.findUnique({ where: { id: 'default' } })
    if (!info) {
      // Create default row if it doesn't exist yet
      info = await db.companyInfo.create({ data: { id: 'default' } })
    }
    return NextResponse.json(info)
  } catch (error) {
    console.error('GET company-info error:', error)
    return NextResponse.json({ error: 'Failed to fetch company info' }, { status: 500 })
  }
}

/**
 * PUT /api/company-info
 * ADMIN ONLY — updates the business information.
 * Changes appear on all subsequent receipts.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requirePermission('userUpdate') // admin-only
    const body = await request.json()

    // Sanitize and validate
    const data = {
      name: body.name?.trim() || 'VeeSkin Essentials',
      tagline: body.tagline?.trim() || '',
      address: body.address?.trim() || '',
      phone: body.phone?.trim() || '',
      whatsapp: body.whatsapp?.trim() || '',
      email: body.email?.trim() || '',
      website: body.website?.trim() || null,
      tin: body.tin?.trim() || null,
      logoUrl: body.logoUrl?.trim() || null,
      footerMessage: body.footerMessage?.trim() || 'Thank you for shopping with us!',
      refundPolicy: body.refundPolicy?.trim() || 'Goods sold are not returnable.',
      nhilRate: typeof body.nhilRate === 'number' ? body.nhilRate : 0.025,
      getfundRate: typeof body.getfundRate === 'number' ? body.getfundRate : 0.025,
      vatRate: typeof body.vatRate === 'number' ? body.vatRate : 0.10,
      updatedById: user.id,
    }

    const info = await db.companyInfo.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    })

    return NextResponse.json(info)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('PUT company-info error:', error)
    return NextResponse.json({ error: 'Failed to update company info' }, { status: 500 })
  }
}
