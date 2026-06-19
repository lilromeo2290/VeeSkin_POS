import { COMPANY_CONFIG } from '@/lib/company-config'
import { formatCurrency, formatCurrencyNegative } from '@/lib/currency'
import type { ReceiptOrder } from '@/components/pos/receipt'

/**
 * Generate a self-contained HTML document for the receipt, optimized for printing.
 *
 * Used by printReceipt() to populate a hidden iframe, which is then printed.
 * This avoids popup blockers entirely (unlike window.open) and prints reliably
 * across all browsers.
 *
 * The HTML matches the on-screen Receipt component exactly (same fields, same
 * order, same styling), so what you see on screen is what prints.
 */
export function generateReceiptHtml(order: ReceiptOrder): string {
  const paymentLabel =
    order.paymentMethod === 'CASH' ? 'Cash' :
    order.paymentMethod === 'MOMO' ? 'Mobile Money' :
    order.paymentMethod === 'CARD' ? 'Bank Card' :
    order.paymentMethod

  const dateStr = new Date(order.createdAt).toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Receipt ${order.orderNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', 'Monaco', monospace;
      background: white;
      color: #1a1410;
      padding: 4mm;
      width: 80mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt { font-size: 11px; line-height: 1.5; }
    .header { text-align: center; margin-bottom: 8px; }
    .header .name { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .header .tagline { font-size: 10px; color: #666; }
    .header .location { font-size: 10px; color: #666; white-space: pre-line; margin-top: 4px; }
    .header .contact { font-size: 10px; color: #666; margin-top: 2px; }
    .header .tin { font-size: 10px; color: #666; }
    .divider { border-top: 1px dashed #999; margin: 8px 0; }
    .meta { font-size: 11px; }
    .meta .row { display: flex; justify-content: space-between; margin: 1px 0; }
    .meta .label { color: #666; }
    .meta .value { font-weight: bold; text-align: right; }
    .items { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
    .items th { text-align: left; padding: 3px 0; border-bottom: 1px solid #ccc; font-size: 9px; text-transform: uppercase; color: #666; }
    .items td { padding: 2px 0; border-bottom: 1px dotted #ddd; }
    .items .qty { text-align: center; width: 28px; }
    .items .price, .items .amt { text-align: right; width: 58px; }
    .totals { font-size: 11px; margin-top: 4px; }
    .totals .row { display: flex; justify-content: space-between; margin: 1px 0; }
    .totals .label { color: #666; }
    .totals .grand { font-size: 13px; font-weight: bold; border-top: 2px solid #1a1410; padding-top: 4px; margin-top: 4px; }
    .totals .grand .value { color: #D4A574; }
    .payment { font-size: 11px; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #999; }
    .payment .row { display: flex; justify-content: space-between; margin: 1px 0; }
    .payment .label { color: #666; }
    .barcode-area { text-align: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #999; }
    .barcode-area svg { display: inline-block; }
    .barcode-number { font-family: 'Courier New', monospace; font-size: 12px; letter-spacing: 2px; font-weight: bold; margin-top: 2px; }
    .footer { text-align: center; font-size: 9px; color: #999; margin-top: 8px; }
    .footer p { margin: 1px 0; }
    @media print {
      body { width: auto; padding: 0; }
      @page { margin: 5mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="name">${escapeHtml(COMPANY_CONFIG.name)}</div>
      <div class="tagline">${escapeHtml(COMPANY_CONFIG.tagline)}</div>
      <div class="location">${escapeHtml(COMPANY_CONFIG.location)}</div>
      <div class="contact">Tel/WhatsApp: ${escapeHtml(COMPANY_CONFIG.phone)}</div>
      ${COMPANY_CONFIG.tin ? `<div class="tin">TIN: ${escapeHtml(COMPANY_CONFIG.tin)}</div>` : ''}
    </div>

    <div class="divider"></div>

    <div class="meta">
      <div class="row"><span class="label">Receipt No:</span><span class="value">${order.orderNumber}</span></div>
      <div class="row"><span class="label">Date &amp; Time:</span><span class="value">${dateStr}</span></div>
      <div class="row"><span class="label">Cashier:</span><span class="value">${escapeHtml(order.cashierName || '—')}</span></div>
      <div class="row"><span class="label">Customer:</span><span class="value">${escapeHtml(order.customerName || 'Walk-in')}</span></div>
    </div>

    <div class="divider"></div>

    <table class="items">
      <thead>
        <tr>
          <th>Item</th>
          <th class="qty">Qty</th>
          <th class="price">Price</th>
          <th class="amt">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="qty">${item.quantity}</td>
            <td class="price">${formatCurrency(item.price)}</td>
            <td class="amt">${formatCurrency(item.subtotal)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span class="label">Basic Amount:</span><span>${formatCurrency(order.subtotal)}</span></div>
      ${order.discount > 0 ? `
        <div class="row"><span class="label">Discount:</span><span>${formatCurrencyNegative(order.discount)}</span></div>
        <div class="row"><span class="label" style="font-size:9px">Taxable Amount:</span><span style="font-size:9px">${formatCurrency(order.taxableAmount)}</span></div>
      ` : ''}
      <div class="row"><span class="label" style="font-size:9px">NHIL @ 2.5%:</span><span style="font-size:9px">${formatCurrency(order.nhil)}</span></div>
      <div class="row"><span class="label" style="font-size:9px">GETFund @ 2.5%:</span><span style="font-size:9px">${formatCurrency(order.getfund)}</span></div>
      <div class="row"><span class="label" style="font-size:9px">VAT @ 10%:</span><span style="font-size:9px">${formatCurrency(order.vat)}</span></div>
      <div class="row grand"><span>GRAND TOTAL:</span><span class="value">${formatCurrency(order.total)}</span></div>
    </div>

    <div class="payment">
      <div class="row"><span class="label">Payment:</span><span style="font-weight:bold">${paymentLabel}</span></div>
      ${order.paymentMethod === 'CASH' ? `
        <div class="row"><span class="label">Amount Tendered:</span><span>${formatCurrency(order.amountTendered)}</span></div>
        <div class="row"><span class="label">Change Given:</span><span style="font-weight:bold">${formatCurrency(order.changeGiven)}</span></div>
      ` : ''}
    </div>

    <div class="barcode-area">
      <div style="font-size:8px;color:#666;margin-bottom:2px">Scan to verify receipt</div>
      ${generateBarcodeSvg(order.orderNumber)}
      <div class="barcode-number">${order.orderNumber}</div>
    </div>

    <div class="footer">
      <p>Thank you for shopping with ${escapeHtml(COMPANY_CONFIG.name)}!</p>
      <p>Goods sold are not returnable. Please keep your receipt.</p>
    </div>
  </div>
</body>
</html>`
}

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
 *
 * HOW IT WORKS:
 *   1. Create an invisible <iframe> in the main document
 *   2. Write the receipt HTML into the iframe's document
 *   3. Wait for the iframe to load (defer to ensure rendering)
 *   4. Call iframe.contentWindow.print() — opens print dialog with receipt
 *   5. Remove the iframe after the print dialog closes
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

  // Append to the document
  document.body.appendChild(iframe)

  // Write the receipt HTML into the iframe
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    console.error('Could not access iframe document')
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  // Wait for the iframe content to fully render before printing.
  // Using a setTimeout ensures the DOM is painted, which is more
  // reliable than onload for document.write'd content.
  setTimeout(() => {
    if (!iframe.contentWindow) {
      document.body.removeChild(iframe)
      return
    }

    // Trigger print on the iframe's window
    iframe.contentWindow.focus()
    iframe.contentWindow.print()

    // Remove the iframe after a delay to let the print dialog finish.
    // The afterprint event is more reliable but not universally supported,
    // so we use a timeout as a fallback.
    const cleanup = () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe)
      }
    }

    // Try afterprint event first (fires when print dialog closes)
    iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true })
    // Fallback: remove after 1 second if afterprint doesn't fire
    setTimeout(cleanup, 1000)
  }, 250)
}

/**
 * Generate a simple Code128-style barcode as inline SVG.
 *
 * For the print window/iframe, we use a lightweight SVG barcode generator
 * (rather than loading the JsBarcode library). This renders a visual barcode
 * using the order number's character codes.
 *
 * Note: This is a simplified visual barcode. For actual scanning,
 * the order number text is printed below it, and the public API endpoint
 * /api/receipts/[orderNumber] returns the full receipt data.
 */
function generateBarcodeSvg(value: string): string {
  const bars: string[] = []
  let x = 0
  const barWidth = 1.5
  const height = 40

  // Start bar
  bars.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#1a1410"/>`)
  x += barWidth * 3

  // Encode each character
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
        bars.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#1a1410"/>`)
      }
      x += w
    }
  }

  // End bar
  bars.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#1a1410"/>`)
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
