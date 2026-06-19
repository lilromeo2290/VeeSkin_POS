import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    // Clean existing data
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()

    // Create categories
    const categories = await db.$transaction([
      db.category.create({ data: { name: 'Coffee', icon: 'Coffee', color: '#d97706' } }),
      db.category.create({ data: { name: 'Tea', icon: 'Leaf', color: '#16a34a' } }),
      db.category.create({ data: { name: 'Pastries', icon: 'Croissant', color: '#ea580c' } }),
      db.category.create({ data: { name: 'Sandwiches', icon: 'Sandwich', color: '#9333ea' } }),
      db.category.create({ data: { name: 'Cold Drinks', icon: 'CupSoda', color: '#0891b2' } }),
      db.category.create({ data: { name: 'Desserts', icon: 'CakeSlice', color: '#db2777' } }),
    ])

    const [coffee, tea, pastries, sandwiches, coldDrinks, desserts] = categories

    // Create products
    const products = [
      // Coffee
      { name: 'Espresso', sku: 'COF-001', price: 3.0, cost: 0.8, stock: 100, categoryId: coffee.id, description: 'Rich single shot espresso' },
      { name: 'Americano', sku: 'COF-002', price: 3.5, cost: 0.9, stock: 100, categoryId: coffee.id, description: 'Espresso with hot water' },
      { name: 'Cappuccino', sku: 'COF-003', price: 4.5, cost: 1.2, stock: 80, categoryId: coffee.id, description: 'Espresso with steamed milk foam' },
      { name: 'Latte', sku: 'COF-004', price: 4.75, cost: 1.3, stock: 80, categoryId: coffee.id, description: 'Espresso with steamed milk' },
      { name: 'Mocha', sku: 'COF-005', price: 5.25, cost: 1.5, stock: 60, categoryId: coffee.id, description: 'Espresso with chocolate and milk' },
      { name: 'Flat White', sku: 'COF-006', price: 4.5, cost: 1.2, stock: 60, categoryId: coffee.id, description: 'Double shot ristretto with milk' },
      { name: 'Macchiato', sku: 'COF-007', price: 4.0, cost: 1.1, stock: 50, categoryId: coffee.id, description: 'Espresso with milk foam' },
      { name: 'Cold Brew', sku: 'COF-008', price: 5.0, cost: 1.4, stock: 40, categoryId: coffee.id, description: '12-hour steeped cold coffee' },
      // Tea
      { name: 'Green Tea', sku: 'TEA-001', price: 3.0, cost: 0.5, stock: 70, categoryId: tea.id, description: 'Classic Japanese green tea' },
      { name: 'Earl Grey', sku: 'TEA-002', price: 3.25, cost: 0.6, stock: 70, categoryId: tea.id, description: 'Black tea with bergamot' },
      { name: 'Chai Latte', sku: 'TEA-003', price: 4.5, cost: 1.0, stock: 50, categoryId: tea.id, description: 'Spiced tea with steamed milk' },
      { name: 'Matcha Latte', sku: 'TEA-004', price: 5.0, cost: 1.4, stock: 45, categoryId: tea.id, description: 'Stone-ground matcha with milk' },
      { name: 'Jasmine Tea', sku: 'TEA-005', price: 3.5, cost: 0.7, stock: 60, categoryId: tea.id, description: 'Fragrant jasmine-scented tea' },
      // Pastries
      { name: 'Butter Croissant', sku: 'PAS-001', price: 3.5, cost: 0.9, stock: 30, categoryId: pastries.id, description: 'Flaky butter croissant' },
      { name: 'Chocolate Croissant', sku: 'PAS-002', price: 4.0, cost: 1.1, stock: 25, categoryId: pastries.id, description: 'Croissant with dark chocolate' },
      { name: 'Cinnamon Roll', sku: 'PAS-003', price: 4.5, cost: 1.2, stock: 20, categoryId: pastries.id, description: 'Sweet cinnamon-glazed roll' },
      { name: 'Blueberry Muffin', sku: 'PAS-004', price: 3.75, cost: 0.95, stock: 24, categoryId: pastries.id, description: 'Fresh blueberry muffin' },
      { name: 'Pain au Chocolat', sku: 'PAS-005', price: 4.25, cost: 1.15, stock: 18, categoryId: pastries.id, description: 'Puff pastry with chocolate' },
      // Sandwiches
      { name: 'Turkey Club', sku: 'SAN-001', price: 8.5, cost: 2.5, stock: 15, categoryId: sandwiches.id, description: 'Turkey, bacon, lettuce, tomato' },
      { name: 'Caprese', sku: 'SAN-002', price: 7.5, cost: 2.2, stock: 15, categoryId: sandwiches.id, description: 'Mozzarella, tomato, basil' },
      { name: 'Ham & Cheese', sku: 'SAN-003', price: 6.5, cost: 1.9, stock: 18, categoryId: sandwiches.id, description: 'Classic ham and swiss cheese' },
      { name: 'Veggie Wrap', sku: 'SAN-004', price: 7.0, cost: 2.0, stock: 12, categoryId: sandwiches.id, description: 'Grilled vegetables in a wrap' },
      { name: 'BLT', sku: 'SAN-005', price: 6.75, cost: 1.95, stock: 14, categoryId: sandwiches.id, description: 'Bacon, lettuce, tomato' },
      // Cold Drinks
      { name: 'Iced Latte', sku: 'CLD-001', price: 4.75, cost: 1.3, stock: 50, categoryId: coldDrinks.id, description: 'Chilled latte over ice' },
      { name: 'Iced Tea', sku: 'CLD-002', price: 3.5, cost: 0.7, stock: 60, categoryId: coldDrinks.id, description: 'House-made iced tea' },
      { name: 'Lemonade', sku: 'CLD-003', price: 3.75, cost: 0.6, stock: 55, categoryId: coldDrinks.id, description: 'Fresh squeezed lemonade' },
      { name: 'Sparkling Water', sku: 'CLD-004', price: 2.5, cost: 0.4, stock: 80, categoryId: coldDrinks.id, description: 'Carbonated mineral water' },
      { name: 'Orange Juice', sku: 'CLD-005', price: 4.0, cost: 1.0, stock: 40, categoryId: coldDrinks.id, description: 'Fresh squeezed orange juice' },
      { name: 'Smoothie', sku: 'CLD-006', price: 6.0, cost: 1.8, stock: 30, categoryId: coldDrinks.id, description: 'Mixed berry smoothie' },
      // Desserts
      { name: 'Cheesecake', sku: 'DES-001', price: 5.5, cost: 1.6, stock: 16, categoryId: desserts.id, description: 'New York style cheesecake' },
      { name: 'Brownie', sku: 'DES-002', price: 3.5, cost: 0.9, stock: 20, categoryId: desserts.id, description: 'Fudgy chocolate brownie' },
      { name: 'Tiramisu', sku: 'DES-003', price: 5.75, cost: 1.7, stock: 14, categoryId: desserts.id, description: 'Italian coffee-flavored dessert' },
      { name: 'Macaron', sku: 'DES-004', price: 2.75, cost: 0.7, stock: 30, categoryId: desserts.id, description: 'French almond meringue cookie' },
      { name: 'Cookie', sku: 'DES-005', price: 2.5, cost: 0.55, stock: 40, categoryId: desserts.id, description: 'Chocolate chip cookie' },
      { name: 'Tres Leches', sku: 'DES-006', price: 5.25, cost: 1.5, stock: 12, categoryId: desserts.id, description: 'Sponge cake soaked in three milks' },
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
        const qty = Math.floor(Math.random() * 3) + 1
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
          cashierName: 'Demo Cashier',
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
