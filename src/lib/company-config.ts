/**
 * Company configuration for VeeSkin Essentials POS.
 * These details appear on every receipt issued by the system.
 *
 * Update these values to match your business information.
 */

export const COMPANY_CONFIG = {
  name: 'VeeSkin Essentials',
  tagline: 'Skincare & Perfume Boutique',
  location: 'Osu, Oxford Street\nAccra, Ghana',
  phone: '+233 24 123 4567',
  whatsapp: '+233 24 123 4567',
  email: 'hello@veeskin.com',
  // Tax registration number (shown on receipts for VAT-registered businesses)
  tin: 'TIN-000-0000-000', // Tax Identification Number
} as const

/**
 * Format the company phone as a tel: link.
 */
export function getPhoneLink(): string {
  return `tel:${COMPANY_CONFIG.phone.replace(/\s/g, '')}`
}

/**
 * Format the WhatsApp number as a wa.me link.
 */
export function getWhatsAppLink(): string {
  const digits = COMPANY_CONFIG.whatsapp.replace(/[^0-9]/g, '')
  return `https://wa.me/${digits}`
}
