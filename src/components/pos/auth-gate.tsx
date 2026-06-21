'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, LogIn, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { type SessionUser } from '@/lib/auth-types'

interface AuthGateProps {
  onAuthenticated: (user: SessionUser) => void
}

type Mode = 'login' | 'setup'

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Check if setup is needed (no users exist yet)
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/auth/setup')
        const data = await res.json()
        if (data.needsSetup) {
          setMode('setup')
        }
      } catch {
        // Default to login
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (mode === 'setup') {
        if (!name.trim()) {
          toast.error('Name is required')
          return
        }
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role: 'ADMIN' }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Setup failed')
          return
        }
        toast.success(`Welcome, ${data.user.name}! Admin account created.`)
        onAuthenticated(data.user)
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Login failed')
          return
        }
        toast.success(`Welcome back, ${data.user.name}!`)
        onAuthenticated(data.user)
      }
    } catch (err) {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function fillDemoCreds(role: 'admin' | 'manager' | 'cashier') {
    setEmail(`${role}@veeskin.com`)
    setPassword('password123')
    setMode('login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-bg-dark">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A574]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center brand-bg-dark p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10 mb-4">
            <Image
              src="/veeskin-brand.jpg"
              alt="VeeSkin Essentials"
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold brand-gradient-text">VeeSkin</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-white/70 mt-1">Essentials POS</p>
        </div>

        <Card className="border-white/10 bg-white/95 backdrop-blur">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              {mode === 'setup' ? (
                <ShieldCheck className="w-5 h-5 text-[#D4A574]" />
              ) : (
                <LogIn className="w-5 h-5 text-[#D4A574]" />
              )}
              <CardTitle className="text-xl">
                {mode === 'setup' ? 'Initial Setup' : 'Sign In'}
              </CardTitle>
            </div>
            <CardDescription>
              {mode === 'setup'
                ? 'Create the first admin account to get started'
                : 'Enter your credentials to access the POS system'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'setup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Isabella Romano"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@veeskin.com"
                  required
                  autoComplete="email"
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'setup' && (
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 brand-gradient hover:opacity-90 border-0 font-semibold"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>
                    {mode === 'setup' ? 'Create Admin Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/50 mt-6">
          VeeSkin Essentials · Secure POS System
        </p>
      </div>
    </div>
  )
}
