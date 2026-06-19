'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, Banknote, CreditCard, Smartphone,
  Coffee, Leaf, Croissant, Sandwich, CupSoda, CakeSlice, Package, Loader2, CheckCircle2, Printer
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  price: number
  stock: number
  lowStock: number
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string; color: string | null; icon: string | null } | null
}

interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
}

const ICON_MAP: Record<string, React.ElementType> = {
  Coffee, Leaf, Croissant, Sandwich, CupSoda, CakeSlice, Package,
}

function getIcon(name: string | null) {
  if (!name) return Package
  return ICON_MAP[name] || Package
}

export function PosTerminal() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [processing, setProcessing] = useState(false)
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number; items: any[] } | null>(null)

  const cart = useCartStore()

  useEffect(() => {
    Promise.all([loadProducts(), loadCategories()]).finally(() => setLoading(false))
  }, [selectedCategory, search])

  async function loadProducts() {
    const params = new URLSearchParams()
    if (selectedCategory !== 'all') params.set('categoryId', selectedCategory)
    if (search) params.set('search', search)
    const res = await fetch(`/api/products?${params}`)
    const json = await res.json()
    setProducts(json)
  }

  async function loadCategories() {
    const res = await fetch('/api/categories')
    const json = await res.json()
    setCategories(json)
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.isActive)
  }, [products])

  const totals = cart.totals()

  async function handleCheckout() {
    if (cart.items.length === 0) return
    setProcessing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          paymentMethod,
          customerName: cart.customerName,
          cashierName: 'Demo Cashier',
          discount: cart.discount,
          taxRate: cart.taxRate,
        }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const order = await res.json()
      setLastOrder({
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items,
      })
      cart.clear()
      setCheckoutOpen(false)
      toast.success(`Order ${order.orderNumber} completed!`)
      await loadProducts()
    } catch (e) {
      toast.error('Checkout failed. Please try again.')
      console.error(e)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)] md:h-[calc(100vh-3rem)]">
      {/* Products section */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search & category filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-card border border-border hover:bg-accent'
              )}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const Icon = getIcon(cat.icon)
              const active = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-card border border-border hover:bg-accent'
                  )}
                  style={active && cat.color ? { backgroundColor: cat.color } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Products grid */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.items.find((i) => i.productId === product.id)
                const outOfStock = product.stock <= 0
                return (
                  <button
                    key={product.id}
                    disabled={outOfStock}
                    onClick={() => {
                      cart.addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        sku: product.sku,
                        stock: product.stock,
                      })
                      toast.success(`Added ${product.name}`)
                    }}
                    className={cn(
                      'group relative text-left p-3 rounded-xl border border-border bg-card hover:border-emerald-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                      inCart && 'border-emerald-500 ring-1 ring-emerald-500/30'
                    )}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="flex flex-col h-full min-h-[100px]">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                        style={{ backgroundColor: product.category?.color ? `${product.category.color}20` : '#10b98120' }}
                      >
                        {(() => {
                          const Icon = getIcon(product.category?.icon)
                          return <Icon className="w-4 h-4" style={{ color: product.category?.color || '#10b981' }} />
                        })()}
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{product.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-bold text-emerald-600">${product.price.toFixed(2)}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {product.stock}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Cart section */}
      <Card className="w-full lg:w-[380px] shrink-0 flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Current Order
            </CardTitle>
            {cart.items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => cart.clear()} className="text-muted-foreground hover:text-destructive">
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 p-0">
          {cart.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <ShoppingCart className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Tap products to add them</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-2 py-2">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => cart.decrementItem(item.productId)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            if (item.stock && item.quantity >= item.stock) {
                              toast.error(`Only ${item.stock} in stock`)
                              return
                            }
                            cart.incrementItem(item.productId)
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="w-16 text-right">
                        <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => cart.removeItem(item.productId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t border-border p-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({totals.itemCount} items)</span>
                    <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cart.discount || ''}
                        onChange={(e) => cart.setDiscount(parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-right text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (8%)</span>
                    <span className="font-medium">${totals.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">${totals.total.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Charge ${totals.total.toFixed(2)}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>Select payment method and confirm the order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{totals.itemCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Total Due</span>
                <span className="text-2xl font-bold text-emerald-600">${totals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-3 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', icon: Banknote },
                  { value: 'CARD', label: 'Card', icon: CreditCard },
                  { value: 'DIGITAL', label: 'Digital', icon: Smartphone },
                ].map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        paymentMethod === opt.value
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                          : 'border-border hover:border-emerald-300'
                      )}
                    >
                      <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{opt.label}</span>
                    </Label>
                  )
                })}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Confirm Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt dialog */}
      <Dialog open={!!lastOrder} onOpenChange={(open) => !open && setLastOrder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="sr-only">
            <DialogTitle>Payment Complete</DialogTitle>
            <DialogDescription>Order receipt and confirmation</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Payment Complete</h2>
            <p className="text-sm text-muted-foreground mt-1">{lastOrder?.orderNumber}</p>

            <div className="w-full mt-4 rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{lastOrder?.items.length || 0}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Paid</span>
                <span className="text-emerald-600">${lastOrder?.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button
              className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setLastOrder(null)}
            >
              New Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
