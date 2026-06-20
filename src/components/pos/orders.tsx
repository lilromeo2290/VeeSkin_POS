'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Search, ReceiptText, Eye, Banknote, CreditCard, Smartphone, Loader2, Calendar, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { Receipt } from '@/components/pos/receipt'
import { printReceipt } from '@/lib/print-receipt'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  subtotal: number
  product?: { id: string; name: string; sku: string } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentMethod: string
  subtotal: number
  tax: number
  discount: number
  taxableAmount: number
  nhil: number
  getfund: number
  vat: number
  total: number
  amountTendered: number
  changeGiven: number
  itemsCount: number
  customerName: string | null
  cashierName: string | null
  createdAt: string
  items?: OrderItem[]
}

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  CASH: Banknote,
  CARD: CreditCard,
  DIGITAL: Smartphone,
}

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    async function loadOrders() {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/orders?${params}`)
      const json = await res.json()
      setOrders(json)
      setLoading(false)
    }
    loadOrders()
  }, [statusFilter])

  const filtered = orders.filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.customerName || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = filtered.reduce((s, o) => s + o.total, 0)
  const totalItems = filtered.reduce((s, o) => s + o.itemsCount, 0)

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold mt-1 text-[#D4A574]">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Items Sold</p>
            <p className="text-2xl font-bold mt-1">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Order Value</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(filtered.length > 0 ? (totalRevenue / filtered.length) : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <ReceiptText className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const PayIcon = PAYMENT_ICONS[order.paymentMethod] || Banknote
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium text-sm">{order.orderNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{order.customerName || 'Walk-in'}</span>
                        </TableCell>
                        <TableCell className="text-center">{order.itemsCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <PayIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs">{order.paymentMethod}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(order.tax)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'COMPLETED' ? 'default' : order.status === 'REFUNDED' ? 'destructive' : 'secondary'}
                            className={order.status === 'COMPLETED' ? 'bg-[#D4A574]' : ''}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={async () => {
                              const res = await fetch(`/api/orders/${order.id}`)
                              const json = await res.json()
                              setSelectedOrder(json)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order detail dialog — thermal receipt format */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[340px] max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white border-gray-300" style={{ borderRadius: '4px' }}>
          <DialogHeader className="sr-only">
            <DialogTitle>Receipt {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>Order receipt</DialogDescription>
          </DialogHeader>

          {selectedOrder && selectedOrder.items && (
            <Receipt order={{ ...selectedOrder, items: selectedOrder.items }} />
          )}

          <div className="flex gap-2 p-3 no-print border-t border-dashed border-gray-300">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => selectedOrder && selectedOrder.items && printReceipt({ ...selectedOrder, items: selectedOrder.items })}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              className="flex-1 brand-gradient hover:opacity-90 border-0"
              onClick={() => setSelectedOrder(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
