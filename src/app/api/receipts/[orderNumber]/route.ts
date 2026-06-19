import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCompanyInfo } from '@/lib/company-config'

/**
 * GET /api/receipts/[orderNumber]
 *
 * PUBLIC endpoint — no authentication required.
 * Returns the full receipt data for a given order number.
 *
 * This is the endpoint that gets called when someone scans the barcode
 * on a printed receipt. The barcode encodes the order number, and this
 * API returns all the details needed to display or verify the receipt.
 *
 * Supports two response formats via the `?format=` query param:
 *   - format=json (default): Returns JSON data
 *   - format=html: Returns a printable HTML receipt page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Normalize: accept ORD-01025 or 01025
    const normalized = orderNumber.toUpperCase().startsWith('ORD-')
      ? orderNumber.toUpperCase()
      : `ORD-${orderNumber.toUpperCase()}`

    const order = await db.order.findUnique({
      where: { orderNumber: normalized },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Receipt not found', orderNumber: normalized },
        { status: 404 }
      )
    }

    const company = await getCompanyInfo()

    const receiptData = {
      company,
      receipt: {
        receiptNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        dateFormatted: order.createdAt.toLocaleString('en-GH', {
          dateStyle: 'full',
          timeStyle: 'short',
        }),
        cashier: order.cashierName || 'Unknown',
        customer: order.customerName || 'Walk-in Customer',
        status: order.status,
        paymentMethod: order.paymentMethod,
        amountTendered: order.amountTendered,
        changeGiven: order.changeGiven,
      },
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        basicAmount: item.subtotal,
      })),
      totals: {
        basicAmount: order.subtotal,
        discount: order.discount,
        taxableAmount: order.taxableAmount,
        nhil: order.nhil,
        getfund: order.getfund,
        vat: order.vat,
        totalTax: order.tax,
        grandTotal: order.total,
      },
      barcode: order.orderNumber, // What the barcode encodes
    }

    if (format === 'html') {
      return new NextResponse(renderHtmlReceipt(receiptData), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return NextResponse.json(receiptData)
  } catch (error) {
    console.error('GET receipt error:', error)
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 })
  }
}

/**
 * Render a self-contained, printable HTML receipt page.
 * This is what a customer sees when they scan the barcode with their phone.
 */
function renderHtmlReceipt(data: {
  company: Awaited<ReturnType<typeof getCompanyInfo>>
  receipt: {
    receiptNumber: string
    dateFormatted: string
    cashier: string
    customer: string
    paymentMethod: string
    amountTendered: number
    changeGiven: number
  }
  items: { name: string; quantity: number; unitPrice: number; basicAmount: number }[]
  totals: {
    basicAmount: number
    discount: number
    taxableAmount: number
    nhil: number
    getfund: number
    vat: number
    totalTax: number
    grandTotal: number
  }
  barcode: string
}): string {
  const { company, receipt, items, totals, barcode } = data
  const paymentLabel = receipt.paymentMethod === 'CASH'
    ? 'Cash'
    : receipt.paymentMethod === 'MOMO'
    ? 'Mobile Money'
    : 'Bank Card'

  const money = (n: number) => `GH₵${n.toFixed(2)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${receipt.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .receipt {
      background: white;
      max-width: 380px;
      width: 100%;
      padding: 24px 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 20px; color: #1a1410; margin-bottom: 4px; }
    .header .tagline { font-size: 11px; color: #666; }
    .header .location { font-size: 11px; color: #666; white-space: pre-line; margin-top: 6px; }
    .header .contact { font-size: 11px; color: #666; margin-top: 4px; }
    .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
    .meta { font-size: 11px; line-height: 1.8; }
    .meta .row { display: flex; justify-content: space-between; }
    .meta .label { color: #666; }
    .meta .value { font-weight: bold; }
    .items { width: 100%; font-size: 11px; border-collapse: collapse; margin: 8px 0; }
    .items th { text-align: left; padding: 4px 2px; border-bottom: 1px solid #ddd; font-size: 10px; text-transform: uppercase; }
    .items td { padding: 4px 2px; border-bottom: 1px dotted #eee; }
    .items .num { text-align: right; }
    .items .qty { text-align: center; }
    .totals { font-size: 11px; margin-top: 8px; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .grand { font-size: 14px; font-weight: bold; border-top: 2px solid #1a1410; padding-top: 6px; margin-top: 4px; }
    .totals .grand .value { color: #D4A574; }
    .payment { font-size: 11px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #ccc; }
    .payment .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .barcode-area { text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #ccc; }
    .barcode-number { font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 3px; font-weight: bold; margin-top: 4px; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 16px; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${company.name}</h1>
      <div class="tagline">${company.tagline}</div>
      <div class="location">${company.address}</div>
      <div class="contact">Tel/WhatsApp: ${company.phone}</div>
    </div>
    <div class="divider"></div>
    <div class="meta">
      <div class="row"><span class="label">Receipt No:</span><span class="value">${receipt.receiptNumber}</span></div>
      <div class="row"><span class="label">Date &amp; Time:</span><span class="value">${receipt.dateFormatted}</span></div>
      <div class="row"><span class="label">Cashier:</span><span class="value">${receipt.cashier}</span></div>
      <div class="row"><span class="label">Customer:</span><span class="value">${receipt.customer}</span></div>
    </div>
    <div class="divider"></div>
    <table class="items">
      <thead>
        <tr>
          <th>Item</th>
          <th class="qty">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="qty">${item.quantity}</td>
            <td class="num">${money(item.unitPrice)}</td>
            <td class="num">${money(item.basicAmount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Basic Amount:</span><span>${money(totals.basicAmount)}</span></div>
      ${totals.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${money(totals.discount)}</span></div>` : ''}
      <div class="row"><span>Taxable Amount:</span><span>${money(totals.taxableAmount)}</span></div>
      <div class="row"><span>NHIL @ 2.5%:</span><span>${money(totals.nhil)}</span></div>
      <div class="row"><span>GETFund @ 2.5%:</span><span>${money(totals.getfund)}</span></div>
      <div class="row"><span>VAT @ 10%:</span><span>${money(totals.vat)}</span></div>
      <div class="row grand"><span>GRAND TOTAL:</span><span class="value">${money(totals.grandTotal)}</span></div>
    </div>
    <div class="payment">
      <div class="row"><span>Payment Method:</span><span><strong>${paymentLabel}</strong></span></div>
      ${receipt.paymentMethod === 'CASH' ? `
        <div class="row"><span>Amount Tendered:</span><span>${money(receipt.amountTendered)}</span></div>
        <div class="row"><span>Change Given:</span><span>${money(receipt.changeGiven)}</span></div>
      ` : ''}
    </div>
    <div class="barcode-area">
      <div style="font-size:10px;color:#666;margin-bottom:4px;">Scan to verify receipt</div>
      <div class="barcode-number">*${barcode}*</div>
      <div style="font-size:9px;color:#999;margin-top:4px;">${barcode}</div>
    </div>
    <div class="footer">
      ${company.footerMessage}<br>
      ${company.refundPolicy}
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
