'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Search, Plus, Pencil, Trash2, Package, Loader2, DollarSign
} from 'lucide-react'
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

interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
}

interface FormState {
  id?: string
  name: string
  sku: string
  description: string
  price: string
  cost: string
  stock: string
  lowStock: string
  categoryId: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  sku: '',
  description: '',
  price: '',
  cost: '',
  stock: '',
  lowStock: '10',
  categoryId: '',
  isActive: true,
}

export function ProductsManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [search, categoryFilter])

  async function loadProducts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter !== 'all') params.set('categoryId', categoryFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/products?${params}`)
    const json = await res.json()
    setProducts(json)
    setLoading(false)
  }

  async function loadCategories() {
    const res = await fetch('/api/categories')
    const json = await res.json()
    setCategories(json)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      lowStock: product.lowStock.toString(),
      categoryId: product.categoryId || '',
      isActive: product.isActive,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.sku.trim() || !form.price) {
      toast.error('Name, SKU, and price are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost) || 0,
        stock: parseInt(form.stock) || 0,
        lowStock: parseInt(form.lowStock) || 10,
        categoryId: form.categoryId || null,
      }
      const url = form.id ? `/api/products/${form.id}` : '/api/products'
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      toast.success(form.id ? 'Product updated' : 'Product created')
      setDialogOpen(false)
      await loadProducts()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Product deleted')
      setDeleteTarget(null)
      await loadProducts()
    } catch (e) {
      toast.error('Failed to delete product')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-1 gap-2 flex-col sm:flex-row">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate} className="brand-gradient hover:opacity-90 border-0 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
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
              <Package className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No products yet. Add your first product.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const margin = product.price > 0
                      ? Math.round(((product.price - product.cost) / product.price) * 100)
                      : 0
                    const lowStock = product.stock <= product.lowStock
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
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</p>
                            </div>
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
                        <TableCell className="text-right font-medium">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={margin >= 60 ? 'default' : margin >= 30 ? 'secondary' : 'outline'}>
                            {margin}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={product.stock === 0 ? 'destructive' : lowStock ? 'secondary' : 'outline'}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={product.isActive ? 'default' : 'outline'} className={product.isActive ? 'bg-[#D4A574]' : ''}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(product)}>
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {form.id ? 'Update product details' : 'Fill in the details for a new product'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cappuccino"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. COF-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Product description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stock">Current Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStock">Low Stock Threshold</Label>
                <Input
                  id="lowStock"
                  type="number"
                  min="0"
                  value={form.lowStock}
                  onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="active" className="font-medium cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive products are hidden from POS</p>
              </div>
              <Switch
                id="active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="brand-gradient hover:opacity-90 border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {form.id ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
