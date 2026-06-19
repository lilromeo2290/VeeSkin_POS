'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Sidebar, type ViewType } from '@/components/pos/sidebar'
import { Dashboard } from '@/components/pos/dashboard'
import { PosTerminal } from '@/components/pos/pos-terminal'
import { ProductsManager } from '@/components/pos/products'
import { OrdersView } from '@/components/pos/orders'
import { InventoryView } from '@/components/pos/inventory'
import { UsersManager } from '@/components/pos/users'
import { SettingsView } from '@/components/pos/settings'
import { AuthGate } from '@/components/pos/auth-gate'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { canUserAccessView, type SessionUser } from '@/lib/auth-types'

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [view, setView] = useState<ViewType>('dashboard')
  const [seeding, setSeeding] = useState(false)
  const [needsSeed, setNeedsSeed] = useState<boolean | null>(null)
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  // Check auth state on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            // Pick a default view the user has permission for
            const defaultView: ViewType =
              canUserAccessView(data.user, 'dashboard') ? 'dashboard' :
              canUserAccessView(data.user, 'pos') ? 'pos' :
              'orders'
            setView(defaultView)
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Once authenticated, check if seed is needed
  useEffect(() => {
    if (!user) return
    async function checkSeed() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.status === 401 || res.status === 403) return
        const data = await res.json()
        setNeedsSeed(!data || data.products?.total === 0)
      } catch {
        setNeedsSeed(true)
      }
    }
    // Only admins see the "needs seed" screen; managers/cashiers assume data exists
    if (user.role === 'ADMIN') {
      checkSeed()
    } else {
      setNeedsSeed(false)
    }
  }, [user])

  async function handleAuthenticated(u: SessionUser) {
    setUser(u)
    const defaultView: ViewType =
      canUserAccessView(u, 'dashboard') ? 'dashboard' :
      canUserAccessView(u, 'pos') ? 'pos' :
      'orders'
    setView(defaultView)
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      useCartStore.getState().clear()
      toast.success('Signed out')
    } catch {
      toast.error('Logout failed')
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Seed failed')
      }
      const data = await res.json()
      toast.success(data.message)
      setNeedsSeed(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (e: any) {
      toast.error(e.message || 'Failed to seed data')
    } finally {
      setSeeding(false)
    }
  }

  async function handleReseed() {
    if (!confirm('This will replace ALL data (including users) with fresh demo data. You will be logged out. Continue?')) return
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      if (!res.ok) throw new Error('Seed failed')
      const data = await res.json()
      toast.success('Data reset. Please log in again with demo credentials.')
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      toast.error('Failed to reseed')
      setSeeding(false)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-bg-dark">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A574]" />
      </div>
    )
  }

  // Not authenticated → show login/setup gate
  if (!user) {
    return <AuthGate onAuthenticated={handleAuthenticated} />
  }

  // Admin sees setup screen if no products
  if (needsSeed) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-bg-dark text-white p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10">
            <Image
              src="/veeskin-brand.jpg"
              alt="VeeSkin Essentials"
              fill
              sizes="128px"
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
              Welcome, {user.name}! Your admin account is ready. Now load the demo catalog of skincare &
              perfume products to start selling.
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
                Loading catalog...
              </>
            ) : (
              <>
                Load Demo Catalog
              </>
            )}
          </Button>
          <p className="text-xs text-white/50">
            6 categories · 35+ products · 25 sample orders · 3 demo staff accounts
          </p>
          <button
            onClick={handleLogout}
            className="text-xs text-white/50 underline hover:text-white/80"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Guard: if the current view is not permitted, fall back to a permitted one
  const effectiveView: ViewType = canUserAccessView(user, view) ? view : (
    canUserAccessView(user, 'pos') ? 'pos' :
    canUserAccessView(user, 'orders') ? 'orders' :
    'pos'
  )

  return (
    <div className="min-h-screen flex bg-muted/30">
      <Sidebar
        currentView={effectiveView}
        onNavigate={setView}
        cartCount={cartCount}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-semibold capitalize">
              {effectiveView === 'pos' ? 'Point of Sale' : effectiveView === 'users' ? 'User Management' : effectiveView}
            </h2>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'ADMIN' && (
              <Button variant="outline" size="sm" onClick={handleReseed} disabled={seeding}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reset Demo Data
              </Button>
            )}
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
              {effectiveView === 'pos' ? 'POS' : effectiveView === 'users' ? 'Users' : effectiveView}
            </h2>
          </div>
        </header>

        {/* View content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          {effectiveView === 'dashboard' && <Dashboard />}
          {effectiveView === 'pos' && <PosTerminal />}
          {effectiveView === 'products' && <ProductsManager />}
          {effectiveView === 'orders' && <OrdersView />}
          {effectiveView === 'inventory' && <InventoryView />}
          {effectiveView === 'users' && user.role === 'ADMIN' && <UsersManager currentUser={user} />}
          {effectiveView === 'settings' && user.role === 'ADMIN' && <SettingsView />}
        </div>
      </main>
    </div>
  )
}
