'use client'

import { useEffect, useState } from 'react'
import { Barcode } from '@/components/pos/barcode'
import { formatCurrency, formatCurrencyNegative } from '@/lib/currency'
import { COMPANY_CONFIG, fetchCompanyInfo, type CompanyInfo } from '@/lib/company-config'

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
  notes: string | null
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
  showVerifyHint?: boolean
  className?: string
}

/**
 * Shared Receipt component — thermal printer format.
 * Fetches the live company info from the database (editable via Settings).
 */
export function Receipt({ order, showVerifyHint = true, className }: ReceiptProps) {
  const [company, setCompany] = useState<CompanyInfo>(COMPANY_CONFIG)

  useEffect(() => {
    fetchCompanyInfo().then(setCompany)
  }, [])

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
      {/* ─── Store header ─── */}
      <div className="text-center" style={{ marginBottom: '4px' }}>
        {company.logoUrl && (
          <div style={{ marginBottom: '4px' }}>
            <img src={company.logoUrl} alt="logo" style={{ maxHeight: '50px', maxWidth: '100%' }} />
          </div>
        )}
        <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>
          {company.name.toUpperCase()}
        </div>
        {company.tagline && (
          <div style={{ fontSize: '10px', color: '#555' }}>{company.tagline}</div>
        )}
        <div style={{ fontSize: '10px', color: '#555', whiteSpace: 'pre-line' }}>
          {company.address}
        </div>
        <div style={{ fontSize: '10px', color: '#555' }}>
          Tel: {company.phone}
        </div>
        {company.tin && (
          <div style={{ fontSize: '10px', color: '#555' }}>TIN: {company.tin}</div>
        )}
      </div>

      <DashedLine />

      {/* ─── Receipt meta ─── */}
      <div style={{ marginBottom: '2px' }}>
        <Row label="Receipt No:" value={order.orderNumber} bold />
        <Row label="Date:" value={new Date(order.createdAt).toLocaleDateString('en-GB')} />
        <Row label="Time:" value={new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
        <Row label="Cashier:" value={order.cashierName || '—'} />
        <Row label="Customer:" value={order.customerName || 'Walk-in'} />
        {order.notes && order.notes.includes('Customer Phone:') && (
          <Row label="Phone:" value={order.notes.replace('Customer Phone:', '').trim()} />
        )}
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
        <Row label={`NHIL (${(company.nhilRate * 100).toFixed(1)}%):`} value={formatCurrency(order.nhil)} small />
        <Row label={`GETFund (${(company.getfundRate * 100).toFixed(1)}%):`} value={formatCurrency(order.getfund)} small />
        <Row label={`VAT (${(company.vatRate * 100).toFixed(1)}%):`} value={formatCurrency(order.vat)} small />
      </div>

      {/* Grand total */}
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
        <div style={{ fontWeight: 600 }}>{company.footerMessage.toUpperCase()}</div>
        <div>{company.refundPolicy}</div>
        <div>Please keep your receipt.</div>
      </div>

      <DashedLine />
    </div>
  )
}

function Row({ label, value, bold, small }: { label: string; value: string; bold?: boolean; small?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: small ? '9px' : '10px',
      fontWeight: bold ? 700 : 400,
      color: small ? '#666' : '#000',
    }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function DashedLine() {
  return <div style={{ borderTop: '1px dashed #999', margin: '3px 0', height: 0 }} />
}
