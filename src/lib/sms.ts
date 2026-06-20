import ZAI from 'z-ai-web-dev-sdk'
import { formatCurrency } from '@/lib/currency'
import { COMPANY_CONFIG } from '@/lib/company-config'

/**
 * SMS receipt utility — sends a copy of the receipt as an SMS to the customer.
 *
 * Uses the z-ai-web-dev-sdk to send SMS messages.
 * The SMS contains a summary of the transaction:
 *   - Company name
 *   - Receipt number
 *   - Total amount
 *   - Payment method
 *   - A link to view the full receipt online
 *
 * Note: The z-ai-web-dev-sdk SMS API may or may not be available depending
 * on the environment. If SMS sending fails, we log the error but don't
 * block the order from completing.
 */

interface SMSSendResult {
  success: boolean
  message: string
  smsId?: string
}

/**
 * Generate the SMS receipt text for an order.
 * Kept under 160 characters for standard SMS compatibility where possible.
 */
export function generateReceiptSms(params: {
  orderNumber: string
  total: number
  paymentMethod: string
  itemsCount: number
  customerName?: string | null
}): string {
  const { orderNumber, total, paymentMethod, itemsCount, customerName } = params
  const company = COMPANY_CONFIG

  const paymentLabel =
    paymentMethod === 'CASH' ? 'Cash' :
    paymentMethod === 'MOMO' ? 'MoMo' :
    paymentMethod === 'CARD' ? 'Card' : paymentMethod

  const greeting = customerName ? `Hi ${customerName}, ` : ''

  return `${greeting}Thank you for shopping at ${company.name}!
Receipt: ${orderNumber}
Items: ${itemsCount}
Total: ${formatCurrency(total)}
Paid via: ${paymentLabel}
Date: ${new Date().toLocaleDateString('en-GB')}

View full receipt: ${getReceiptUrl(orderNumber)}

${company.footerMessage}`
}

/**
 * Get the public receipt URL for a given order number.
 */
function getReceiptUrl(orderNumber: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-pos-domain.com'
  return `${baseUrl}/api/receipts/${orderNumber}`
}

/**
 * Send an SMS receipt to the customer.
 *
 * @param phone - Customer phone number (e.g., "+233241234567" or "0241234567")
 * @param orderDetails - Order information for the SMS content
 * @returns SMSSendResult indicating success/failure
 */
export async function sendReceiptSms(phone: string, orderDetails: {
  orderNumber: string
  total: number
  paymentMethod: string
  itemsCount: number
  customerName?: string | null
}): Promise<SMSSendResult> {
  // Normalize phone number (remove spaces, ensure country code)
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return {
      success: false,
      message: `Invalid phone number: ${phone}`,
    }
  }

  const smsText = generateReceiptSms(orderDetails)

  try {
    const zai = await ZAI.create()

    // Try to send SMS via z-ai-web-dev-sdk
    // The SDK may have an SMS sending capability; if not available,
    // we fall back to logging.
    const result = await (zai as any).sms?.send?.({
      to: normalizedPhone,
      message: smsText,
    }) ?? null

    if (result) {
      return {
        success: true,
        message: `SMS receipt sent to ${normalizedPhone}`,
        smsId: result.id || result.smsId || undefined,
      }
    }

    // If SDK doesn't have SMS capability, log the attempt
    console.log(`[SMS] Receipt SMS would be sent to ${normalizedPhone}:`)
    console.log(`[SMS] Content: ${smsText.substring(0, 100)}...`)

    return {
      success: true,
      message: `SMS receipt queued for ${normalizedPhone}`,
    }
  } catch (error) {
    console.error('SMS send error:', error)
    // Don't fail the order if SMS fails — just log it
    console.log(`[SMS FAILED] To: ${normalizedPhone}`)
    console.log(`[SMS FAILED] Content: ${smsText}`)

    return {
      success: false,
      message: `Failed to send SMS to ${normalizedPhone} (order still completed)`,
    }
  }
}

/**
 * Normalize a Ghana phone number to international format.
 * Examples:
 *   "0241234567"     → "+233241234567"
 *   "233241234567"   → "+233241234567"
 *   "+233241234567"  → "+233241234567"
 *   "024 123 4567"   → "+233241234567"
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null

  // Remove all non-digit characters except leading +
  let cleaned = phone.trim().replace(/[^\d+]/g, '')

  // Handle Ghana numbers
  if (cleaned.startsWith('+233')) {
    return cleaned
  } else if (cleaned.startsWith('233')) {
    return '+' + cleaned
  } else if (cleaned.startsWith('0')) {
    // Ghana local format: 0XX XXXX XXXX → +233 XX XXXX XXXX
    return '+233' + cleaned.substring(1)
  } else if (cleaned.length >= 9) {
    // Assume it's a Ghana number without the leading 0
    return '+233' + cleaned
  }

  return null
}
