'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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
      <div className="min-h-screen flex items-center justify-center brand-bg-dark">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A574]" />
      </div>
    )
  }

  if (needsSeed) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-bg-dark text-white p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
            <Image
              src="/veeskin-brand.jpg"
              alt="VeeSkin Essentials"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-bold tracking-tight brand-gradient-text">VeeSkin</h1>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70 mt-1">Essentials</p>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              Welcome to your boutique point-of-sale system. Load the demo catalog of skincare &
              perfume products to begin processing sales and managing inventory.
            </p>
          </div>
          <Button
            onClick={handleSeed}
            disabled={seeding}
            size="lg"
            className="w-full h-12 brand-gradient hover:opacity-90 text-white text-base font-semibold border-0 shadow-lg shadow-pink-900/30"
          >
            {seeding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Setting up boutique...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Load Demo Catalog
              </>
            )}
          </Button>
          <p className="text-xs text-white/50">
            6 categories · 35+ skincare &amp; perfume products · 25 sample orders
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
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-border">
              <Image
                src="/veeskin-brand.jpg"
                alt="VeeSkin"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
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
