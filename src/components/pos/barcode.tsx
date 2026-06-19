'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeProps {
  value: string
  /** Display width of the barcode in px. Height is auto. */
  width?: number
  height?: number
  /** Show the human-readable value below the barcode */
  displayValue?: boolean
  className?: string
}

/**
 * Renders a Code128 barcode using JsBarcode.
 * Code128 can encode alphanumeric characters (A-Z, 0-9, and some symbols).
 * The order number (e.g., "ORD-01025") encodes cleanly.
 */
export function Barcode({
  value,
  width = 2,
  height = 50,
  displayValue = true,
  className,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize: 12,
          margin: 4,
          background: 'transparent',
          lineColor: '#1a1410',
        })
      } catch (e) {
        console.error('Barcode generation failed:', e)
      }
    }
  }, [value, width, height, displayValue])

  return (
    <svg
      ref={svgRef}
      className={className}
      role="img"
      aria-label={`Barcode: ${value}`}
    />
  )
}
