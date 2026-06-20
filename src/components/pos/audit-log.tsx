'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Search, Shield, Loader2, LogIn, LogOut, Plus, Pencil, Trash2, ShoppingBag,
  AlertTriangle, Monitor, MapPin, Clock, User
} from 'lucide-react'

interface AuditLog {
  id: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  userRole: string | null
  action: string
  entity: string
  entityId: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  statusCode: number | null
  method: string | null
  path: string | null
  createdAt: string
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LOGIN: { icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  LOGOUT: { icon: LogOut, color: 'text-blue-600', bg: 'bg-blue-100' },
  LOGIN_FAILED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  CREATE: { icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  UPDATE: { icon: Pencil, color: 'text-amber-600', bg: 'bg-amber-100' },
  DELETE: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100' },
}

const DEFAULT_ACTION_CONFIG = { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted' }

function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown'
  let browser = 'Unknown', os = 'Unknown'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/')) browser = 'Safari'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Linux')) os = 'Linux'
  return `${browser} on ${os}`
}

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    loadLogs()
  }, [search, actionFilter, entityFilter])

  async function loadLogs() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (actionFilter !== 'all') params.set('action', actionFilter)
    if (entityFilter !== 'all') params.set('entity', entityFilter)
    if (search) params.set('search', search)
    try {
      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setLogs(json)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: logs.length,
    logins: logs.filter(l => l.action === 'LOGIN').length,
    failedLogins: logs.filter(l => l.action === 'LOGIN_FAILED').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
    creates: logs.filter(l => l.action === 'CREATE').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#D4A574]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Logins</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.logins}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Failed Attempts</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.failedLogins}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Deletes</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{stats.deletes}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="LOGIN">Logins</SelectItem>
                <SelectItem value="LOGOUT">Logouts</SelectItem>
                <SelectItem value="LOGIN_FAILED">Failed Logins</SelectItem>
                <SelectItem value="CREATE">Creates</SelectItem>
                <SelectItem value="UPDATE">Updates</SelectItem>
                <SelectItem value="DELETE">Deletes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="company_info">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION_CONFIG
                    const ActionIcon = config.icon
                    return (
                      <TableRow key={log.id} className={log.action === 'LOGIN_FAILED' ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                              <ActionIcon className={`w-3.5 h-3.5 ${config.color}`} />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{log.action}</p>
                              <p className="text-[10px] text-muted-foreground">{log.entity}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.userName ? (
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{log.userName}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
                                {log.userRole && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 shrink-0">{log.userRole}</Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unknown user</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-xs">{log.description}</p>
                          {log.method && log.path && (
                            <p className="text-[10px] text-muted-foreground font-mono">{log.method} {log.path} → {log.statusCode}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {log.ipAddress || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Monitor className="w-3 h-3" />
                            {describeDevice(log.userAgent)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
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
    </div>
  )
}
