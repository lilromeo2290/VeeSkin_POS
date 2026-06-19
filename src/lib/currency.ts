/**
 * Currency formatting utility for VeeSkin POS.
 * All monetary values are displayed in Ghana Cedis (GH₵).
 *
 * To change currency in the future, update CURRENCY_SYMBOL and LOCALE below.
 */

export const CURRENCY_SYMBOL = 'GH₵'
export const CURRENCY_CODE = 'GHS'
export const CURRENCY_LOCALE = 'en-GH'

/**
 * Format a number as a Ghana Cedis currency string.
 * Always shows 2 decimal places.
 *
 * @example formatCurrency(28) → "GH₵28.00"
 * @example formatCurrency(145.5) → "GH₵145.50"
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`
}

/**
 * Format a number as a negative currency string (for discounts/refunds).
 *
 * @example formatCurrencyNegative(5.5) → "-GH₵5.50"
 */
export function formatCurrencyNegative(amount: number): string {
  return `-${CURRENCY_SYMBOL}${Math.abs(amount).toFixed(2)}`
}
