/**
 * Ghana tax calculation utilities for VeeSkin POS.
 *
 * Standard Ghana VAT receipt structure:
 *   - Basic Amount (subtotal of all items, before tax)
 *   - NHIL    @ 2.5%  (National Health Insurance Levy)
 *   - GETFund @ 2.5%  (Ghana Education Trust Fund)
 *   - VAT     @ 10%   (standard Value Added Tax)
 *   - Total tax = 15% of Basic Amount
 *   - Grand Total = Basic Amount + NHIL + GETFund + VAT
 *
 * Reference: Ghana Revenue Authority (GRA) VAT Act 2013 (Act 870), as amended.
 * All rates are applied to the basic amount (non-cascaded).
 */

export const TAX_RATES = {
  NHIL: 0.025,    // 2.5%
  GETFUND: 0.025, // 2.5%
  VAT: 0.10,      // 10%
} as const

export const TOTAL_TAX_RATE = TAX_RATES.NHIL + TAX_RATES.GETFUND + TAX_RATES.VAT // 15%

export interface TaxBreakdown {
  /** Subtotal of all items before any tax or discount */
  basicAmount: number
  /** Discount applied (reduces the taxable amount) */
  discount: number
  /** Amount after discount, before tax (the taxable base) */
  taxableAmount: number
  /** National Health Insurance Levy @ 2.5% */
  nhil: number
  /** Ghana Education Trust Fund @ 2.5% */
  getfund: number
  /** Standard VAT @ 10% */
  vat: number
  /** Total tax (NHIL + GETFund + VAT) */
  totalTax: number
  /** Final amount payable = taxableAmount + totalTax */
  grandTotal: number
}

/**
 * Calculate the full Ghana tax breakdown for a given basic amount and optional discount.
 *
 * @param basicAmount - Sum of all line items (price × quantity) before tax
 * @param discount - Flat discount amount applied before tax (default 0)
 * @returns TaxBreakdown with all components rounded to 2 decimal places
 */
export function calculateTax(basicAmount: number, discount: number = 0): TaxBreakdown {
  const taxableAmount = Math.max(0, basicAmount - discount)
  const nhil = round2(taxableAmount * TAX_RATES.NHIL)
  const getfund = round2(taxableAmount * TAX_RATES.GETFUND)
  const vat = round2(taxableAmount * TAX_RATES.VAT)
  const totalTax = round2(nhil + getfund + vat)
  const grandTotal = round2(taxableAmount + totalTax)

  return {
    basicAmount: round2(basicAmount),
    discount: round2(discount),
    taxableAmount: round2(taxableAmount),
    nhil,
    getfund,
    vat,
    totalTax,
    grandTotal,
  }
}

/**
 * Calculate change due when a customer pays with cash.
 *
 * @param grandTotal - The total amount payable
 * @param amountTendered - The cash amount given by the customer
 * @returns Change due (0 if exact or underpaid)
 */
export function calculateChange(grandTotal: number, amountTendered: number): number {
  if (amountTendered <= 0) return 0
  return round2(Math.max(0, amountTendered - grandTotal))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
