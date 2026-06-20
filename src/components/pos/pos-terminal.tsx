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
  Package, Loader2, CheckCircle2, Printer, MessageSquare
} from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency, formatCurrencyNegative } from '@/lib/currency'
import { calculateChange } from '@/lib/tax'
import { Receipt } from '@/components/pos/receipt'
import { printReceipt } from '@/lib/print-receipt'

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

interface CompletedOrderItem {
  id: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

interface CompletedOrder {
  id: string
  orderNumber: string
  paymentMethod: string
  subtotal: number
  discount: number
  taxableAmount: number
  nhil: number
  getfund: number
  vat: number
  tax: number
  total: number
  amountTendered: number
  changeGiven: number
  itemsCount: number
  customerName: string | null
  cashierName: string | null
  createdAt: string
  items: CompletedOrderItem[]
}

export function PosTerminal() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOMO' | 'CARD'>('CASH')
  const [amountTendered, setAmountTendered] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [lastOrder, setLastOrder] = useState<CompletedOrder | null>(null)

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
    const tendered = parseFloat(amountTendered) || 0
    if (paymentMethod === 'CASH' && tendered < totals.grandTotal) {
      toast.error(`Amount tendered must be at least ${formatCurrency(totals.grandTotal)}`)
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items,
          paymentMethod,
          customerName: cart.customerName,
          customerPhone: cart.customerPhone,
          discount: cart.discount,
          amountTendered: paymentMethod === 'CASH' ? tendered : 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Checkout failed')
      }
      const order = await res.json()
      setLastOrder(order)
      cart.clear()
      setCheckoutOpen(false)
      setAmountTendered('')
      toast.success(`Order ${order.orderNumber} completed!`)
      // Show SMS status if a phone number was provided
      if (order.smsResult) {
        if (order.smsResult.success) {
          toast.success(`SMS receipt sent to customer`, { duration: 4000 })
        } else {
          toast.info(`SMS not sent: ${order.smsResult.message}`, { duration: 4000 })
        }
      }
      await loadProducts()
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed. Please try again.')
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
                  ? 'brand-gradient text-white'
                  : 'bg-card border border-border hover:bg-accent'
              )}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'brand-gradient text-white'
                      : 'bg-card border border-border hover:bg-accent'
                  )}
                  style={active && cat.color ? { backgroundColor: cat.color } : undefined}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: active ? 'white' : (cat.color || '#D4A574') }}
                  />
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
                      'group relative text-left p-3 rounded-xl border border-border bg-card hover:border-[#D4A574] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                      inCart && 'border-[#D4A574] ring-1 ring-[#D4A574]/30'
                    )}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full brand-gradient text-white text-xs font-bold flex items-center justify-center shadow-md">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="flex flex-col h-full min-h-[100px]">
                      <div
                        className="w-3 h-3 rounded-full mb-2 shrink-0"
                        style={{ backgroundColor: product.category?.color || '#D4A574' }}
                      />
                      <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{product.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-bold text-[#D4A574]">{formatCurrency(product.price)}</span>
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
      <Card className="w-full lg:w-[440px] shrink-0 flex flex-col h-full">
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
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} each</p>
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
                        <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</p>
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
                    <span className="text-muted-foreground">Basic Amount ({totals.itemCount} items)</span>
                    <span className="font-medium">{formatCurrency(totals.basicAmount)}</span>
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
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taxable Amount</span>
                      <span>{formatCurrency(totals.taxableAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>NHIL @ 2.5%</span>
                    <span>{formatCurrency(totals.nhil)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>GETFund @ 2.5%</span>
                    <span>{formatCurrency(totals.getfund)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>VAT @ 10%</span>
                    <span>{formatCurrency(totals.vat)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-2xl font-bold text-[#D4A574]">{formatCurrency(totals.grandTotal)}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold brand-gradient hover:opacity-90 border-0"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Charge {formatCurrency(totals.grandTotal)}
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
                <span className="text-muted-foreground">Basic Amount</span>
                <span>{formatCurrency(totals.basicAmount)}</span>
              </div>
              {totals.discount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span>{formatCurrencyNegative(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Taxable Amount</span>
                    <span>{formatCurrency(totals.taxableAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>NHIL @ 2.5%</span>
                <span>{formatCurrency(totals.nhil)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>GETFund @ 2.5%</span>
                <span>{formatCurrency(totals.getfund)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>VAT @ 10%</span>
                <span>{formatCurrency(totals.vat)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Grand Total</span>
                <span className="text-2xl font-bold text-[#D4A574]">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>

            {/* Customer details — entered at checkout */}
            <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer Details (for SMS Receipt)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  value={cart.customerName}
                  onChange={(e) => cart.setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-9"
                />
                <Input
                  type="tel"
                  value={cart.customerPhone}
                  onChange={(e) => cart.setCustomerPhone(e.target.value)}
                  placeholder="Phone number (e.g. 0241234567)"
                  className="h-9"
                />
              </div>
              {cart.customerPhone && cart.customerPhone.trim() && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  SMS receipt will be sent to {cart.customerPhone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'CASH' | 'MOMO' | 'CARD')} className="grid grid-cols-3 gap-2">
                {[
                  { value: 'CASH', label: 'Cash', icon: Banknote },
                  { value: 'MOMO', label: 'MoMo', icon: Smartphone },
                  { value: 'CARD', label: 'Card', icon: CreditCard },
                ].map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Label
                      key={opt.value}
                      htmlFor={opt.value}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        paymentMethod === opt.value
                          ? 'border-[#D4A574] bg-[#D4A574]/10'
                          : 'border-border hover:border-[#D4A574]/50'
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

            {/* Cash payment: amount tendered + change */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="space-y-2">
                  <Label htmlFor="amount-tendered">Amount Tendered (Cash Given)</Label>
                  <Input
                    id="amount-tendered"
                    type="number"
                    min={totals.grandTotal}
                    step="0.01"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={totals.grandTotal.toFixed(2)}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                </div>
                {/* Quick cash buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {[totals.grandTotal, Math.ceil(totals.grandTotal / 10) * 10, Math.ceil(totals.grandTotal / 50) * 50, Math.ceil(totals.grandTotal / 100) * 100].filter((v, i, arr) => arr.indexOf(v) === i).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountTendered(amt.toFixed(2))}
                      className="px-2.5 py-1 text-xs rounded-md border border-border hover:bg-muted transition-colors font-medium"
                    >
                      {formatCurrency(amt)}
                    </button>
                  ))}
                </div>
                {amountTendered && parseFloat(amountTendered) >= totals.grandTotal && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-medium">Change Due:</span>
                    <span className="text-xl font-bold text-emerald-600">{formatCurrency(calculateChange(totals.grandTotal, parseFloat(amountTendered)))}</span>
                  </div>
                )}
                {amountTendered && parseFloat(amountTendered) < totals.grandTotal && (
                  <p className="text-xs text-red-600">Amount is less than the total due</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={processing || (paymentMethod === 'CASH' && (!amountTendered || parseFloat(amountTendered) < totals.grandTotal))}
              className="brand-gradient hover:opacity-90 border-0"
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

      {/* Receipt dialog — thermal receipt format */}
      <Dialog open={!!lastOrder} onOpenChange={(open) => !open && setLastOrder(null)}>
        <DialogContent className="sm:max-w-[340px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white border-gray-300 rounded-md shadow-xl" style={{ borderRadius: '4px' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Payment Complete</DialogTitle>
            <DialogDescription>Order receipt and confirmation</DialogDescription>
          </DialogHeader>

          {/* Success indicator */}
          <div className="flex flex-col items-center text-center py-3 bg-[#D4A574]/5 border-b border-dashed border-gray-300">
            <div className="w-12 h-12 rounded-full bg-[#D4A574]/15 flex items-center justify-center mb-1.5">
              <CheckCircle2 className="w-7 h-7 text-[#D4A574]" />
            </div>
            <h2 className="text-base font-bold">Payment Complete</h2>
          </div>

          {/* The thermal receipt */}
          {lastOrder && <Receipt order={lastOrder} />}

          {/* Actions */}
          <div className="flex gap-2 p-3 no-print border-t border-dashed border-gray-300">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => lastOrder && printReceipt(lastOrder)}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              className="flex-1 brand-gradient hover:opacity-90 border-0"
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
