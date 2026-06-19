'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ShoppingCart, LayoutDashboard, Package, ReceiptText, Boxes, Store } from 'lucide-react'

export type ViewType = 'dashboard' | 'pos' | 'products' | 'orders' | 'inventory'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  cartCount: number
}

const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'New Sale', icon: ShoppingCart },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
]

export function Sidebar({ currentView, onNavigate, cartCount }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col brand-bg-dark text-white shrink-0">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/20">
              <Image
                src="/veeskin-brand.jpg"
                alt="VeeSkin Essentials"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight brand-gradient-text">VeeSkin</h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/70 mt-0.5">Essentials POS</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'brand-gradient text-white shadow-lg shadow-pink-900/20'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'pos' && cartCount > 0 && (
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
            <div className="w-9 h-9 rounded-full brand-gradient flex items-center justify-center text-white font-semibold text-sm">
              VS
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">Boutique Staff</p>
              <p className="text-xs text-white/60 truncate">Station #1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 brand-bg-dark border-t border-white/10 z-50">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-1 text-[10px] font-medium relative',
                  active ? 'text-white' : 'text-white/60'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === 'pos' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#D4A574] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span>{item.label.split(' ')[0]}</span>
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full brand-gradient" />}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
