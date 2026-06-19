'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Building2, Phone, Receipt, Percent, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { CompanyInfo } from '@/lib/company-config'

export function SettingsView() {
  const [info, setInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/company-info')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setInfo(data)
      } catch {
        toast.error('Failed to load company info')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    if (!info) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/company-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...info,
          address: info.address.replace(/\n/g, '\\n'), // store newlines as \n
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      const updated = await res.json()
      setInfo({ ...updated, address: updated.address.replace(/\\n/g, '\n') })
      toast.success('Business information saved — will appear on all new receipts')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof CompanyInfo>(key: K, value: CompanyInfo[K]) {
    if (!info) return
    setInfo({ ...info, [key]: value })
  }

  if (loading || !info) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#D4A574]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edit your business information — changes appear on all new receipts
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="brand-gradient hover:opacity-90 border-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {/* Business Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D4A574]" />
            <div>
              <CardTitle>Business Identity</CardTitle>
              <CardDescription>Your business name and branding shown on receipts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={info.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="VeeSkin Essentials"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline / Subtitle</Label>
              <Input
                id="tagline"
                value={info.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                placeholder="Skincare & Perfume Boutique"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="logoUrl"
                value={info.logoUrl || ''}
                onChange={(e) => update('logoUrl', e.target.value)}
                placeholder="/veeskin-brand.jpg or https://..."
              />
              {info.logoUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
                  <img src={info.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Upload your logo to /public/ and reference it here, or use a full URL
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#D4A574]" />
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Address, phone, WhatsApp, and email</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address (use Enter for line breaks)</Label>
            <Textarea
              id="address"
              value={info.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Osu, Oxford Street&#10;Accra, Ghana"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={info.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+233 24 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                value={info.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                placeholder="+233 24 123 4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={info.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="hello@veeskin.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                value={info.website || ''}
                onChange={(e) => update('website', e.target.value || null)}
                placeholder="www.veeskin.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">TIN — Tax Identification Number</Label>
            <Input
              id="tin"
              value={info.tin || ''}
              onChange={(e) => update('tin', e.target.value || null)}
              placeholder="TIN-000-0000-000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#D4A574]" />
            <div>
              <CardTitle>Tax Rates (Ghana)</CardTitle>
              <CardDescription>NHIL, GETFund, and VAT rates applied to all sales</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nhilRate">NHIL Rate</Label>
              <div className="relative">
                <Input
                  id="nhilRate"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={info.nhilRate}
                  onChange={(e) => update('nhilRate', parseFloat(e.target.value) || 0)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {(info.nhilRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="getfundRate">GETFund Rate</Label>
              <div className="relative">
                <Input
                  id="getfundRate"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={info.getfundRate}
                  onChange={(e) => update('getfundRate', parseFloat(e.target.value) || 0)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {(info.getfundRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate</Label>
              <div className="relative">
                <Input
                  id="vatRate"
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={info.vatRate}
                  onChange={(e) => update('vatRate', parseFloat(e.target.value) || 0)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {(info.vatRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Total Tax Rate: </span>
            <span className="font-bold">{((info.nhilRate + info.getfundRate + info.vatRate) * 100).toFixed(1)}%</span>
            <span className="text-muted-foreground ml-2">
              (NHIL + GETFund + VAT)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D4A574]" />
            <div>
              <CardTitle>Receipt Messages</CardTitle>
              <CardDescription>Custom text shown at the bottom of every receipt</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="footerMessage">Footer Message (thank you note)</Label>
            <Input
              id="footerMessage"
              value={info.footerMessage}
              onChange={(e) => update('footerMessage', e.target.value)}
              placeholder="Thank you for shopping with us!"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refundPolicy">Refund / Return Policy</Label>
            <Input
              id="refundPolicy"
              value={info.refundPolicy}
              onChange={(e) => update('refundPolicy', e.target.value)}
              placeholder="Goods sold are not returnable."
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button (bottom) */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="brand-gradient hover:opacity-90 border-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  )
}
