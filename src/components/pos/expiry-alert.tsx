'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { CalendarClock, AlertTriangle, X, ChevronRight, PackageX, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ExpiringProduct {
  id: string
  name: string
  sku: string
  stock: number
  batchNumber: string | null
  expiryDate: string | null
  daysUntilExpiry: number | null
  category: { name: string; color: string | null } | null
}

interface ExpiryData {
  expired: ExpiringProduct[]
  critical: ExpiringProduct[]
  soon: ExpiringProduct[]
  warning: ExpiringProduct[]
  summary: {
    expired: number
    critical: number
    soon: number
    warning: number
    total: number
  }
}

/**
 * Expiry Alert Banner — shows a dismissible prompt when products are about to expire.
 * Admins can delete expired products or replace/update their expiry dates directly
 * from the details dialog.
 */
export function ExpiryAlertBanner() {
  const [data, setData] = useState<ExpiryData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpiringProduct | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<ExpiringProduct | null>(null)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/expiring', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh data when dialog opens
  useEffect(() => {
    if (showDetails) loadData()
  }, [showDetails, loadData])

  if (!data || dismissed) return null

  const { summary } = data
  const urgentCount = summary.expired + summary.critical + summary.soon
  if (urgentCount === 0) return null

  const hasExpired = summary.expired > 0
  const hasCritical = summary.critical > 0

  const bannerStyle = hasExpired
    ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800'
    : hasCritical
    ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800'
    : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'

  const iconColor = hasExpired ? 'text-red-600' : hasCritical ? 'text-orange-600' : 'text-amber-600'
  const Icon = hasExpired ? PackageX : CalendarClock

  const parts: string[] = []
  if (summary.expired > 0) parts.push(`${summary.expired} expired`)
  if (summary.critical > 0) parts.push(`${summary.critical} expiring within 7 days`)
  if (summary.soon > 0) parts.push(`${summary.soon} expiring within 30 days`)

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`Deleted: ${deleteTarget.name}`)
      setDeleteTarget(null)
      // Small delay to let the DB commit, then force-reload
      await new Promise(r => setTimeout(r, 300))
      await loadData()
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setActionLoading(false)
    }
  }

  function openReplace(p: ExpiringProduct) {
    setReplaceTarget(p)
    // Default new expiry to 1 year from now
    const defaultDate = new Date()
    defaultDate.setFullYear(defaultDate.getFullYear() + 1)
    setNewExpiryDate(defaultDate.toISOString().substring(0, 10))
  }

  async function handleReplace() {
    if (!replaceTarget || !newExpiryDate) return
    setActionLoading(true)
    try {
      // Fetch the full product, update just the expiry date
      const getRes = await fetch(`/api/products/${replaceTarget.id}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!getRes.ok) throw new Error('Failed to fetch product')
      const product = await getRes.json()

      const updateRes = await fetch(`/api/products/${replaceTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          expiryDate: newExpiryDate,
          // Strip fields the PUT endpoint doesn't expect
          id: undefined, createdAt: undefined, updatedAt: undefined,
          variants: undefined, category: undefined,
        }),
      })
      if (!updateRes.ok) throw new Error('Update failed')

      toast.success(`${replaceTarget.name} expiry updated to ${new Date(newExpiryDate).toLocaleDateString('en-GB')}`)
      setReplaceTarget(null)
      // Small delay to let the DB commit, then force-reload
      await new Promise(r => setTimeout(r, 300))
      await loadData()
    } catch (e) {
      toast.error('Failed to update expiry date')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Card className={cn('border-2', bannerStyle)}>
        <CardContent className="p-3 flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', bannerStyle)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold', iconColor)}>
              {hasExpired ? '⚠ Products Have Expired!' : '⏰ Products Expiring Soon'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <strong>{parts.join(', ')}</strong>. Review and take action to prevent losses.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-8" onClick={() => setShowDetails(true)}>
              View Details
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setDismissed(true)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog with delete/replace actions */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              Expiry Alerts
            </DialogTitle>
            <DialogDescription>
              Products that are expired or expiring soon. Admins can delete or replace expiry dates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {data.expired.length > 0 && (
              <ExpirySection title="Expired" icon={PackageX} color="red" products={data.expired}
                onDelete={setDeleteTarget} onReplace={openReplace} />
            )}
            {data.critical.length > 0 && (
              <ExpirySection title="Expiring Within 7 Days" icon={AlertTriangle} color="orange" products={data.critical}
                onDelete={setDeleteTarget} onReplace={openReplace} />
            )}
            {data.soon.length > 0 && (
              <ExpirySection title="Expiring Within 30 Days" icon={CalendarClock} color="amber" products={data.soon}
                onDelete={setDeleteTarget} onReplace={openReplace} />
            )}
            {data.warning.length > 0 && (
              <ExpirySection title="Expiring Within 90 Days" icon={CalendarClock} color="blue" products={data.warning}
                onDelete={setDeleteTarget} onReplace={openReplace} />
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.sku})?
              This action cannot be undone. The product will be removed from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Replace expiry date dialog */}
      <AlertDialog open={!!replaceTarget} onOpenChange={(open) => !open && setReplaceTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Expiry Date</AlertDialogTitle>
            <AlertDialogDescription>
              Update the expiry date for <strong>{replaceTarget?.name}</strong> ({replaceTarget?.sku}).
              This is useful when you receive a new batch with a different expiry date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-expiry">New Expiry Date</Label>
            <Input
              id="new-expiry"
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Current expiry: {replaceTarget?.expiryDate ? new Date(replaceTarget.expiryDate).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplace}
              disabled={actionLoading || !newExpiryDate}
              className="bg-[#D4A574] hover:bg-[#D4A574]/90 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Update Expiry Date
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Section component ───────────────────────────────────────────────────────

function ExpirySection({ title, icon: Icon, color, products, onDelete, onReplace }: {
  title: string
  icon: React.ElementType
  color: 'red' | 'orange' | 'amber' | 'blue'
  products: ExpiringProduct[]
  onDelete: (p: ExpiringProduct) => void
  onReplace: (p: ExpiringProduct) => void
}) {
  const colorMap = {
    red: { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
    orange: { text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    blue: { text: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  }
  const c = colorMap[color]

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', c.bg)}>
          <Icon className={cn('w-4 h-4', c.text)} />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className={cn(c.bg, c.text, c.border)}>
          {products.length}
        </Badge>
      </div>
      <div className={cn('rounded-lg border', c.border, 'divide-y divide-border/50')}>
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: p.category?.color || '#D4A574' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{p.sku}</span>
                {p.batchNumber && <span>• Batch: {p.batchNumber}</span>}
                <span>• Stock: {p.stock}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-xs font-semibold', c.text)}>
                {p.daysUntilExpiry !== null && p.daysUntilExpiry < 0
                  ? `${Math.abs(p.daysUntilExpiry)}d ago`
                  : `${p.daysUntilExpiry}d left`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('en-GB') : '—'}
              </p>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onReplace(p)}
                title="Replace expiry date"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(p)}
                title="Delete product"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
