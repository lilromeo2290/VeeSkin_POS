'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Plus, Trash2, Pencil, Tag, Loader2, Droplets, FlaskConical, FlaskRound, Sparkles, Flower2, Hand, Package, Palette
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  _count: { products: number }
}

const ICON_OPTIONS = [
  { name: 'Droplets', icon: Droplets },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'FlaskRound', icon: FlaskRound },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Flower2', icon: Flower2 },
  { name: 'Hand', icon: Hand },
  { name: 'Package', icon: Package },
  { name: 'Tag', icon: Tag },
  { name: 'Palette', icon: Palette },
]

const COLOR_OPTIONS = [
  { name: 'Rose Gold', value: '#D4A574' },
  { name: 'Soft Pink', value: '#E6A9B6' },
  { name: 'Gold', value: '#D4AF37' },
  { name: 'Deep Rose', value: '#C77B8E' },
  { name: 'Bronze', value: '#A67C52' },
  { name: 'Nude', value: '#B89A7A' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Teal', value: '#0891b2' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Orange', value: '#ea580c' },
]

function getIcon(name: string | null) {
  if (!name) return Tag
  const found = ICON_OPTIONS.find((o) => o.name === name)
  return found ? found.icon : Tag
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Package')
  const [color, setColor] = useState('#D4A574')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setCategories(json)
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditId(null)
    setName('')
    setIcon('Package')
    setColor('#D4A574')
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditId(cat.id)
    setName(cat.name)
    setIcon(cat.icon || 'Package')
    setColor(cat.color || '#D4A574')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }
    setSaving(true)
    try {
      const payload = { name: name.trim(), icon, color }
      const url = editId ? `/api/categories/${editId}` : '/api/categories'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      toast.success(editId ? 'Category updated' : 'Category created')
      setDialogOpen(false)
      await loadCategories()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Category deleted')
      setDeleteTarget(null)
      await loadCategories()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Categories</h2>
              <p className="text-sm text-muted-foreground">Organize your products into categories</p>
            </div>
            <Button onClick={openCreate} className="brand-gradient hover:opacity-90 border-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
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
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Tag className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No categories yet. Create your first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => {
                    const Icon = getIcon(cat.icon)
                    return (
                      <TableRow key={cat.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: cat.color ? `${cat.color}20` : '#D4A57420' }}
                            >
                              <Icon className="w-4 h-4" style={{ color: cat.color || '#D4A574' }} />
                            </div>
                            <span className="font-medium text-sm">{cat.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cat.icon || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: cat.color || '#ccc' }} />
                            <span className="text-xs">{cat.color || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{cat._count.products}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(cat)}
                            >
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update category details' : 'Create a new product category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name *</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Face Masks"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon
                  const selected = icon === opt.name
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setIcon(opt.name)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                        selected ? 'border-[#D4A574] bg-[#D4A574]/10' : 'border-border hover:border-[#D4A574]/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => {
                  const selected = color === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selected ? 'border-foreground scale-110' : 'border-border'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  )
                })}
              </div>
            </div>
            {/* Preview */}
            <div className="rounded-lg border border-border p-3 flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                {(() => {
                  const Icon = getIcon(icon)
                  return <Icon className="w-4 h-4" style={{ color }} />
                })()}
              </div>
              <span className="font-medium text-sm">{name || 'Category Name'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="brand-gradient hover:opacity-90 border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editId ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
              {deleteTarget && deleteTarget._count.products > 0
                ? ` This category has ${deleteTarget._count.products} product(s). You must move or delete them first.`
                : ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTarget?._count.products ? deleteTarget._count.products > 0 : false}
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
