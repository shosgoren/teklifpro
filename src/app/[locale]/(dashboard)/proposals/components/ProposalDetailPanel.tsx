'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'
import { swrStaticOptions } from '@/shared/utils/swrConfig'
import { toast } from 'sonner'
import {
  User, Calendar, ExternalLink, FileText, Package,
  Copy, Eye, Edit, Trash2, Clock, MessageCircle,
  ChevronRight, CreditCard, Truck, Plus, Minus, Search,
  Banknote, ArrowRightLeft, Percent,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { useConfirm } from '@/shared/components/confirm-dialog'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { useCurrency } from '@/shared/hooks/useCurrency'
import {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelBody,
  DetailPanelSection,
  DetailPanelFooter,
  InlineField,
} from '@/shared/components/DetailPanel'
import { cn } from '@/shared/utils/cn'

type ProposalStatus = 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'REVISED' | 'EXPIRED' | 'CANCELLED' | 'INVOICED'

const EDITABLE_STATUSES = ['DRAFT', 'READY', 'REVISION_REQUESTED']

const STATUS_GRADIENT: Record<string, string> = {
  DRAFT: 'from-slate-500 to-slate-700',
  READY: 'from-cyan-500 to-cyan-700',
  SENT: 'from-blue-500 to-blue-700',
  VIEWED: 'from-amber-500 to-amber-700',
  ACCEPTED: 'from-emerald-500 to-emerald-700',
  REJECTED: 'from-red-500 to-red-700',
  REVISION_REQUESTED: 'from-orange-500 to-orange-700',
  REVISED: 'from-purple-500 to-purple-700',
  EXPIRED: 'from-gray-400 to-gray-600',
  CANCELLED: 'from-gray-400 to-gray-600',
  INVOICED: 'from-indigo-500 to-indigo-700',
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-slate-400', READY: 'bg-cyan-500', SENT: 'bg-blue-500',
  VIEWED: 'bg-amber-500', ACCEPTED: 'bg-emerald-500', REJECTED: 'bg-red-500',
  REVISION_REQUESTED: 'bg-orange-500', REVISED: 'bg-purple-500',
  EXPIRED: 'bg-gray-400', CANCELLED: 'bg-gray-400', INVOICED: 'bg-indigo-500',
}

const ALL_STATUSES: ProposalStatus[] = [
  'DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED',
  'REVISION_REQUESTED', 'REVISED', 'EXPIRED', 'CANCELLED', 'INVOICED',
]

interface ProposalItem {
  id: string
  name: string
  quantity: number
  unitPrice: number | string
  vatRate?: number
  discountRate?: number
  unit?: string
}

interface ProposalDetailPanelProps {
  proposal: {
    id: string
    title?: string
    proposalNumber: string
    proposalType?: string
    status: string
    grandTotal: number | string
    subtotal?: number | string
    vatTotal?: number | string
    discountAmount?: number | string
    currency?: string
    createdAt: string
    expiresAt?: string
    sentAt?: string
    viewedAt?: string
    viewCount?: number
    publicToken: string
    paymentTerms?: string
    deliveryTerms?: string
    notes?: string
    validityDays?: number
    customer?: {
      id?: string
      name: string
      email?: string
      phone?: string
    }
    items?: ProposalItem[]
  } | null
  open: boolean
  onClose: () => void
  onMutate?: () => void
}

const apiFetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })

export default function ProposalDetailPanel({ proposal, open, onClose, onMutate }: ProposalDetailPanelProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('proposals')
  const tc = useTranslations('common')
  const confirm = useConfirm()
  const { can } = usePermissions()
  const { formatCurrency } = useCurrency()
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  // Customer search
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  // Product add
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  // Customer list for switching
  const { data: customersData } = useSWR(
    customerSearchOpen ? '/api/v1/customers?limit=50' : null,
    apiFetcher, swrStaticOptions
  )
  const customers = customersData?.data?.customers ?? []
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter((c: { name: string }) => c.name.toLowerCase().includes(q))
  }, [customerSearch, customers])

  // Product list for adding
  const { data: productsData } = useSWR(
    productSearchOpen ? '/api/v1/products?limit=100' : null,
    apiFetcher, swrStaticOptions
  )
  const products = productsData?.data?.products ?? []
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products
    const q = productSearch.toLowerCase()
    return products.filter((p: { name: string; code?: string }) =>
      p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
    )
  }, [productSearch, products])

  const canUpdate = can('proposal.update')
  const canDelete = can('proposal.delete')

  if (!proposal) return null

  const isEditable = canUpdate && EDITABLE_STATUSES.includes(proposal.status)
  const gradient = STATUS_GRADIENT[proposal.status] || 'from-violet-500 to-purple-700'
  const isUnofficial = proposal.proposalType === 'UNOFFICIAL'
  const items = proposal.items || []
  const grandTotal = Number(proposal.grandTotal || 0)
  const subtotal = Number(proposal.subtotal || 0)
  const vatTotal = Number(proposal.vatTotal || 0)
  const discountAmount = Number(proposal.discountAmount || 0)

  // ── API helpers ─────────────────────────────────────────

  const updateProposal = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error()
    onMutate?.()
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProposal({ status: newStatus })
      toast.success(t('updated'))
    } catch { toast.error(tc('error')) }
  }

  const handleDelete = async () => {
    const ok = await confirm({ message: t('confirmDelete'), confirmText: tc('delete'), variant: 'danger' })
    if (!ok) return
    try {
      await fetch(`/api/v1/proposals/${proposal.id}`, { method: 'DELETE' })
      toast.success(t('deleted'))
      onClose()
      onMutate?.()
    } catch { toast.error(t('deleteError')) }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.publicToken}`)
    toast.success(t('linkCopied'))
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    try { await updateProposal({ [field]: value }) }
    catch { toast.error(tc('error')) }
  }

  // ── Customer change ──────────────────────────────────────

  const handleCustomerChange = async (customerId: string) => {
    try {
      await updateProposal({ customerId })
      toast.success(t('updated'))
      setCustomerSearchOpen(false)
    } catch { toast.error(tc('error')) }
  }

  // ── Item operations ──────────────────────────────────────

  const handleItemUpdate = async (itemId: string, updates: Record<string, number>) => {
    try {
      // Update item via proposal update - send all items with the modification
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ).map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: item.vatRate ?? 18,
        discountRate: item.discountRate ?? 0,
        unit: item.unit || 'Adet',
        description: '',
      }))
      await updateProposal({ items: updatedItems })
    } catch { toast.error(tc('error')) }
  }

  const handleItemRemove = async (itemId: string) => {
    try {
      const updatedItems = items.filter(item => item.id !== itemId).map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: item.vatRate ?? 18,
        discountRate: item.discountRate ?? 0,
        unit: item.unit || 'Adet',
        description: '',
      }))
      await updateProposal({ items: updatedItems })
      toast.success(t('updated'))
    } catch { toast.error(tc('error')) }
  }

  const handleAddProduct = async (product: { name: string; listPrice?: number; vatRate?: number; unit?: string }) => {
    try {
      const currentItems = items.map(item => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatRate: item.vatRate ?? 18,
        discountRate: item.discountRate ?? 0,
        unit: item.unit || 'Adet',
        description: '',
      }))
      currentItems.push({
        name: product.name,
        quantity: 1,
        unitPrice: product.listPrice || 0,
        vatRate: product.vatRate || 18,
        discountRate: 0,
        unit: product.unit || 'Adet',
        description: '',
      })
      await updateProposal({ items: currentItems })
      toast.success(t('updated'))
      setProductSearchOpen(false)
      setProductSearch('')
    } catch { toast.error(tc('error')) }
  }

  return (
    <DetailPanel open={open} onClose={onClose} width="540px">
      {/* Header */}
      <DetailPanelHeader gradient={gradient} onClose={onClose}>
        <Badge className="bg-white/20 text-white border-white/30 text-xs mb-2">
          {t(`status.${proposal.status}` as Parameters<typeof t>[0])}
        </Badge>
        <p className="text-white/70 text-xs font-mono">{proposal.proposalNumber}</p>
        <h2 className="text-white text-lg font-bold mt-1 pr-8 leading-snug">
          {proposal.title || proposal.proposalNumber}
        </h2>
        {isUnofficial && (
          <Badge className="bg-amber-400/20 text-amber-100 border-amber-300/30 text-[10px] mt-2">
            {t('proposalTypeUnofficial')}
          </Badge>
        )}
      </DetailPanelHeader>

      {/* Body */}
      <DetailPanelBody>
        {/* Status Change */}
        {canUpdate && (
          <div className="flex items-center gap-3">
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', STATUS_DOT[proposal.status] || 'bg-gray-400')} />
            <Select value={proposal.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 rounded-xl text-sm font-medium flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />
                      {t(`status.${s}` as Parameters<typeof t>[0])}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Customer */}
        <DetailPanelSection
          title={t('customer')}
          icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">{proposal.customer?.name ?? '-'}</p>
            {proposal.customer?.email && (
              <p className="text-xs text-muted-foreground">{proposal.customer.email}</p>
            )}
            {proposal.customer?.phone && (
              <p className="text-xs text-muted-foreground">{proposal.customer.phone}</p>
            )}
            {isEditable && (
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <button className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1.5">
                    <ArrowRightLeft className="h-3 w-3" />
                    Müşteri Değiştir
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Müşteri ara..." value={customerSearch} onValueChange={setCustomerSearch} />
                    <CommandList>
                      <CommandEmpty>Müşteri bulunamadı</CommandEmpty>
                      <CommandGroup>
                        {filteredCustomers.map((c: { id: string; name: string; email?: string }) => (
                          <CommandItem key={c.id} onSelect={() => handleCustomerChange(c.id)}>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </DetailPanelSection>

        {/* Financial Summary */}
        <DetailPanelSection
          title={t('totalAmount')}
          icon={<Banknote className="h-3.5 w-3.5 text-muted-foreground" />}
          className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="space-y-2">
            {subtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600">{t('discount')}</span>
                <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {!isUnofficial && vatTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('vat')}</span>
                <span className="font-medium">{formatCurrency(vatTotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold">{t('total')}</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </DetailPanelSection>

        {/* Items — editable */}
        <DetailPanelSection
          title={`${t('product')} (${items.length})`}
          icon={<Package className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          <div className="space-y-2">
            {items.map((item, i) => {
              const lineTotal = item.quantity * Number(item.unitPrice)
              const discount = item.discountRate ? lineTotal * (item.discountRate / 100) : 0
              const afterDiscount = lineTotal - discount
              return (
                <div key={item.id || i} className="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatCurrency(afterDiscount)}</span>
                    {isEditable && (
                      <button
                        onClick={() => handleItemRemove(item.id)}
                        className="shrink-0 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {isEditable ? (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Quantity */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleItemUpdate(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number" min="1" inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => handleItemUpdate(item.id, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-12 h-6 text-center text-xs font-semibold px-0 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => handleItemUpdate(item.id, { quantity: item.quantity + 1 })}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">×</span>
                      {/* Unit Price */}
                      <Input
                        type="number" inputMode="decimal" min="0" step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemUpdate(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="w-20 h-6 text-right text-xs font-medium px-1.5 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {/* Discount */}
                      {(item.discountRate || 0) > 0 && (
                        <Badge className="text-[10px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                          -{item.discountRate}%
                        </Badge>
                      )}
                      {!isUnofficial && item.vatRate && (
                        <span className="text-[10px] text-muted-foreground">KDV %{item.vatRate}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                      {item.discountRate ? ` (-${item.discountRate}%)` : ''}
                      {!isUnofficial && item.vatRate ? ` · KDV %${item.vatRate}` : ''}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Add product */}
            {isEditable && (
              <Popover open={productSearchOpen} onOpenChange={(open) => { setProductSearchOpen(open); if (!open) setProductSearch('') }}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                    {t('create.addProduct')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder={t('searchProduct')} value={productSearch} onValueChange={setProductSearch} />
                    <CommandList>
                      <CommandEmpty>{t('noProduct')}</CommandEmpty>
                      <CommandGroup>
                        {filteredProducts.map((p: { id: string; name: string; code?: string; listPrice?: number; vatRate?: number; unit?: string }) => (
                          <CommandItem key={p.id} onSelect={() => handleAddProduct(p)}>
                            <div className="flex items-center gap-2 w-full">
                              <Package className="h-4 w-4 text-amber-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.code && `${p.code} · `}{formatCurrency(p.listPrice || 0)}
                                </p>
                              </div>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </DetailPanelSection>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <DetailPanelSection>
            <InlineField
              label={t('createdAt')}
              value={new Date(proposal.createdAt).toLocaleDateString(dateLocale)}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </DetailPanelSection>
          {proposal.expiresAt && (
            <DetailPanelSection>
              <InlineField
                label={t('expiryDate')}
                value={new Date(proposal.expiresAt).toLocaleDateString(dateLocale)}
                icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </DetailPanelSection>
          )}
          {proposal.viewCount !== undefined && proposal.viewCount > 0 && (
            <DetailPanelSection>
              <InlineField
                label={t('viewCount')}
                value={String(proposal.viewCount)}
                icon={<Eye className="h-3.5 w-3.5 text-muted-foreground" />}
              />
            </DetailPanelSection>
          )}
        </div>

        {/* Editable Fields */}
        {(proposal.paymentTerms || proposal.deliveryTerms || proposal.notes || isEditable) && (
          <DetailPanelSection title={t('steps.details')} icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}>
            <div className="space-y-3">
              <InlineField
                label={t('paymentTerms')}
                value={proposal.paymentTerms}
                editable={isEditable}
                onSave={isEditable ? (v) => handleFieldUpdate('paymentTerms', v) : undefined}
                icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="-"
              />
              <InlineField
                label={t('deliveryTerms')}
                value={proposal.deliveryTerms}
                editable={isEditable}
                onSave={isEditable ? (v) => handleFieldUpdate('deliveryTerms', v) : undefined}
                icon={<Truck className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="-"
              />
              <InlineField
                label={t('notes')}
                value={proposal.notes}
                editable={isEditable}
                onSave={isEditable ? (v) => handleFieldUpdate('notes', v) : undefined}
                type="textarea"
                icon={<MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="-"
              />
            </div>
          </DetailPanelSection>
        )}

        {/* Public Link */}
        {proposal.publicToken && (
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex-1 text-left">{t('liveLink')}</span>
            <Copy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        )}
      </DetailPanelBody>

      {/* Footer */}
      <DetailPanelFooter>
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-10"
          onClick={() => router.push(`/${locale}/proposals/${proposal.id}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {t('fullScreenView')}
        </Button>
        {canUpdate && (
          <Button
            className="flex-1 rounded-xl h-10"
            onClick={() => router.push(`/${locale}/proposals/${proposal.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            {tc('edit')}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DetailPanelFooter>
    </DetailPanel>
  )
}
