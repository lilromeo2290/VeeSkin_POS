import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, requirePermission, AuthError } from '@/lib/auth'
import { calculateTax } from '@/lib/tax'
import { generateSku } from '@/lib/sku'

export async function POST() {
  try {
    // Only admin can reseed (it wipes all data including users)
    await requirePermission('userCreate')

    // Clean existing data
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()
    await db.user.deleteMany()

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
    // SKU is auto-generated from name + brand + size + color (via generateSku utility)
    const products = [
      // Cleansers
      { name: 'Rose Gel Cleanser', brand: 'VeeSkin', size: '150ml', color: 'Pink', price: 120, cost: 45, stock: 60, categoryId: cleansers.id, description: 'Gentle rose-infused gel cleanser' },
      { name: 'Micellar Water', brand: 'VeeSkin', size: '200ml', color: 'Clear', price: 95, cost: 32, stock: 75, categoryId: cleansers.id, description: 'Soothing micellar cleansing water' },
      { name: 'Foaming Milk Cleanser', brand: 'VeeSkin', size: '150ml', color: 'White', price: 110, cost: 38, stock: 50, categoryId: cleansers.id, description: 'Creamy milk-to-foam cleanser' },
      { name: 'Exfoliating Polish', brand: 'VeeSkin', size: '100ml', color: 'Brown', price: 165, cost: 55, stock: 35, categoryId: cleansers.id, description: 'Weekly enzymatic exfoliator' },
      { name: 'Cleansing Balm', brand: 'VeeSkin', size: '100ml', color: 'Gold', price: 180, cost: 60, stock: 30, categoryId: cleansers.id, description: 'Melting cleansing balm with botanical oils' },
      { name: 'Eye Makeup Remover', brand: 'VeeSkin', size: '100ml', color: 'Clear', price: 75, cost: 25, stock: 80, categoryId: cleansers.id, description: 'Gentle dual-phase eye makeup remover' },
      // Serums
      { name: 'Vitamin C Brightening Serum', brand: 'VeeSkin', size: '30ml', color: 'Orange', price: 320, cost: 90, stock: 40, categoryId: serums.id, description: '20% Vitamin C with ferulic acid' },
      { name: 'Hyaluronic Hydration Serum', brand: 'VeeSkin', size: '30ml', color: 'Clear', price: 250, cost: 70, stock: 55, categoryId: serums.id, description: 'Multi-weight hyaluronic acid serum' },
      { name: 'Retinol Renewal Serum', brand: 'VeeSkin', size: '30ml', color: 'Yellow', price: 380, cost: 110, stock: 30, categoryId: serums.id, description: '0.5% encapsulated retinol' },
      { name: 'Niacinamide Pore Serum', brand: 'VeeSkin', size: '30ml', color: 'Clear', price: 195, cost: 58, stock: 45, categoryId: serums.id, description: '10% niacinamide + zinc' },
      { name: 'Peptide Firming Serum', brand: 'VeeSkin', size: '30ml', color: 'Clear', price: 450, cost: 140, stock: 22, categoryId: serums.id, description: 'Multi-peptide complex for firmness' },
      { name: 'Rose Hip Facial Oil', brand: 'VeeSkin', size: '30ml', color: 'Amber', price: 220, cost: 68, stock: 38, categoryId: serums.id, description: 'Cold-pressed rose hip seed oil' },
      // Moisturizers
      { name: 'Daily Dew Moisturizer', brand: 'VeeSkin', size: '50ml', color: 'White', price: 240, cost: 70, stock: 50, categoryId: moisturizers.id, description: 'Lightweight gel-cream moisturizer' },
      { name: 'Rich Night Cream', brand: 'VeeSkin', size: '50ml', color: 'White', price: 340, cost: 100, stock: 35, categoryId: moisturizers.id, description: 'Restorative overnight nourishing cream' },
      { name: 'Eye Contour Cream', brand: 'VeeSkin', size: '15ml', color: 'White', price: 275, cost: 80, stock: 40, categoryId: moisturizers.id, description: 'Brightening eye cream with caffeine' },
      { name: 'SPF 30 Tinted Moisturizer', brand: 'VeeSkin', size: '50ml', color: 'Beige', price: 220, cost: 68, stock: 45, categoryId: moisturizers.id, description: 'Tinted moisturizer with broad-spectrum SPF' },
      { name: 'Neck & Décolleté Cream', brand: 'VeeSkin', size: '50ml', color: 'White', price: 395, cost: 120, stock: 25, categoryId: moisturizers.id, description: 'Firming cream for neck and chest' },
      // Masks
      { name: 'Rose Petal Sheet Mask', brand: 'VeeSkin', size: '25ml', color: 'Pink', price: 45, cost: 15, stock: 100, categoryId: masks.id, description: 'Single-use hydrating rose sheet mask' },
      { name: 'Clay Detox Mask', brand: 'VeeSkin', size: '100ml', color: 'Grey', price: 165, cost: 48, stock: 40, categoryId: masks.id, description: 'Kaolin + bentonite purifying mask' },
      { name: 'Overnight Sleeping Mask', brand: 'VeeSkin', size: '50ml', color: 'Clear', price: 220, cost: 65, stock: 35, categoryId: masks.id, description: 'Gel sleeping mask for intense hydration' },
      { name: 'Gold Eye Patches', brand: 'VeeSkin', size: '5pk', color: 'Gold', price: 130, cost: 38, stock: 60, categoryId: masks.id, description: 'Set of 5 gold-infused eye patches' },
      { name: 'Enzyme Peel Mask', brand: 'VeeSkin', size: '50ml', color: 'Orange', price: 205, cost: 60, stock: 30, categoryId: masks.id, description: 'Papaya enzyme radiance mask' },
      // Perfumes
      { name: 'Rose Gold Eau de Parfum', brand: 'VeeSkin', size: '50ml', color: 'Gold', price: 680, cost: 190, stock: 25, categoryId: perfumes.id, description: 'Damask rose, amber, sandalwood' },
      { name: 'Pink Petals Eau de Toilette', brand: 'VeeSkin', size: '50ml', color: 'Pink', price: 450, cost: 130, stock: 35, categoryId: perfumes.id, description: 'Peony, lychee, white musk' },
      { name: 'Velvet Oud Parfum', brand: 'VeeSkin', size: '50ml', color: 'Black', price: 1050, cost: 325, stock: 15, categoryId: perfumes.id, description: 'Oud, bergamot, vanilla' },
      { name: 'Citrus Blossom EDT', brand: 'VeeSkin', size: '50ml', color: 'Yellow', price: 410, cost: 110, stock: 40, categoryId: perfumes.id, description: 'Neroli, bergamot, jasmine' },
      { name: 'Vanilla Musk EDP', brand: 'VeeSkin', size: '50ml', color: 'Amber', price: 590, cost: 160, stock: 30, categoryId: perfumes.id, description: 'Madagascar vanilla, musk, cedar' },
      { name: 'Travel Spray Trio', brand: 'VeeSkin', size: '3x10ml', color: 'Gold', price: 350, cost: 110, stock: 45, categoryId: perfumes.id, description: '3 × 10ml travel sprays' },
      { name: 'Solid Perfume Compact', brand: 'VeeSkin', size: '10g', color: 'Rose', price: 240, cost: 70, stock: 50, categoryId: perfumes.id, description: 'Refillable rose solid perfume' },
      // Body Care
      { name: 'Rose Body Lotion', brand: 'VeeSkin', size: '200ml', color: 'Pink', price: 145, cost: 42, stock: 60, categoryId: bodyCare.id, description: 'Nourishing rose-scented body lotion' },
      { name: 'Sugar Body Scrub', brand: 'VeeSkin', size: '200ml', color: 'Brown', price: 175, cost: 50, stock: 45, categoryId: bodyCare.id, description: 'Brown sugar & vanilla scrub' },
      { name: 'Hand Cream Deluxe', brand: 'VeeSkin', size: '75ml', color: 'White', price: 95, cost: 28, stock: 80, categoryId: bodyCare.id, description: 'Shea butter hand cream' },
      { name: 'Body Oil Gold Shimmer', brand: 'VeeSkin', size: '150ml', color: 'Gold', price: 220, cost: 65, stock: 35, categoryId: bodyCare.id, description: 'Luminous dry body oil' },
      { name: 'Bath Soak Rose Petals', brand: 'VeeSkin', size: '300g', color: 'Pink', price: 130, cost: 35, stock: 50, categoryId: bodyCare.id, description: 'Mineral bath soak with rose petals' },
      { name: 'Lip Treatment Balm', brand: 'VeeSkin', size: '15ml', color: 'Clear', price: 85, cost: 22, stock: 90, categoryId: bodyCare.id, description: 'Plumping lip balm with peptides' },
    ]

    for (const p of products) {
      const sku = await generateSku(p.name, p.brand, p.size, p.color)
      // Generate inventory fields with sensible defaults
      const stock = p.stock
      const lowStock = Math.max(5, Math.floor(stock * 0.15)) // 15% of stock as min
      const reorderPoint = Math.max(10, Math.floor(stock * 0.25)) // 25% as reorder
      const maxStock = Math.max(50, stock * 2) // 2x stock as max

      // Generate batch number and dates
      const batchNumber = `BN-2026-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`
      const mfgDate = new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000) // 0-6 months ago
      const expiryDate = new Date(Date.now() + (180 + Math.floor(Math.random() * 540)) * 86400000) // 6-24 months from now

      await db.product.create({
        data: {
          ...p,
          sku,
          openingStock: stock,
          lowStock,
          reorderPoint,
          maxStock,
          batchNumber,
          manufacturingDate: mfgDate,
          expiryDate,
        },
      })
    }

    // Create some sample orders
    const allProducts = await db.product.findMany()
    const paymentMethods = ['CASH', 'MOMO', 'CARD']
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
      const tax = calculateTax(subtotal, 0) // no discount on demo orders
      const payMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
      const tendered = payMethod === 'CASH' ? Math.ceil(tax.grandTotal / 10) * 10 : 0
      const change = payMethod === 'CASH' ? Math.max(0, tendered - tax.grandTotal) : 0

      const daysAgo = Math.floor(Math.random() * 7)
      const createdAt = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000))

      await db.order.create({
        data: {
          orderNumber: `ORD-${String(1000 + i).padStart(5, '0')}`,
          status: 'COMPLETED',
          paymentMethod: payMethod,
          subtotal: tax.basicAmount,
          taxableAmount: tax.taxableAmount,
          nhil: tax.nhil,
          getfund: tax.getfund,
          vat: tax.vat,
          tax: tax.totalTax,
          total: tax.grandTotal,
          amountTendered: tendered,
          changeGiven: change,
          itemsCount: items.reduce((s, it) => s + it.quantity, 0),
          cashierName: 'Boutique Staff',
          createdAt,
          items: { create: items },
        },
      })
    }

    // Create default demo users (one per role)
    const defaultPasswordHash = await hashPassword('password123')
    const demoUsers = [
      { name: 'Isabella Romano', email: 'admin@veeskin.com', role: 'ADMIN' },
      { name: 'Sophia Chen', email: 'manager@veeskin.com', role: 'MANAGER' },
      { name: 'Maya Patel', email: 'cashier@veeskin.com', role: 'CASHIER' },
    ]
    for (const u of demoUsers) {
      await db.user.create({
        data: {
          name: u.name,
          email: u.email,
          passwordHash: defaultPasswordHash,
          role: u.role,
          isActive: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${categories.length} categories, ${products.length} products, 25 sample orders, and 3 demo users (admin/manager/cashier — password: password123)`,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed data', detail: String(error) }, { status: 500 })
  }
}
