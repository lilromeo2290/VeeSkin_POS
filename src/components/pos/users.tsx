'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Search, Plus, Pencil, Trash2, Users as UsersIcon, Loader2, Shield, Crown, UserCog, Eye, EyeOff, Mail
} from 'lucide-react'
import { toast } from 'sonner'

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER'

interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
}

interface UsersManagerProps {
  currentUser: CurrentUser
}

interface FormState {
  id?: string
  name: string
  email: string
  password: string
  role: Role
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'CASHIER',
  isActive: true,
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: React.ElementType; description: string }> = {
  ADMIN: { label: 'Admin', color: 'bg-[#D4A574] text-white', icon: Crown, description: 'Full access including user management' },
  MANAGER: { label: 'Manager', color: 'bg-[#E6A9B6] text-white', icon: Shield, description: 'Products, inventory, orders, dashboard' },
  CASHIER: { label: 'Cashier', color: 'bg-[#D4AF37] text-white', icon: UserCog, description: 'POS terminal and own order history' },
}

export function UsersManager({ currentUser }: UsersManagerProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      setUsers(json)
    } catch (e) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '', // blank = no change
      role: user.role,
      isActive: user.isActive,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    if (!form.id && !form.password) {
      toast.error('Password is required for new users')
      return
    }
    if (form.password && form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        isActive: form.isActive,
      }
      if (form.password) payload.password = form.password

      const url = form.id ? `/api/users/${form.id}` : '/api/users'
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Save failed')
      }
      toast.success(form.id ? 'User updated' : 'User created')
      setDialogOpen(false)
      await loadUsers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('User deleted')
      setDeleteTarget(null)
      await loadUsers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user')
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    managers: users.filter((u) => u.role === 'MANAGER').length,
    cashiers: users.filter((u) => u.role === 'CASHIER').length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#D4A574]/10 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-[#D4A574]" />
              </div>
            </div>
          </CardContent>
        </Card>
        {(['ADMIN', 'MANAGER', 'CASHIER'] as Role[]).map((role) => {
          const cfg = ROLE_CONFIG[role]
          const Icon = cfg.icon
          const count = role === 'ADMIN' ? stats.admins : role === 'MANAGER' ? stats.managers : stats.cashiers
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{cfg.label}s</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openCreate} className="brand-gradient hover:opacity-90 border-0 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
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
              <UsersIcon className="w-12 h-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
                    const cfg = ROLE_CONFIG[user.role]
                    const RoleIcon = cfg.icon
                    const isSelf = user.id === currentUser.id
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${cfg.color} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                              {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1.5">
                                {user.name}
                                {isSelf && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} gap-1`}>
                            <RoleIcon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(user)}
                              disabled={isSelf}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {form.id ? 'Update user details and permissions' : 'Create a new staff account'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full Name *</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Maya Patel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="maya@veeskin.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">
                {form.id ? 'New Password (leave blank to keep current)' : 'Password *'}
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={form.id ? '••••••••' : 'Min 6 characters'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['ADMIN', 'MANAGER', 'CASHIER'] as Role[]).map((r) => {
                    const cfg = ROLE_CONFIG[r]
                    const Icon = cfg.icon
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">— {cfg.description}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="user-active" className="font-medium cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive users cannot log in</p>
              </div>
              <Switch
                id="user-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="brand-gradient hover:opacity-90 border-0">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {form.id ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              This action cannot be undone. Their order history will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
