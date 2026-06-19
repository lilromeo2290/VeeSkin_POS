'use client'

import { useEffect, useState } from 'react'
import { Sidebar, type ViewType } from '@/components/pos/sidebar'
import { Dashboard } from '@/components/pos/dashboard'
import { PosTerminal } from '@/components/pos/pos-terminal'
import { ProductsManager } from '@/components/pos/products'
import { OrdersView } from '@/components/pos/orders'
import { InventoryView } from '@/components/pos/inventory'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import { Loader2, Database, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function Home() {
  const [view, setView] = useState<ViewType>('dashboard')
  const [seeding, setSeeding] = useState(false)
  const [needsSeed, setNeedsSeed] = useState<boolean | null>(null)
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  useEffect(() => {
    async function checkSeed() {
      try {
        const res = await fetch('/api/dashboard')
        const data = await res.json()
        setNeedsSeed(!data || data.products.total === 0)
      } catch {
        setNeedsSeed(true)
      }
    }
    checkSeed()
  }, [])

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (!res.ok) throw new Error('Seed failed')
      const data = await res.json()
      toast.success(data.message)
      setNeedsSeed(false)
      // Reload the page to refresh data
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      toast.error('Failed to seed data')
    } finally {
      setSeeding(false)
    }
  }

  async function handleReseed() {
    if (!confirm('This will replace all existing data with fresh demo data. Continue?')) return
    await handleSeed()
  }

  if (needsSeed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (needsSeed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 dark:from-emerald-950 dark:via-background dark:to-amber-950 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Brew POS</h1>
            <p className="text-muted-foreground">
              Your Point of Sale system is ready to set up. Load demo data including products,
              categories, and sample orders to get started instantly.
            </p>
          </div>
          <Button
            onClick={handleSeed}
            disabled={seeding}
            size="lg"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
          >
            {seeding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Load Demo Data
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Includes 6 categories, 35+ products, and 25 sample orders
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      <Sidebar currentView={view} onNavigate={setView} cartCount={cartCount} />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-semibold capitalize">
              {view === 'pos' ? 'Point of Sale' : view}
            </h2>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReseed} disabled={seeding}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Demo Data
            </Button>
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold capitalize">
              {view === 'pos' ? 'POS' : view}
            </h2>
          </div>
        </header>

        {/* View content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {view === 'dashboard' && <Dashboard />}
          {view === 'pos' && <PosTerminal />}
          {view === 'products' && <ProductsManager />}
          {view === 'orders' && <OrdersView />}
          {view === 'inventory' && <InventoryView />}
        </div>
      </main>
    </div>
  )
}
