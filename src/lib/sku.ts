import { db } from '@/lib/db'

/**
 * SKU Generation Utility
 *
 * Generates a human-readable SKU from product attributes:
 *   [BRAND]-[NAME]-[SIZE]-[COLOR]-[NUMBER]
 *
 * Examples:
 *   name="Rose Gel Cleanser", brand="VeeSkin", size="100ml", color="—"
 *     → VEE-RGC-100-001
 *
 *   name="Vitamin C Serum", brand="VeeSkin", size="30ml", color="Clear"
 *     → VEE-VCS-30-CLR-002
 *
 * Rules:
 *   - Each attribute is abbreviated to 3 uppercase letters (first 3 consonants/vowels)
 *   - Non-alphanumeric characters are removed
 *   - A sequential number is appended to guarantee uniqueness
 *   - If the generated SKU already exists, the number is incremented
 */

/**
 * Generate a slug from a string: take first 3 alphanumeric chars, uppercase.
 * Falls back to "XX" if the string is empty.
 *
 * Examples:
 *   "VeeSkin"     → "VEE"
 *   "Rose Gel"    → "ROS"
 *   "100ml"       → "100"
 *   "Clear"       → "CLE"
 *   ""            → "XX"
 */
function slug3(input: string | null | undefined): string {
  if (!input) return 'XX'
  // Remove non-alphanumeric, uppercase, take first 3 chars
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (cleaned.length === 0) return 'XX'
  if (cleaned.length <= 3) return cleaned
  return cleaned.substring(0, 3)
}

/**
 * Generate a unique SKU from product attributes.
 *
 * @param name   - Product name (e.g., "Rose Gel Cleanser")
 * @param brand  - Brand (e.g., "VeeSkin")
 * @param size   - Size (e.g., "100ml")
 * @param color  - Color (e.g., "Clear")
 * @param excludeId - Optional product ID to exclude from uniqueness check (for edits)
 * @returns A unique SKU string
 */
export async function generateSku(
  name: string,
  brand?: string | null,
  size?: string | null,
  color?: string | null,
  excludeId?: string
): Promise<string> {
  const brandSlug = slug3(brand)
  const nameSlug = slug3(name)
  const sizeSlug = slug3(size)
  const colorSlug = color ? slug3(color) : null

  // Build the base SKU (without the sequence number)
  const parts = [brandSlug, nameSlug, sizeSlug]
  if (colorSlug) parts.push(colorSlug)
  const base = parts.join('-')

  // Find the next available sequence number
  // Look for existing SKUs that start with this base pattern
  const existingSkus = await db.product.findMany({
    where: {
      sku: { startsWith: base },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { sku: true },
  })

  // Extract the sequence numbers from existing SKUs
  const usedNumbers = new Set<number>()
  for (const { sku } of existingSkus) {
    const match = sku.match(new RegExp(`^${escapeRegex(base)}-(\\d+)$`))
    if (match) {
      usedNumbers.add(parseInt(match[1], 10))
    }
  }

  // Find the next available number (starting from 1)
  let seq = 1
  while (usedNumbers.has(seq)) {
    seq++
  }

  return `${base}-${String(seq).padStart(3, '0')}`
}

/**
 * Preview the SKU that would be generated (without the sequence number).
 * Used in the UI to show the user what their SKU will look like before saving.
 *
 * @returns The base SKU pattern (e.g., "VEE-RGC-100") without the sequence number
 */
export function previewSku(
  name: string,
  brand?: string | null,
  size?: string | null,
  color?: string | null
): string {
  const brandSlug = slug3(brand)
  const nameSlug = slug3(name)
  const sizeSlug = slug3(size)
  const colorSlug = color ? slug3(color) : null

  const parts = [brandSlug, nameSlug, sizeSlug]
  if (colorSlug) parts.push(colorSlug)
  const base = parts.join('-')

  return `${base}-001` // Show 001 as the preview sequence
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
