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
 * Shared Receipt component — formatted as a THERMAL PRINTER receipt.
 *
 * Design characteristics of a thermal receipt:
 *   - 80mm width (standard thermal paper roll)
 *   - Monospace font (matches thermal printer output)
 *   - No colored backgrounds, no rounded borders, no shadows
 *   - Tight line spacing to save paper
 *   - Dashed separators (cut lines) between sections
 *   - Center-aligned header and footer
 *   - Left-aligned items, right-aligned amounts
 *   - Single accent color (rose gold) only for the grand total
 *
 * Used in:
 *   - POS terminal dialog (after checkout)
 *   - Orders view (order detail dialog)
 *   - Printable via the hidden-iframe print function (src/lib/print-receipt.ts)
 *
 * The system keeps a copy of every receipt as an Order record in the database.
 */
export function Receipt({ order, showVerifyHint = true, className }: ReceiptProps) {
  const paymentLabel =
    order.paymentMethod === 'CASH' ? 'CASH' :
    order.paymentMethod === 'MOMO' ? 'MOBILE MONEY' :
    order.paymentMethod === 'CARD' ? 'BANK CARD' :
    order.paymentMethod

  return (
    <div
      className={`thermal-receipt font-mono bg-white text-black ${className ?? ''}`}
      style={{
        width: '300px',
        maxWidth: '100%',
        padding: '8px 10px',
        margin: '0 auto',
        fontSize: '11px',
        lineHeight: '1.4',
      }}
    >
      {/* ─── Store header (centered, bold) ─── */}
      <div className="text-center" style={{ marginBottom: '4px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>
          {COMPANY_CONFIG.name.toUpperCase()}
        </div>
        <div style={{ fontSize: '10px', color: '#555' }}>{COMPANY_CONFIG.tagline}</div>
        <div style={{ fontSize: '10px', color: '#555', whiteSpace: 'pre-line' }}>
          {COMPANY_CONFIG.location}
        </div>
        <div style={{ fontSize: '10px', color: '#555' }}>
          Tel: {COMPANY_CONFIG.phone}
        </div>
        {COMPANY_CONFIG.tin && (
          <div style={{ fontSize: '10px', color: '#555' }}>TIN: {COMPANY_CONFIG.tin}</div>
        )}
      </div>

      {/* Cut line */}
      <DashedLine />

      {/* ─── Receipt meta ─── */}
      <div style={{ marginBottom: '2px' }}>
        <Row label="Receipt No:" value={order.orderNumber} bold />
        <Row label="Date:" value={new Date(order.createdAt).toLocaleDateString('en-GB')} />
        <Row label="Time:" value={new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
        <Row label="Cashier:" value={order.cashierName || '—'} />
        <Row label="Customer:" value={order.customerName || 'Walk-in'} />
      </div>

      <DashedLine />

      {/* ─── Column headers ─── */}
      <div style={{ display: 'flex', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>
        <span style={{ flex: 1 }}>Item</span>
        <span style={{ width: '28px', textAlign: 'center' }}>Qty</span>
        <span style={{ width: '55px', textAlign: 'right' }}>Price</span>
        <span style={{ width: '60px', textAlign: 'right' }}>Total</span>
      </div>

      {/* ─── Items ─── */}
      <div>
        {order.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', fontSize: '10px', padding: '1px 0', alignItems: 'flex-start' }}>
            <span style={{ flex: 1, paddingRight: '4px' }}>{item.name}</span>
            <span style={{ width: '28px', textAlign: 'center' }}>{item.quantity}</span>
            <span style={{ width: '55px', textAlign: 'right' }}>{formatCurrency(item.price)}</span>
            <span style={{ width: '60px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <DashedLine />

      {/* ─── Totals ─── */}
      <div style={{ marginBottom: '2px' }}>
        <Row label="Basic Amount:" value={formatCurrency(order.subtotal)} />
        {order.discount > 0 && (
          <>
            <Row label="Discount:" value={formatCurrencyNegative(order.discount)} />
            <Row label="Taxable Amt:" value={formatCurrency(order.taxableAmount)} small />
          </>
        )}
        <Row label="NHIL (2.5%):" value={formatCurrency(order.nhil)} small />
        <Row label="GETFund (2.5%):" value={formatCurrency(order.getfund)} small />
        <Row label="VAT (10%):" value={formatCurrency(order.vat)} small />
      </div>

      {/* Grand total — emphasized */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        fontWeight: 700,
        borderTop: '2px solid #000',
        borderBottom: '2px solid #000',
        padding: '4px 0',
        margin: '2px 0',
      }}>
        <span>GRAND TOTAL</span>
        <span style={{ color: '#D4A574' }}>{formatCurrency(order.total)}</span>
      </div>

      {/* ─── Payment info ─── */}
      <div style={{ marginTop: '4px' }}>
        <Row label="Payment:" value={paymentLabel} bold />
        {order.paymentMethod === 'CASH' && (
          <>
            <Row label="Tendered:" value={formatCurrency(order.amountTendered)} />
            <Row label="Change:" value={formatCurrency(order.changeGiven)} bold />
          </>
        )}
      </div>

      <DashedLine />

      {/* ─── Barcode ─── */}
      <div className="text-center" style={{ padding: '4px 0' }}>
        <div style={{ fontSize: '8px', color: '#666', marginBottom: '2px' }}>SCAN TO VERIFY</div>
        <Barcode
          value={order.orderNumber}
          width={1.3}
          height={36}
          displayValue={true}
        />
        {showVerifyHint && (
          <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>
            /api/receipts/{order.orderNumber}
          </div>
        )}
      </div>

      <DashedLine />

      {/* ─── Footer ─── */}
      <div className="text-center" style={{ fontSize: '9px', color: '#666', padding: '2px 0' }}>
        <div style={{ fontWeight: 600 }}>THANK YOU!</div>
        <div>Goods sold are not returnable.</div>
        <div>Please keep your receipt.</div>
      </div>

      {/* Final cut line */}
      <DashedLine />
    </div>
  )
}

// ─── Helper sub-components ───────────────────────────────────────────────────

function Row({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: small ? '9px' : '10px',
      fontWeight: bold ? 700 : 400,
      padding: '0',
      color: small ? '#666' : '#000',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function DashedLine() {
  return (
    <div style={{
      borderTop: '1px dashed #999',
      margin: '3px 0',
      height: 0,
    }} />
  )
}
