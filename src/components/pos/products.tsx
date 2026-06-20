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
  Search, Plus, Pencil, Trash2, Package, Loader2, DollarSign, Layers
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currency'
import { previewSku } from '@/lib/sku'

interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  brand: string | null
  size: string | null
  color: string | null
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
  brand: string
  size: string
  color: string
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
  brand: '',
  size: '',
  color: '',
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
      brand: product.brand || '',
      size: product.size || '',
      color: product.color || '',
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
    if (!form.name.trim() || !form.price) {
      toast.error('Name and price are required')
      return
    }
    // SKU is auto-generated from name + brand + size + color if left blank
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        brand: form.brand || null,
        size: form.size || null,
        color: form.color || null,
        sku: form.sku || null, // null = auto-generate on server
        description: form.description,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost) || 0,
        stock: parseInt(form.stock) || 0,
        lowStock: parseInt(form.lowStock) || 10,
        categoryId: form.categoryId || null,
        isActive: form.isActive,
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
                    <TableHead>Brand / Size / Color</TableHead>
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
                          <div className="text-xs space-y-0.5">
                            {product.brand && <p className="font-medium">{product.brand}</p>}
                            <p className="text-muted-foreground">
                              {[product.size, product.color].filter(Boolean).join(' • ') || '—'}
                            </p>
                          </div>
                        </TableCell>
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
                placeholder="e.g. Rose Gel Cleanser"
              />
            </div>

            {/* Brand, Size, Color — used for auto-SKU generation */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. VeeSkin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  placeholder="e.g. 100ml"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="e.g. Clear"
                />
              </div>
            </div>

            {/* Auto-generated SKU (read-only preview) + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (auto-generated)</Label>
                <Input
                  id="sku"
                  value={
                    form.sku
                      ? form.sku
                      : form.name
                        ? previewSku(form.name, form.brand, form.size, form.color)
                        : ''
                  }
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Enter product name to generate SKU..."
                  className="font-mono text-sm bg-muted/50"
                  readOnly={!form.sku}
                />
                <p className="text-[11px] text-muted-foreground">
                  {form.sku
                    ? '⚠ Custom SKU — click to edit manually'
                    : form.name
                      ? `✓ Auto-generated from: ${[form.brand, form.name, form.size, form.color].filter(Boolean).join(' + ')}`
                      : '💡 SKU generates automatically when you enter the product name'}
                </p>
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

            {/* Variants section — only shown when editing an existing product */}
            {form.id && (
              <VariantsEditor productId={form.id} productName={form.name} brand={form.brand} />
            )}
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

// ─── Variants Editor Sub-component ───────────────────────────────────────────

interface Variant {
  id: string
  name: string
  size: string | null
  color: string | null
  scent: string | null
  sku: string
  price: number | null
  stock: number
  isActive: boolean
}

interface VariantsEditorProps {
  productId: string
  productName: string
  brand: string
}

function VariantsEditor({ productId, productName, brand }: VariantsEditorProps) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)

  // New variant form state
  const [vName, setVName] = useState('')
  const [vSize, setVSize] = useState('')
  const [vColor, setVColor] = useState('')
  const [vScent, setVScent] = useState('')
  const [vPrice, setVPrice] = useState('')
  const [vStock, setVStock] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadVariants()
  }, [productId])

  async function loadVariants() {
    setLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/variants`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setVariants(json)
    } catch {
      // Silent fail — variants are optional
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setVName('')
    setVSize('')
    setVColor('')
    setVScent('')
    setVPrice('')
    setVStock('0')
    setEditingVariant(null)
    setShowForm(false)
  }

  function startEdit(v: Variant) {
    setEditingVariant(v)
    setVName(v.name)
    setVSize(v.size || '')
    setVColor(v.color || '')
    setVScent(v.scent || '')
    setVPrice(v.price != null ? v.price.toString() : '')
    setVStock(v.stock.toString())
    setShowForm(true)
  }

  async function handleSaveVariant() {
    setSaving(true)
    try {
      const payload = {
        name: vName || [vSize, vColor, vScent].filter(Boolean).join(' - ') || 'Default',
        size: vSize || null,
        color: vColor || null,
        scent: vScent || null,
        price: vPrice ? parseFloat(vPrice) : null,
        stock: parseInt(vStock) || 0,
      }
      const url = editingVariant
        ? `/api/variants/${editingVariant.id}`
        : `/api/products/${productId}/variants`
      const method = editingVariant ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      toast.success(editingVariant ? 'Variant updated' : 'Variant created')
      resetForm()
      await loadVariants()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save variant')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteVariant(v: Variant) {
    if (!confirm(`Delete variant "${v.name}"?`)) return
    try {
      const res = await fetch(`/api/variants/${v.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Variant deleted')
      await loadVariants()
    } catch {
      toast.error('Failed to delete variant')
    }
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#D4A574]" />
          <div>
            <p className="text-sm font-medium">Product Variants</p>
            <p className="text-xs text-muted-foreground">
              {variants.length > 0
                ? `${variants.length} variant${variants.length !== 1 ? 's' : ''} (different sizes, colors, or scents)`
                : 'Add variants for different sizes, colors, or scents'}
            </p>
          </div>
        </div>
        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Variant
          </Button>
        )}
      </div>

      {/* Variant form */}
      {showForm && (
        <div className="p-3 space-y-3 border-b border-border bg-muted/20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Input value={vSize} onChange={(e) => setVSize(e.target.value)} placeholder="50ml" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <Input value={vColor} onChange={(e) => setVColor(e.target.value)} placeholder="Pink" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scent</Label>
              <Input value={vScent} onChange={(e) => setVScent(e.target.value)} placeholder="Rose" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (override)</Label>
              <Input value={vPrice} onChange={(e) => setVPrice(e.target.value)} placeholder="Use default" className="h-8 text-sm" type="number" step="0.01" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stock</Label>
              <Input value={vStock} onChange={(e) => setVStock(e.target.value)} className="h-8 text-sm" type="number" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variant Name</Label>
              <Input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Auto from size/color" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleSaveVariant} disabled={saving} className="brand-gradient hover:opacity-90 border-0">
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
              {editingVariant ? 'Update' : 'Add'} Variant
            </Button>
          </div>
        </div>
      )}

      {/* Variants list */}
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No variants yet. The product uses its default price and stock.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {variants.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{v.sku}</p>
                </div>
                <div className="text-right text-xs">
                  {v.price != null ? (
                    <p className="font-medium">{formatCurrency(v.price)}</p>
                  ) : (
                    <p className="text-muted-foreground">Default price</p>
                  )}
                  <p className="text-muted-foreground">Stock: {v.stock}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(v)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVariant(v)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
