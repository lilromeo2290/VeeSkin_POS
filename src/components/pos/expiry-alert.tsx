'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { CalendarClock, AlertTriangle, X, ChevronRight, PackageX } from 'lucide-react'
import { cn } from '@/lib/utils'

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
 *
 * Displays on the Dashboard, Inventory, and Reports pages.
 * Shows different urgency levels:
 *   - Expired (red) — already past expiry
 *   - Critical (orange) — expiring within 7 days
 *   - Soon (amber) — expiring within 30 days
 *
 * Clicking "View Details" opens a dialog with the full list.
 * The banner can be dismissed (per session) but reappears on page reload.
 */
export function ExpiryAlertBanner() {
  const [data, setData] = useState<ExpiryData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/expiring')
        if (!res.ok) return
        const json = await res.json()
        setData(json)
      } catch {
        // Silent fail — expiry alerts are non-critical
      }
    }
    load()
  }, [])

  // Don't render if no data, dismissed, or no expiring products
  if (!data || dismissed) return null

  const { summary } = data
  // Only show banner if there are expired or critical or soon items
  const urgentCount = summary.expired + summary.critical + summary.soon
  if (urgentCount === 0) return null

  // Determine the highest urgency level for the banner style
  const hasExpired = summary.expired > 0
  const hasCritical = summary.critical > 0
  const hasSoon = summary.soon > 0

  const bannerStyle = hasExpired
    ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800'
    : hasCritical
    ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800'
    : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800'

  const iconColor = hasExpired ? 'text-red-600' : hasCritical ? 'text-orange-600' : 'text-amber-600'
  const Icon = hasExpired ? PackageX : CalendarClock

  // Build the alert message
  const parts: string[] = []
  if (summary.expired > 0) parts.push(`${summary.expired} expired`)
  if (summary.critical > 0) parts.push(`${summary.critical} expiring within 7 days`)
  if (summary.soon > 0) parts.push(`${summary.soon} expiring within 30 days`)

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
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setShowDetails(true)}
            >
              View Details
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              Expiry Alerts
            </DialogTitle>
            <DialogDescription>
              Products that are expired or expiring soon. Take action to prevent losses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Expired */}
            {data.expired.length > 0 && (
              <ExpirySection
                title="Expired"
                icon={PackageX}
                color="red"
                products={data.expired}
              />
            )}

            {/* Critical (within 7 days) */}
            {data.critical.length > 0 && (
              <ExpirySection
                title="Expiring Within 7 Days"
                icon={AlertTriangle}
                color="orange"
                products={data.critical}
              />
            )}

            {/* Soon (within 30 days) */}
            {data.soon.length > 0 && (
              <ExpirySection
                title="Expiring Within 30 Days"
                icon={CalendarClock}
                color="amber"
                products={data.soon}
              />
            )}

            {/* Warning (within 90 days) */}
            {data.warning.length > 0 && (
              <ExpirySection
                title="Expiring Within 90 Days"
                icon={CalendarClock}
                color="blue"
                products={data.warning}
              />
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Section component for each urgency level ────────────────────────────────

function ExpirySection({ title, icon: Icon, color, products }: {
  title: string
  icon: React.ElementType
  color: 'red' | 'orange' | 'amber' | 'blue'
  products: ExpiringProduct[]
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
          </div>
        ))}
      </div>
    </div>
  )
}
