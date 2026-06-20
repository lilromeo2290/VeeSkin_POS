'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Boxes, PackageX, TrendingDown, Loader2, Save, RefreshCw, CalendarClock, Minus, Plus, Pencil, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currency'
import { ExpiryAlertBanner } from '@/components/pos/expiry-alert'

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  price: number
  cost: number
  stock: number
  openingStock: number
  lowStock: number
  reorderPoint: number
  maxStock: number
  batchNumber: string | null
  manufacturingDate: string | null
  expiryDate: string | null
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string; color: string | null; icon: string | null } | null
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingStock, setEditingStock] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState('')

  useEffect(() => {
    loadProducts()
  }, [search, filter])

  async function loadProducts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter === 'low') params.set('lowStock', 'true')
    if (search) params.set('search', search)
    const res = await fetch(`/api/products?${params}`)
    const json = await res.json()
    setProducts(json)
    setLoading(false)
  }

  const stats = {
    total: products.length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p_low(p)).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    needsReorder: products.filter((p) => p.stock <= p_reorder(p)).length,
    expired: products.filter((p) => p.expiryDate && new Date(p.expiryDate) < new Date()).length,
    inventoryValue: products.reduce((s, p) => s + p.cost * p.stock, 0),
  }

  function openAdjust(product: Product) {
    setEditingStock(product)
    setNewStock(product.stock.toString())
  }

  async function saveStock() {
    if (!editingStock) return
    try {
      const res = await fetch(`/api/products/${editingStock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingStock.name,
          sku: editingStock.sku,
          description: editingStock.description,
          price: editingStock.price,
          cost: editingStock.cost,
          stock: parseInt(newStock) || 0,
          openingStock: editingStock.openingStock,
          lowStock: editingStock.lowStock,
          reorderPoint: editingStock.reorderPoint,
          maxStock: editingStock.maxStock,
          batchNumber: editingStock.batchNumber,
          manufacturingDate: editingStock.manufacturingDate,
          expiryDate: editingStock.expiryDate,
          categoryId: editingStock.categoryId,
          isActive: editingStock.isActive,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success('Stock updated')
      setEditingStock(null)
      await loadProducts()
    } catch (e) {
      toast.error('Failed to update stock')
    }
  }

  async function quickAdjust(product: Product, delta: number) {
    const newQty = Math.max(0, product.stock + delta)
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          sku: product.sku,
          description: product.description,
          price: product.price,
          cost: product.cost,
          stock: newQty,
          openingStock: product.openingStock,
          lowStock: product.lowStock,
          reorderPoint: product.reorderPoint,
          maxStock: product.maxStock,
          batchNumber: product.batchNumber,
          manufacturingDate: product.manufacturingDate,
          expiryDate: product.expiryDate,
          categoryId: product.categoryId,
          isActive: product.isActive,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      await loadProducts()
    } catch (e) {
      toast.error('Failed to update stock')
    }
  }

  // Helpers with fallbacks
  function p_low(p: Product) { return p.lowStock || 10 }
  function p_reorder(p: Product) { return p.reorderPoint || 20 }
  function p_max(p: Product) { return p.maxStock || 100 }
  function p_open(p: Product) { return p.openingStock || 0 }

  function getStockStatus(product: Product): { label: string; color: string; bg: string } {
    if (product.stock === 0) return { label: 'Out of Stock', color: 'text-red-700', bg: 'bg-red-100 border-red-300' }
    if (product.stock <= p_reorder(product)) return { label: 'Reorder', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' }
    if (product.stock <= p_low(product)) return { label: 'Low Stock', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' }
    if (product.stock >= p_max(product)) return { label: 'Overstock', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' }
    return { label: 'In Stock', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' }
  }

  function isExpired(p: Product): boolean {
    if (!p.expiryDate) return false
    return new Date(p.expiryDate) < new Date()
  }

  function isExpiringSoon(p: Product): boolean {
    if (!p.expiryDate) return false
    const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 30
  }

  function formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB')
  }

  // Stock progress bar percentage (relative to max stock)
  function stockPercent(p: Product): number {
    const max = p_max(p)
    if (max === 0) return 0
    return Math.min(100, Math.round((p.stock / max) * 100))
  }

  return (
    <div className="space-y-4">
      {/* Expiry alert banner */}
      <ExpiryAlertBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-[#D4A574]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Need Reorder</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{stats.needsReorder}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.outOfStock}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <PackageX className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.inventoryValue)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiry alert banner */}
      {stats.expired > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-3 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>{stats.expired}</strong> product(s) have expired. Please review and remove them from inventory.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search & filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="low">Low Stock Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Product cards — one per product */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Boxes className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No products in inventory</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const status = getStockStatus(product)
            const expired = isExpired(product)
            const expiringSoon = isExpiringSoon(product)
            const pct = stockPercent(product)
            return (
              <Card
                key={product.id}
                className={`overflow-hidden ${expired ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10' : ''}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: product.category?.color || '#D4A574' }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{product.sku}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${status.bg} ${status.color} border`}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Stock progress bar */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Current Stock</span>
                      <span className={`text-lg font-bold ${
                        product.stock === 0 ? 'text-red-600' :
                        product.stock <= p_low(product) ? 'text-amber-600' :
                        product.stock <= p_reorder(product) ? 'text-blue-600' :
                        product.stock >= p_max(product) ? 'text-purple-600' : 'text-emerald-600'
                      }`}>
                        {product.stock}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          product.stock === 0 ? 'bg-red-500' :
                          product.stock <= p_low(product) ? 'bg-amber-500' :
                          product.stock <= p_reorder(product) ? 'bg-blue-500' :
                          product.stock >= p_max(product) ? 'bg-purple-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* Stock level markers */}
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>Min: {p_low(product)}</span>
                      <span>Reorder: {p_reorder(product)}</span>
                      <span>Max: {p_max(product)}</span>
                    </div>
                  </div>

                  {/* Stock details grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opening:</span>
                      <span className="font-medium">{p_open(product)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="font-medium">{formatCurrency(product.cost * product.stock)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium">{formatCurrency(product.cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{formatCurrency(product.price)}</span>
                    </div>
                  </div>

                  {/* Batch & dates */}
                  <div className="space-y-1 pt-2 border-t border-border">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Batch #:</span>
                      <span className="font-mono">{product.batchNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Mfg Date:</span>
                      <span>{formatDate(product.manufacturingDate)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Expiry:</span>
                      <span className={
                        expired ? 'text-red-600 font-medium' :
                        expiringSoon ? 'text-amber-600 font-medium' : ''
                      }>
                        {formatDate(product.expiryDate)}
                        {expired && ' ⚠ Expired'}
                        {expiringSoon && ' ⏰ Soon'}
                      </span>
                    </div>
                  </div>

                  {/* Quick adjust buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => quickAdjust(product, -1)}
                      disabled={product.stock === 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => quickAdjust(product, 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 ml-auto"
                      onClick={() => openAdjust(product)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Adjust stock dialog */}
      <AlertDialog open={!!editingStock} onOpenChange={(open) => !open && setEditingStock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adjust Stock Level</AlertDialogTitle>
            <AlertDialogDescription>
              Update the current quantity for <strong>{editingStock?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="stock-input">New Current Quantity</Label>
            <Input
              id="stock-input"
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-2">
              <div>Opening: <strong className="text-foreground">{editingStock ? p_open(editingStock) : 0}</strong></div>
              <div>Min: <strong className="text-foreground">{editingStock ? p_low(editingStock) : 10}</strong></div>
              <div>Reorder: <strong className="text-foreground">{editingStock ? p_reorder(editingStock) : 20}</strong></div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveStock} className="bg-[#D4A574] hover:bg-[#D4A574]/90 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
