'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Search, Boxes, AlertTriangle, PackageX, TrendingDown, Loader2, Save, Package, RefreshCw, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currency'

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
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p.lowStock).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    needsReorder: products.filter((p) => p.stock <= p.reorderPoint).length,
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

  function getStockStatus(product: Product): { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default'; className?: string } {
    if (product.stock === 0) return { label: 'Out of Stock', variant: 'destructive' }
    if (product.stock <= p_reorder(product)) return { label: 'Reorder', variant: 'secondary', className: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (product.stock <= p_low(product)) return { label: 'Low Stock', variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    if (product.stock >= p_max(product)) return { label: 'Overstock', variant: 'secondary', className: 'bg-purple-50 text-purple-700 border-purple-200' }
    return { label: 'In Stock', variant: 'outline', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }

  // Helper functions to safely access fields with fallbacks for older data
  function p_low(p: Product) { return p.lowStock || 10 }
  function p_reorder(p: Product) { return p.reorderPoint || 20 }
  function p_max(p: Product) { return p.maxStock || 100 }
  function p_open(p: Product) { return p.openingStock || 0 }

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

  return (
    <div className="space-y-4">
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

      <Card>
        <CardContent className="p-0">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Opening</TableHead>
                    <TableHead className="text-center">Current</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                    <TableHead className="text-center">Reorder</TableHead>
                    <TableHead className="text-center">Max</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Mfg Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Adjust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const status = getStockStatus(product)
                    const expired = isExpired(product)
                    const expiringSoon = isExpiringSoon(product)
                    return (
                      <TableRow key={product.id} className={expired ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: product.category?.color || '#D4A574' }}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{p_open(product)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-bold ${product.stock === 0 ? 'text-red-600' : product.stock <= p_low(product) ? 'text-amber-600' : product.stock <= p_reorder(product) ? 'text-blue-600' : ''}`}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{p_low(product)}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {p_reorder(product)}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">{p_max(product)}</TableCell>
                        <TableCell className="text-xs font-mono">{product.batchNumber || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(product.manufacturingDate)}</TableCell>
                        <TableCell className="text-xs">
                          {product.expiryDate ? (
                            <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              {formatDate(product.expiryDate)}
                              {expired && ' (Expired)'}
                              {expiringSoon && ' (Soon)'}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => quickAdjust(product, -1)}
                              disabled={product.stock === 0}
                            >
                              -
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => quickAdjust(product, 1)}
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() => openAdjust(product)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
