'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package,
  AlertTriangle, ArrowUpRight, Trophy, AlertCircle, CheckCircle2,
  PackageX, RefreshCw, CalendarClock, Info, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/currency'
import { ExpiryAlertBanner } from '@/components/pos/expiry-alert'
import type { ViewType } from '@/components/pos/sidebar'

interface DashboardData {
  today: { revenue: number; orders: number; itemsSold: number; avgOrderValue: number; revenueChange: number }
  week: { revenue: number; orders: number }
  month: { revenue: number; orders: number }
  products: { total: number; active: number; lowStock: number; outOfStock: number }
  hourlyData: { hour: string; sales: number; orders: number }[]
  last7Days: { date: string; label: string; sales: number; orders: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  paymentBreakdown: { CASH: number; CARD: number; DIGITAL: number }
  categoryData: { name: string; value: number }[]
  recentOrders: {
    id: string; orderNumber: string; total: number; itemsCount: number;
    paymentMethod: string; createdAt: string; status: string
  }[]
  lowStockProducts: { id: string; name: string; sku: string; stock: number; lowStock: number; reorderPoint: number; category: string | null }[]
  issues: Array<{ type: string; severity: 'critical' | 'warning' | 'info'; message: string; count: number }>
  expiredProducts: { id: string; name: string; sku: string; expiryDate: string | null }[]
  expiringProducts: { id: string; name: string; sku: string; expiryDate: string | null }[]
}

interface DashboardProps {
  onNavigate?: (view: ViewType) => void
}

const PIE_COLORS = ['#D4A574', '#E6A9B6', '#D4AF37', '#C77B8E', '#A67C52', '#B89A7A']

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) throw new Error('Failed to load dashboard')
        const json = await res.json()
        setData(json)
      } catch (e) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
    // Refresh every 15 seconds so deleted products disappear from issues
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Expiry alert banner */}
      <ExpiryAlertBanner />

      {/* ─── Section 1: How much have we sold today? ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Today's Sales</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Revenue */}
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Revenue Today</p>
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(data.today.revenue)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#D4A574]/10">
                  <DollarSign className="w-5 h-5 text-[#D4A574]" />
                </div>
              </div>
              {data.today.revenueChange !== 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs">
                  {data.today.revenueChange >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span className={data.today.revenueChange >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {Math.abs(data.today.revenueChange)}%
                  </span>
                  <span className="text-muted-foreground">vs yesterday</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Transactions</p>
                  <p className="text-2xl font-bold tracking-tight">{data.today.orders}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#E6A9B6]/15">
                  <ShoppingBag className="w-5 h-5 text-[#C77B8E]" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">This week: </span>
                <span className="font-medium">{data.week.orders} orders</span>
              </div>
            </CardContent>
          </Card>

          {/* Items Sold */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Items Sold</p>
                  <p className="text-2xl font-bold tracking-tight">{data.today.itemsSold}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#D4AF37]/15">
                  <Package className="w-5 h-5 text-[#A67C00]" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Avg order: </span>
                <span className="font-medium">{formatCurrency(data.today.avgOrderValue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Month Revenue</p>
                  <p className="text-2xl font-bold tracking-tight">{formatCurrency(data.month.revenue)}</p>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-cyan-50">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Month orders: </span>
                <span className="font-medium">{data.month.orders}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales chart */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sales — Last 7 Days</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total: <span className="font-semibold text-foreground">{formatCurrency(data.week.revenue)}</span> across{' '}
                  <span className="font-semibold text-foreground">{data.week.orders}</span> orders
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <ArrowUpRight className="w-3 h-3" />
                7D
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.last7Days}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="sales" stroke="#D4A574" strokeWidth={2.5} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 2: Recent Transactions ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#D4A574]" />
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
          </div>
          {onNavigate && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('orders')}>
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {data.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <ShoppingBag className="w-8 h-8 text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">No transactions yet today</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {data.recentOrders.slice(0, 6).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#D4A574]/10 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-[#D4A574]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.itemsCount} items • {order.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 3: What products are selling the most? ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Top Selling Products</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top products list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Best Sellers (Last 100 Orders)</CardTitle>
              <CardDescription>By quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.slice(0, 5).map((p, idx) => (
                    <div key={p.name} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.quantity} sold</p>
                      </div>
                      <p className="text-sm font-semibold text-[#D4A574]">{formatCurrency(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sales by Category</CardTitle>
              <CardDescription>Revenue distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No category data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Section 4: Are we running low on stock? ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Stock Status</h2>
          </div>
          {onNavigate && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('inventory')}>
              Manage Inventory
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold mt-1">{data.products.total}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#D4A574]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{data.products.lowStock}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">{data.products.outOfStock}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <PackageX className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Need Reorder</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600">
                    {data.lowStockProducts.filter(p => p.stock > 0 && p.stock <= p.reorderPoint).length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low stock products list */}
        {data.lowStockProducts.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {data.lowStockProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/30">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      p.stock === 0 ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {p.stock === 0 ? (
                        <PackageX className="w-4 h-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className={`text-sm font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.stock}
                      </p>
                      <p className="text-[10px] text-muted-foreground">in stock</p>
                    </div>
                    <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'} className="shrink-0">
                      {p.stock === 0 ? 'Out' : 'Low'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Section 5: Are there any issues that require attention? ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Issues Requiring Attention</h2>
        </div>

        {data.issues.length === 0 ? (
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All Clear!</p>
                <p className="text-xs text-muted-foreground">No issues require attention at this time.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.issues.map((issue, idx) => {
              const config = {
                critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200 bg-red-50/50 dark:bg-red-950/20' },
                warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20' },
                info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20' },
              }
              const c = config[issue.severity]
              const Icon = c.icon
              return (
                <Card key={idx} className={c.border}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                      <Icon className={`w-4 h-4 ${c.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{issue.message}</p>
                      <p className="text-xs text-muted-foreground capitalize">{issue.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant="outline" className={c.bg}>
                      {issue.count}
                    </Badge>
                    {onNavigate && (issue.type === 'out_of_stock' || issue.type === 'low_stock' || issue.type === 'reorder') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => onNavigate('inventory')}
                      >
                        Review
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
