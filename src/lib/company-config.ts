/**
 * Company configuration for VeeSkin POS.
 *
 * The static COMPANY_CONFIG below is the FALLBACK (used when the database
 * isn't available, e.g., during initial setup before any company info is saved).
 *
 * The actual business information is stored in the CompanyInfo table and
 * edited via the Settings page. The Receipt component and print-receipt
 * generator fetch the live values from /api/company-info.
 */

export interface CompanyInfo {
  id: string
  name: string
  tagline: string
  address: string
  phone: string
  whatsapp: string
  email: string
  website: string | null
  tin: string | null
  logoUrl: string | null
  footerMessage: string
  refundPolicy: string
  nhilRate: number
  getfundRate: number
  vatRate: number
  updatedAt: string
}

/** Static fallback (used before DB is initialized or if fetch fails) */
export const COMPANY_CONFIG: CompanyInfo = {
  id: 'default',
  name: 'VeeSkin Essentials',
  tagline: 'Skincare & Perfume Boutique',
  address: 'Osu, Oxford Street\nAccra, Ghana',
  phone: '+233 24 123 4567',
  whatsapp: '+233 24 123 4567',
  email: 'hello@veeskin.com',
  website: null,
  tin: 'TIN-000-0000-000',
  logoUrl: null,
  footerMessage: 'Thank you for shopping with us!',
  refundPolicy: 'Goods sold are not returnable.',
  nhilRate: 0.025,
  getfundRate: 0.025,
  vatRate: 0.10,
  updatedAt: new Date().toISOString(),
}

/**
 * Fetch the live company info from the API (client-side).
 * Falls back to COMPANY_CONFIG if the fetch fails.
 */
export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  try {
    const res = await fetch('/api/company-info')
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    // Convert address to use \n for line breaks (stored as plain string in DB)
    return {
      ...data,
      address: data.address?.replace(/\\n/g, '\n') || data.address,
    }
  } catch {
    return COMPANY_CONFIG
  }
}

/**
 * Get the company info from the database (server-side).
 * Falls back to COMPANY_CONFIG if DB is unavailable.
 */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    const { db } = await import('@/lib/db')
    let info = await db.companyInfo.findUnique({ where: { id: 'default' } })
    if (!info) {
      info = await db.companyInfo.create({ data: { id: 'default' } })
    }
    return {
      ...info,
      address: info.address.replace(/\\n/g, '\n'),
    }
  } catch {
    return COMPANY_CONFIG
  }
}
