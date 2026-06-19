import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Clean existing data
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()

    // Create categories for skincare & perfume boutique
    const categories = await db.$transaction([
      db.category.create({ data: { name: 'Cleansers', icon: 'Droplets', color: '#E6A9B6' } }),
      db.category.create({ data: { name: 'Serums', icon: 'FlaskConical', color: '#D4A574' } }),
      db.category.create({ data: { name: 'Moisturizers', icon: 'FlaskRound', color: '#D4AF37' } }),
      db.category.create({ data: { name: 'Masks', icon: 'Sparkles', color: '#C77B8E' } }),
      db.category.create({ data: { name: 'Perfumes', icon: 'Flower2', color: '#A67C52' } }),
      db.category.create({ data: { name: 'Body Care', icon: 'Hand', color: '#B89A7A' } }),
    ])

    const [cleansers, serums, moisturizers, masks, perfumes, bodyCare] = categories

    // Create products — skincare & perfume boutique catalog
    const products = [
      // Cleansers
      { name: 'Rose Gel Cleanser', sku: 'CLS-001', price: 28.0, cost: 8.5, stock: 60, categoryId: cleansers.id, description: 'Gentle rose-infused gel cleanser' },
      { name: 'Micellar Water', sku: 'CLS-002', price: 22.0, cost: 6.5, stock: 75, categoryId: cleansers.id, description: 'Soothing micellar cleansing water' },
      { name: 'Foaming Milk Cleanser', sku: 'CLS-003', price: 26.0, cost: 7.5, stock: 50, categoryId: cleansers.id, description: 'Creamy milk-to-foam cleanser' },
      { name: 'Exfoliating Polish', sku: 'CLS-004', price: 38.0, cost: 11.0, stock: 35, categoryId: cleansers.id, description: 'Weekly enzymatic exfoliator' },
      { name: 'Cleansing Balm', sku: 'CLS-005', price: 42.0, cost: 12.5, stock: 30, categoryId: cleansers.id, description: 'Melting cleansing balm with botanical oils' },
      { name: 'Eye Makeup Remover', sku: 'CLS-006', price: 18.0, cost: 5.0, stock: 80, categoryId: cleansers.id, description: 'Gentle dual-phase eye makeup remover' },
      // Serums
      { name: 'Vitamin C Brightening Serum', sku: 'SER-001', price: 68.0, cost: 18.0, stock: 40, categoryId: serums.id, description: '20% Vitamin C with ferulic acid' },
      { name: 'Hyaluronic Hydration Serum', sku: 'SER-002', price: 54.0, cost: 14.0, stock: 55, categoryId: serums.id, description: 'Multi-weight hyaluronic acid serum' },
      { name: 'Retinol Renewal Serum', sku: 'SER-003', price: 78.0, cost: 22.0, stock: 30, categoryId: serums.id, description: '0.5% encapsulated retinol' },
      { name: 'Niacinamide Pore Serum', sku: 'SER-004', price: 42.0, cost: 11.5, stock: 45, categoryId: serums.id, description: '10% niacinamide + zinc' },
      { name: 'Peptide Firming Serum', sku: 'SER-005', price: 92.0, cost: 28.0, stock: 22, categoryId: serums.id, description: 'Multi-peptide complex for firmness' },
      { name: 'Rose Hip Facial Oil', sku: 'SER-006', price: 48.0, cost: 13.5, stock: 38, categoryId: serums.id, description: 'Cold-pressed rose hip seed oil' },
      // Moisturizers
      { name: 'Daily Dew Moisturizer', sku: 'MOI-001', price: 52.0, cost: 14.0, stock: 50, categoryId: moisturizers.id, description: 'Lightweight gel-cream moisturizer' },
      { name: 'Rich Night Cream', sku: 'MOI-002', price: 72.0, cost: 20.0, stock: 35, categoryId: moisturizers.id, description: 'Restorative overnight nourishing cream' },
      { name: 'Eye Contour Cream', sku: 'MOI-003', price: 58.0, cost: 16.0, stock: 40, categoryId: moisturizers.id, description: 'Brightening eye cream with caffeine' },
      { name: 'SPF 30 Tinted Moisturizer', sku: 'MOI-004', price: 48.0, cost: 13.5, stock: 45, categoryId: moisturizers.id, description: 'Tinted moisturizer with broad-spectrum SPF' },
      { name: 'Neck & Décolleté Cream', sku: 'MOI-005', price: 82.0, cost: 24.0, stock: 25, categoryId: moisturizers.id, description: 'Firming cream for neck and chest' },
      // Masks
      { name: 'Rose Petal Sheet Mask', sku: 'MSK-001', price: 12.0, cost: 3.0, stock: 100, categoryId: masks.id, description: 'Single-use hydrating rose sheet mask' },
      { name: 'Clay Detox Mask', sku: 'MSK-002', price: 36.0, cost: 9.5, stock: 40, categoryId: masks.id, description: 'Kaolin + bentonite purifying mask' },
      { name: 'Overnight Sleeping Mask', sku: 'MSK-003', price: 48.0, cost: 13.0, stock: 35, categoryId: masks.id, description: 'Gel sleeping mask for intense hydration' },
      { name: 'Gold Eye Patches', sku: 'MSK-004', price: 28.0, cost: 7.5, stock: 60, categoryId: masks.id, description: 'Set of 5 gold-infused eye patches' },
      { name: 'Enzyme Peel Mask', sku: 'MSK-005', price: 44.0, cost: 12.0, stock: 30, categoryId: masks.id, description: 'Papaya enzyme radiance mask' },
      // Perfumes
      { name: 'Rose Gold Eau de Parfum', sku: 'PRF-001', price: 145.0, cost: 38.0, stock: 25, categoryId: perfumes.id, description: '50ml — Damask rose, amber, sandalwood' },
      { name: 'Pink Petals Eau de Toilette', sku: 'PRF-002', price: 98.0, cost: 26.0, stock: 35, categoryId: perfumes.id, description: '50ml — Peony, lychee, white musk' },
      { name: 'Velvet Oud Parfum', sku: 'PRF-003', price: 220.0, cost: 65.0, stock: 15, categoryId: perfumes.id, description: '50ml — Oud, bergamot, vanilla' },
      { name: 'Citrus Blossom EDT', sku: 'PRF-004', price: 88.0, cost: 22.0, stock: 40, categoryId: perfumes.id, description: '50ml — Neroli, bergamot, jasmine' },
      { name: 'Vanilla Musk EDP', sku: 'PRF-005', price: 125.0, cost: 32.0, stock: 30, categoryId: perfumes.id, description: '50ml — Madagascar vanilla, musk, cedar' },
      { name: 'Travel Spray Trio', sku: 'PRF-006', price: 75.0, cost: 22.0, stock: 45, categoryId: perfumes.id, description: '3 × 10ml travel sprays' },
      { name: 'Solid Perfume Compact', sku: 'PRF-007', price: 52.0, cost: 14.0, stock: 50, categoryId: perfumes.id, description: 'Refillable rose solid perfume' },
      // Body Care
      { name: 'Rose Body Lotion', sku: 'BDY-001', price: 32.0, cost: 8.5, stock: 60, categoryId: bodyCare.id, description: '200ml — Nourishing rose-scented body lotion' },
      { name: 'Sugar Body Scrub', sku: 'BDY-002', price: 38.0, cost: 10.0, stock: 45, categoryId: bodyCare.id, description: '200ml — Brown sugar & vanilla scrub' },
      { name: 'Hand Cream Deluxe', sku: 'BDY-003', price: 22.0, cost: 5.5, stock: 80, categoryId: bodyCare.id, description: '75ml — Shea butter hand cream' },
      { name: 'Body Oil Gold Shimmer', sku: 'BDY-004', price: 48.0, cost: 13.0, stock: 35, categoryId: bodyCare.id, description: '150ml — Luminous dry body oil' },
      { name: 'Bath Soak Rose Petals', sku: 'BDY-005', price: 28.0, cost: 7.0, stock: 50, categoryId: bodyCare.id, description: '300g — Mineral bath soak with rose petals' },
      { name: 'Lip Treatment Balm', sku: 'BDY-006', price: 18.0, cost: 4.5, stock: 90, categoryId: bodyCare.id, description: '15ml — Plumping lip balm with peptides' },
    ]

    for (const p of products) {
      await db.product.create({ data: p })
    }

    // Create some sample orders
    const allProducts = await db.product.findMany()
    const paymentMethods = ['CASH', 'CARD', 'DIGITAL']
    const now = new Date()

    for (let i = 0; i < 25; i++) {
      const itemCount = Math.floor(Math.random() * 3) + 1
      const selectedItems: typeof allProducts = []
      for (let j = 0; j < itemCount; j++) {
        const random = allProducts[Math.floor(Math.random() * allProducts.length)]
        if (random && !selectedItems.find((s) => s.id === random.id)) {
          selectedItems.push(random)
        }
      }
      if (selectedItems.length === 0) continue

      const items = selectedItems.map((p) => {
        const qty = Math.floor(Math.random() * 2) + 1
        return {
          name: p.name,
          price: p.price,
          quantity: qty,
          subtotal: p.price * qty,
          productId: p.id,
        }
      })
      const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
      const tax = Math.round(subtotal * 0.08 * 100) / 100
      const total = Math.round((subtotal + tax) * 100) / 100

      const daysAgo = Math.floor(Math.random() * 7)
      const createdAt = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000))

      await db.order.create({
        data: {
          orderNumber: `ORD-${String(1000 + i).padStart(5, '0')}`,
          status: 'COMPLETED',
          paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          subtotal,
          tax,
          total,
          itemsCount: items.reduce((s, it) => s + it.quantity, 0),
          cashierName: 'Boutique Staff',
          createdAt,
          items: { create: items },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${categories.length} categories, ${products.length} products, and 25 sample orders`,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed data', detail: String(error) }, { status: 500 })
  }
}
