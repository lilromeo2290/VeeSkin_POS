'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, AlertTriangle, ArrowUpRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { toast } from 'sonner'

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
  lowStockProducts: { id: string; name: string; sku: string; stock: number; lowStock: number }[]
}

const PIE_COLORS = ['#D4A574', '#E6A9B6', '#D4AF37', '#C77B8E', '#A67C52', '#B89A7A']

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Failed to load dashboard')
        const json = await res.json()
        setData(json)
      } catch (e) {
        toast.error('Failed to load dashboard data')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
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

  const stats = [
    {
      label: "Today's Revenue",
      value: `$${data.today.revenue.toFixed(2)}`,
      change: data.today.revenueChange,
      icon: DollarSign,
      color: 'rosegold',
    },
    {
      label: "Today's Orders",
      value: data.today.orders,
      change: null,
      icon: ShoppingBag,
      color: 'pink',
    },
    {
      label: 'Items Sold',
      value: data.today.itemsSold,
      change: null,
      icon: Package,
      color: 'gold',
    },
    {
      label: 'Avg. Order Value',
      value: `$${data.today.avgOrderValue.toFixed(2)}`,
      change: null,
      icon: TrendingUp,
      color: 'rose',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorMap: Record<string, string> = {
            rosegold: 'bg-[#D4A574]/10 text-[#D4A574]',
            pink: 'bg-[#E6A9B6]/15 text-[#C77B8E]',
            gold: 'bg-[#D4AF37]/15 text-[#A67C00]',
            rose: 'bg-[#C77B8E]/15 text-[#C77B8E]',
          }
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[stat.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                {stat.change !== null && (
                  <div className="mt-3 flex items-center gap-1 text-xs">
                    {stat.change >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-[#D4A574]" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span className={stat.change >= 0 ? 'text-[#D4A574] font-medium' : 'text-red-600 font-medium'}>
                      {Math.abs(stat.change)}%
                    </span>
                    <span className="text-muted-foreground">vs yesterday</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sales chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales - Last 7 Days</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total: <span className="font-semibold text-foreground">${data.week.revenue.toFixed(2)}</span> across{' '}
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
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.last7Days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#D4A574"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <p className="text-sm text-muted-foreground">By quantity sold (last 100 orders)</p>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((p, idx) => (
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
                    <p className="text-sm font-semibold">${p.revenue.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Revenue distribution</p>
          </CardHeader>
          <CardContent>
            {data.categoryData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No category data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.categoryData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <p className="text-sm text-muted-foreground">Latest transactions</p>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center shrink-0">
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
                      <p className="text-sm font-semibold">${order.total.toFixed(2)}</p>
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

        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <CardTitle>Low Stock Alerts</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{data.lowStockProducts.length} items need restocking</p>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All stocked up</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'}>
                      {p.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
