'use client'

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
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Brew POS</h1>
              <p className="text-xs text-muted-foreground">Point of Sale</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.id === 'pos' && cartCount > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-sm">
              DC
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Demo Cashier</p>
              <p className="text-xs text-muted-foreground truncate">Station #1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
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
                  active ? 'text-emerald-600' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.id === 'pos' && cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span>{item.label.split(' ')[0]}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
