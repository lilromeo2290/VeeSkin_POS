import { COMPANY_CONFIG } from '@/lib/company-config'
import { formatCurrency, formatCurrencyNegative } from '@/lib/currency'
import type { ReceiptOrder } from '@/components/pos/receipt'

/**
 * Generate a self-contained HTML document for the receipt in THERMAL PRINTER format.
 *
 * Thermal receipt characteristics:
 *   - 80mm width (standard thermal paper roll)
 *   - Monospace font
 *   - No colored backgrounds, no rounded borders, no shadows
 *   - Tight line spacing to save paper
 *   - Dashed separators (cut lines)
 *   - Center-aligned header/footer, right-aligned amounts
 *
 * Used by printReceipt() to populate a hidden iframe for printing.
 */
export function generateReceiptHtml(order: ReceiptOrder): string {
  const paymentLabel =
    order.paymentMethod === 'CASH' ? 'CASH' :
    order.paymentMethod === 'MOMO' ? 'MOBILE MONEY' :
    order.paymentMethod === 'CARD' ? 'BANK CARD' :
    order.paymentMethod

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-GB')
  const timeStr = new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Courier New', 'Monaco', 'Liberation Mono', monospace;
      background: white;
      color: #000;
      width: 80mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt { padding: 3mm 2mm; font-size: 11px; line-height: 1.4; }

    /* Header */
    .header { text-align: center; margin-bottom: 2px; }
    .header .name { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }
    .header .tagline { font-size: 10px; color: #555; }
    .header .location { font-size: 10px; color: #555; white-space: pre-line; }
    .header .contact { font-size: 10px; color: #555; }
    .header .tin { font-size: 10px; color: #555; }

    /* Cut lines */
    .cut { border-top: 1px dashed #999; margin: 3px 0; height: 0; }

    /* Meta rows */
    .row { display: flex; justify-content: space-between; font-size: 10px; padding: 0; }
    .row.small { font-size: 9px; color: #666; }
    .row.bold { font-weight: bold; }

    /* Column headers */
    .col-header { display: flex; font-size: 9px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px; }
    .col-header .item { flex: 1; }
    .col-header .qty { width: 28px; text-align: center; }
    .col-header .price { width: 55px; text-align: right; }
    .col-header .total { width: 60px; text-align: right; }

    /* Items */
    .item-row { display: flex; font-size: 10px; padding: 1px 0; align-items: flex-start; }
    .item-row .name { flex: 1; padding-right: 4px; }
    .item-row .qty { width: 28px; text-align: center; }
    .item-row .price { width: 55px; text-align: right; }
    .item-row .total { width: 60px; text-align: right; font-weight: 600; }

    /* Grand total */
    .grand { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 4px 0; margin: 2px 0; }
    .grand .value { color: #D4A574; }

    /* Barcode */
    .barcode { text-align: center; padding: 4px 0; }
    .barcode .hint { font-size: 8px; color: #666; margin-bottom: 2px; }
    .barcode .verify { font-size: 8px; color: #999; margin-top: 2px; }

    /* Footer */
    .footer { text-align: center; font-size: 9px; color: #666; padding: 2px 0; }
    .footer .thanks { font-weight: 600; }

    @media print {
      html, body { width: auto; }
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Store header -->
    <div class="header">
      <div class="name">${escapeHtml(COMPANY_CONFIG.name.toUpperCase())}</div>
      <div class="tagline">${escapeHtml(COMPANY_CONFIG.tagline)}</div>
      <div class="location">${escapeHtml(COMPANY_CONFIG.location)}</div>
      <div class="contact">Tel: ${escapeHtml(COMPANY_CONFIG.phone)}</div>
      ${COMPANY_CONFIG.tin ? `<div class="tin">TIN: ${escapeHtml(COMPANY_CONFIG.tin)}</div>` : ''}
    </div>

    <div class="cut"></div>

    <!-- Receipt meta -->
    <div class="row bold"><span>Receipt No:</span><span>${order.orderNumber}</span></div>
    <div class="row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="row"><span>Time:</span><span>${timeStr}</span></div>
    <div class="row"><span>Cashier:</span><span>${escapeHtml(order.cashierName || '—')}</span></div>
    <div class="row"><span>Customer:</span><span>${escapeHtml(order.customerName || 'Walk-in')}</span></div>

    <div class="cut"></div>

    <!-- Column headers -->
    <div class="col-header">
      <span class="item">Item</span>
      <span class="qty">Qty</span>
      <span class="price">Price</span>
      <span class="total">Total</span>
    </div>

    <!-- Items -->
    ${order.items.map((item) => `
      <div class="item-row">
        <span class="name">${escapeHtml(item.name)}</span>
        <span class="qty">${item.quantity}</span>
        <span class="price">${formatCurrency(item.price)}</span>
        <span class="total">${formatCurrency(item.subtotal)}</span>
      </div>
    `).join('')}

    <div class="cut"></div>

    <!-- Totals -->
    <div class="row"><span>Basic Amount:</span><span>${formatCurrency(order.subtotal)}</span></div>
    ${order.discount > 0 ? `
      <div class="row"><span>Discount:</span><span>${formatCurrencyNegative(order.discount)}</span></div>
      <div class="row small"><span>Taxable Amt:</span><span>${formatCurrency(order.taxableAmount)}</span></div>
    ` : ''}
    <div class="row small"><span>NHIL (2.5%):</span><span>${formatCurrency(order.nhil)}</span></div>
    <div class="row small"><span>GETFund (2.5%):</span><span>${formatCurrency(order.getfund)}</span></div>
    <div class="row small"><span>VAT (10%):</span><span>${formatCurrency(order.vat)}</span></div>

    <!-- Grand total -->
    <div class="grand">
      <span>GRAND TOTAL</span>
      <span class="value">${formatCurrency(order.total)}</span>
    </div>

    <!-- Payment info -->
    <div class="row bold"><span>Payment:</span><span>${paymentLabel}</span></div>
    ${order.paymentMethod === 'CASH' ? `
      <div class="row"><span>Tendered:</span><span>${formatCurrency(order.amountTendered)}</span></div>
      <div class="row bold"><span>Change:</span><span>${formatCurrency(order.changeGiven)}</span></div>
    ` : ''}

    <div class="cut"></div>

    <!-- Barcode -->
    <div class="barcode">
      <div class="hint">SCAN TO VERIFY</div>
      ${generateBarcodeSvg(order.orderNumber)}
      ${showVerifyHint ? `<div class="verify">/api/receipts/${order.orderNumber}</div>` : ''}
    </div>

    <div class="cut"></div>

    <!-- Footer -->
    <div class="footer">
      <div class="thanks">THANK YOU!</div>
      <div>Goods sold are not returnable.</div>
      <div>Please keep your receipt.</div>
    </div>

    <div class="cut"></div>
  </div>
</body>
</html>`
}

const showVerifyHint = true

/**
 * Print a receipt using a hidden iframe.
 *
 * WHY IFRAME (not window.open):
 *   - Popup blockers in Chrome/Firefox/Safari block window.open() when not
 *     triggered by a direct user gesture chain. In POS workflows, the print
 *     call happens after async API responses, which breaks the gesture chain
 *     and causes the popup to be silently blocked.
 *   - A hidden iframe is never blocked because it's part of the same document.
 *   - Printing an iframe's contentWindow triggers the browser's native print
 *     dialog with ONLY the iframe's content (the receipt), not the main page.
 */
export function printReceipt(order: ReceiptOrder): void {
  const html = generateReceiptHtml(order)

  // Create a hidden iframe
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.style.visibility = 'hidden'

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    console.error('Could not access iframe document')
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  // Wait for the iframe content to fully render before printing
  setTimeout(() => {
    if (!iframe.contentWindow) {
      document.body.removeChild(iframe)
      return
    }

    iframe.contentWindow.focus()
    iframe.contentWindow.print()

    const cleanup = () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    }

    iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true })
    setTimeout(cleanup, 1000)
  }, 250)
}

/**
 * Generate a Code128-style barcode as inline SVG.
 */
function generateBarcodeSvg(value: string): string {
  const bars: string[] = []
  let x = 0
  const barWidth = 1.5
  const height = 36

  bars.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#000"/>`)
  x += barWidth * 3

  for (const char of value) {
    const code = char.charCodeAt(0)
    const pattern = [
      (code & 0x03) + 1,
      ((code >> 2) & 0x03) + 1,
      ((code >> 4) & 0x03) + 1,
      ((code >> 6) & 0x03) + 1,
    ]
    for (let i = 0; i < 4; i++) {
      const w = pattern[i] * barWidth
      if (i % 2 === 0) {
        bars.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`)
      }
      x += w
    }
  }

  bars.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#000"/>`)
  x += barWidth * 3

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height}" viewBox="0 0 ${x} ${height}">${bars.join('')}</svg>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
