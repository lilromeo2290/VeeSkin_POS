'use client'

import { Barcode } from '@/components/pos/barcode'
import { formatCurrency, formatCurrencyNegative } from '@/lib/currency'
import { COMPANY_CONFIG } from '@/lib/company-config'

/**
 * The shape of order data needed to render a receipt.
 * This matches the Order model fields returned by the orders API.
 */
export interface ReceiptOrder {
  orderNumber: string
  paymentMethod: string
  subtotal: number
  discount: number
  taxableAmount: number
  nhil: number
  getfund: number
  vat: number
  tax: number
  total: number
  amountTendered: number
  changeGiven: number
  itemsCount: number
  customerName: string | null
  cashierName: string | null
  createdAt: string
  items: {
    id: string
    name: string
    price: number
    quantity: number
    subtotal: number
  }[]
}

interface ReceiptProps {
  order: ReceiptOrder
  /** Show the "Verify at" URL hint below the barcode (default true) */
  showVerifyHint?: boolean
  className?: string
}

/**
 * Shared Receipt component — the SINGLE source of truth for receipt rendering.
 *
 * Used in:
 *   - POS terminal dialog (after checkout)
 *   - Orders view (order detail dialog)
 *   - Printable via window.print() (the .receipt-printable class targets print CSS)
 *
 * The system keeps a copy of every receipt as an Order record in the database.
 * This component renders that stored data identically wherever it appears.
 *
 * The public endpoint at /api/receipts/[orderNumber] returns the same data as JSON
 * (and a server-rendered HTML version for barcode scanning), so a customer scanning
 * the barcode sees the same information the cashier saw.
 */
export function Receipt({ order, showVerifyHint = true, className }: ReceiptProps) {
  const paymentLabel =
    order.paymentMethod === 'CASH' ? 'Cash' :
    order.paymentMethod === 'MOMO' ? 'Mobile Money' :
    order.paymentMethod === 'CARD' ? 'Bank Card' :
    order.paymentMethod

  return (
    <div
      className={`receipt-printable font-mono text-xs space-y-2 border border-dashed border-border rounded-lg p-4 bg-white text-[#1a1410] ${className ?? ''}`}
    >
      {/* ─── Company header ─── */}
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide">{COMPANY_CONFIG.name}</p>
        <p className="text-[10px] text-muted-foreground">{COMPANY_CONFIG.tagline}</p>
        <p className="text-[10px] text-muted-foreground whitespace-pre-line">{COMPANY_CONFIG.location}</p>
        <p className="text-[10px] text-muted-foreground">Tel/WhatsApp: {COMPANY_CONFIG.phone}</p>
        {COMPANY_CONFIG.tin && (
          <p className="text-[10px] text-muted-foreground">TIN: {COMPANY_CONFIG.tin}</p>
        )}
      </div>

      <div className="border-t border-dashed border-border" />

      {/* ─── Receipt meta ─── */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Receipt No:</span>
          <span className="font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date &amp; Time:</span>
          <span>{new Date(order.createdAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cashier:</span>
          <span>{order.cashierName || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer:</span>
          <span>{order.customerName || 'Walk-in'}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-border" />

      {/* ─── Items table ─── */}
      <table className="w-full">
        <thead>
          <tr className="text-[9px] uppercase text-muted-foreground border-b border-border">
            <th className="text-left pb-1">Item</th>
            <th className="text-center pb-1 w-8">Qty</th>
            <th className="text-right pb-1 w-16">Price</th>
            <th className="text-right pb-1 w-16">Amt</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-dotted border-border/50">
              <td className="py-1 text-[10px]">{item.name}</td>
              <td className="text-center text-[10px]">{item.quantity}</td>
              <td className="text-right text-[10px]">{formatCurrency(item.price)}</td>
              <td className="text-right text-[10px] font-medium">{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ─── Totals ─── */}
      <div className="space-y-0.5 pt-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Basic Amount:</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount:</span>
              <span>{formatCurrencyNegative(order.discount)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(order.taxableAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>NHIL @ 2.5%:</span>
          <span>{formatCurrency(order.nhil)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>GETFund @ 2.5%:</span>
          <span>{formatCurrency(order.getfund)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>VAT @ 10%:</span>
          <span>{formatCurrency(order.vat)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-border">
          <span>GRAND TOTAL:</span>
          <span className="text-[#D4A574]">{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* ─── Payment info ─── */}
      <div className="border-t border-dashed border-border pt-1 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment:</span>
          <span className="font-bold">{paymentLabel}</span>
        </div>
        {order.paymentMethod === 'CASH' && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Tendered:</span>
              <span>{formatCurrency(order.amountTendered)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change Given:</span>
              <span className="font-medium">{formatCurrency(order.changeGiven)}</span>
            </div>
          </>
        )}
      </div>

      {/* ─── Barcode ─── */}
      <div className="border-t border-dashed border-border pt-2 flex flex-col items-center">
        <p className="text-[9px] text-muted-foreground mb-1">Scan to verify receipt</p>
        <Barcode
          value={order.orderNumber}
          width={1.5}
          height={40}
          displayValue={true}
        />
        {showVerifyHint && (
          <p className="text-[8px] text-muted-foreground mt-1">
            Verify at: /api/receipts/{order.orderNumber}
          </p>
        )}
      </div>

      {/* ─── Footer ─── */}
      <div className="text-center text-[9px] text-muted-foreground pt-1">
        <p>Thank you for shopping with {COMPANY_CONFIG.name}!</p>
        <p>Goods sold are not returnable. Please keep your receipt.</p>
      </div>
    </div>
  )
}
