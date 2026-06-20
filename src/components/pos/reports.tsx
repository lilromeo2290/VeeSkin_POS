'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package,
  AlertTriangle, PackageX, RefreshCw, Calendar, Trophy, Percent, Loader2
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Line, LineChart
} from 'recharts'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'sonner'

interface ReportData {
  sales: {
    today: PeriodSummary
    week: PeriodSummary
    month: PeriodSummary
    year: PeriodSummary
  }
  dailyBreakdown: { date: string; label: string; revenue: number; orders: number }[]
  monthlyBreakdown: { month: string; revenue: number; cost: number; profit: number; orders: number }[]
  profitLoss: {
    today: PLSummary
    week: PLSummary
    month: PLSummary
    year: PLSummary
  }
  bestSellers: {
    name: string
    sku: string
    category: string | null
    quantity: number
    revenue: number
    cost: number
    profit: number
  }[]
  lowStockAlerts: {
    id: string
    name: string
    sku: string
    category: string | null
    currentStock: number
    minStock: number
    reorderPoint: number
    maxStock: number
    status: 'OUT_OF_STOCK' | 'LOW' | 'REORDER'
    batchNumber: string | null
    expiryDate: string | null
  }[]
  generatedAt: string
}

interface PeriodSummary {
  revenue: number
  cost: number
  grossProfit: number
  margin: number
  orderCount: number
  itemsSold: number
  avgOrderValue: number
}

interface PLSummary {
  revenue: number
  cost: number
  profit: number
  margin: number
}

const CHART_COLORS = {
  revenue: '#D4A574',
  cost: '#ef4444',
  profit: '#10b981',
  orders: '#E6A9B6',
}

export function ReportsView() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/reports')
        if (!res.ok) throw new Error('Failed to load reports')
        const json = await res.json()
        setData(json)
      } catch (e) {
        toast.error('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Section 1: Sales Reports ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Sales Reports</h2>
        </div>

        {/* Period summary cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
          <PeriodCard
            label="Today"
            summary={data.sales.today}
            icon={Calendar}
            color="emerald"
          />
          <PeriodCard
            label="This Week"
            summary={data.sales.week}
            icon={Calendar}
            color="amber"
          />
          <PeriodCard
            label="This Month"
            summary={data.sales.month}
            icon={Calendar}
            color="violet"
          />
          <PeriodCard
            label="This Year"
            summary={data.sales.year}
            icon={Calendar}
            color="cyan"
          />
        </div>

        {/* Daily sales chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Sales (Last 7 Days)</CardTitle>
            <CardDescription>Revenue and order count by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.dailyBreakdown}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value: number, name: string) =>
                    name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, 'Orders']
                  }
                />
                <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.revenue} strokeWidth={2.5} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 2: Profit/Loss Summary ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Profit / Loss Summary</h2>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
          <PLCard label="Today" pl={data.profitLoss.today} />
          <PLCard label="This Week" pl={data.profitLoss.week} />
          <PLCard label="This Month" pl={data.profitLoss.month} />
          <PLCard label="This Year" pl={data.profitLoss.year} />
        </div>

        {/* Monthly P/L chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Profit/Loss (Last 6 Months)</CardTitle>
            <CardDescription>Revenue vs Cost vs Profit comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill={CHART_COLORS.profit} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 3: Best-Selling Products ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#D4A574]" />
          <h2 className="text-lg font-semibold">Best-Selling Products</h2>
        </div>

        <Card>
          <CardContent className="p-0">
            {data.bestSellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Package className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No sales data yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.bestSellers.map((item, idx) => (
                  <div key={item.sku} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-100 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">{item.sku}</span>
                        {item.category && (
                          <Badge variant="outline" className="text-[9px] py-0">{item.category}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-sm font-bold">{item.quantity}</p>
                      <p className="text-[10px] text-muted-foreground">sold</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#D4A574]">{formatCurrency(item.revenue)}</p>
                      <p className="text-[10px] text-emerald-600">+{formatCurrency(item.profit)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 4: Low Stock Alerts ─── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
          {data.lowStockAlerts.length > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {data.lowStockAlerts.length} item{data.lowStockAlerts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {data.lowStockAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Package className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">All products are well stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.lowStockAlerts.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-muted/30">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      item.status === 'OUT_OF_STOCK' ? 'bg-red-100' : 'bg-amber-100'
                    }`}>
                      {item.status === 'OUT_OF_STOCK' ? (
                        <PackageX className="w-4 h-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <p className={`text-lg font-bold ${
                        item.status === 'OUT_OF_STOCK' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {item.currentStock}
                      </p>
                      <p className="text-[10px] text-muted-foreground">in stock</p>
                    </div>
                    <div className="text-center shrink-0 text-xs">
                      <p className="text-muted-foreground">Reorder: <span className="font-medium text-foreground">{item.reorderPoint}</span></p>
                      <p className="text-muted-foreground">Min: <span className="font-medium text-foreground">{item.minStock}</span></p>
                    </div>
                    <Badge
                      variant={item.status === 'OUT_OF_STOCK' ? 'destructive' : 'secondary'}
                      className={`shrink-0 ${
                        item.status === 'LOW' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'REORDER' ? 'bg-blue-100 text-blue-700' : ''
                      }`}
                    >
                      {item.status === 'OUT_OF_STOCK' ? 'Out of Stock' :
                       item.status === 'LOW' ? 'Low Stock' : 'Reorder'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Report generated: {new Date(data.generatedAt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PeriodCard({ label, summary, icon: Icon, color }: {
  label: string
  summary: PeriodSummary
  icon: React.ElementType
  color: string
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
    cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-xl font-bold text-[#D4A574]">{formatCurrency(summary.revenue)}</p>
        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
          <div>
            <span className="text-muted-foreground">Orders: </span>
            <span className="font-medium">{summary.orderCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Items: </span>
            <span className="font-medium">{summary.itemsSold}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg: </span>
            <span className="font-medium">{formatCurrency(summary.avgOrderValue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Margin: </span>
            <span className="font-medium text-emerald-600">{summary.margin}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PLCard({ label, pl }: { label: string; pl: PLSummary }) {
  const isProfit = pl.profit >= 0
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
        <p className={`text-xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
          {isProfit ? '+' : ''}{formatCurrency(pl.profit)}
        </p>
        <div className="space-y-0.5 mt-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-medium">{formatCurrency(pl.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">{formatCurrency(pl.cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin:</span>
            <span className={`font-medium ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>{pl.margin}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
