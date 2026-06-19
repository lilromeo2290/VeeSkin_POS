'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Search, Boxes, AlertTriangle, PackageX, TrendingDown, Loader2, Save, Package } from 'lucide-react'
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
  lowStock: number
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
          lowStock: editingStock.lowStock,
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
          lowStock: product.lowStock,
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

  return (
    <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{stats.lowStock}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
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
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
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
              <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">In Stock</TableHead>
                    <TableHead className="text-center">Threshold</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Adjust</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const stockValue = product.cost * product.stock
                    const isOut = product.stock === 0
                    const isLow = product.stock > 0 && product.stock <= product.lowStock
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: product.category?.color ? `${product.category.color}20` : '#D4A57420' }}
                            >
                              <Package className="w-4 h-4" style={{ color: product.category?.color || '#D4A574' }} />
                            </div>
                            <p className="font-medium text-sm">{product.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline" style={{ color: product.category.color || undefined }}>
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : ''}`}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{product.lowStock}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(stockValue)}</TableCell>
                        <TableCell>
                          {isOut ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">Low</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-[#D4A574]/10 text-[#D4A574]">In Stock</Badge>
                          )}
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
              Update the stock count for <strong>{editingStock?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="stock-input">New Stock Level</Label>
            <Input
              id="stock-input"
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Current: {editingStock?.stock} units • Low stock threshold: {editingStock?.lowStock}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveStock} className="brand-gradient hover:opacity-90 border-0">
              <Save className="w-4 h-4 mr-2" />
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
