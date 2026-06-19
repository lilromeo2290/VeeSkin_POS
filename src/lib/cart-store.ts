import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  sku?: string
  stock?: number
}

interface CartState {
  items: CartItem[]
  customerName: string
  discount: number
  taxRate: number
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  incrementItem: (productId: string) => void
  decrementItem: (productId: string) => void
  clear: () => void
  setCustomerName: (name: string) => void
  setDiscount: (amount: number) => void
  setTaxRate: (rate: number) => void
  totals: () => {
    subtotal: number
    discountAmount: number
    tax: number
    total: number
    itemCount: number
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: '',
      discount: 0,
      taxRate: 0.08,

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: qty }] }
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: qty } : i
                ),
        })),

      incrementItem: (productId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
          ),
        })),

      decrementItem: (productId) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [], customerName: '', discount: 0 }),

      setCustomerName: (name) => set({ customerName: name }),
      setDiscount: (amount) => set({ discount: Math.max(0, amount) }),
      setTaxRate: (rate) => set({ taxRate: Math.max(0, Math.min(1, rate)) }),

      totals: () => {
        const { items, discount, taxRate } = get()
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
        const itemCount = items.reduce((s, i) => s + i.quantity, 0)
        const discountAmount = Math.min(discount, subtotal)
        const taxableAmount = Math.max(0, subtotal - discountAmount)
        const tax = Math.round(taxableAmount * taxRate * 100) / 100
        const total = Math.round((taxableAmount + tax) * 100) / 100
        return {
          subtotal: Math.round(subtotal * 100) / 100,
          discountAmount: Math.round(discountAmount * 100) / 100,
          tax,
          total,
          itemCount,
        }
      },
    }),
    {
      name: 'pos-cart-storage',
    }
  )
)
