'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  User, DollarSign, Calendar, ExternalLink, FileText, Package, Send,
  Copy, Eye, Edit, Trash2, Clock, MessageCircle, ArrowRightLeft, Hash,
  ChevronRight, CreditCard, Truck, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
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
  DRAFT: 'bg-slate-400',
  READY: 'bg-cyan-500',
  SENT: 'bg-blue-500',
  VIEWED: 'bg-amber-500',
  ACCEPTED: 'bg-emerald-500',
  REJECTED: 'bg-red-500',
  REVISION_REQUESTED: 'bg-orange-500',
  REVISED: 'bg-purple-500',
  EXPIRED: 'bg-gray-400',
  CANCELLED: 'bg-gray-400',
  INVOICED: 'bg-indigo-500',
}

const ALL_STATUSES: ProposalStatus[] = [
  'DRAFT', 'READY', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED',
  'REVISION_REQUESTED', 'REVISED', 'EXPIRED', 'CANCELLED', 'INVOICED',
]

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
    items?: Array<{
      id: string
      name: string
      quantity: number
      unitPrice: number | string
      vatRate?: number
      discountRate?: number
    }>
  } | null
  open: boolean
  onClose: () => void
  onMutate?: () => void
}

const apiFetcher = (url: string) => fetch(url).then(r => r.json())

export default function ProposalDetailPanel({ proposal, open, onClose, onMutate }: ProposalDetailPanelProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('proposals')
  const tc = useTranslations('common')
  const confirm = useConfirm()
  const { can } = usePermissions()
  const { formatCurrency } = useCurrency()
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  const canUpdate = can('proposal.update')
  const canDelete = can('proposal.delete')
  const canSend = can('proposal.send')

  if (!proposal) return null

  const gradient = STATUS_GRADIENT[proposal.status] || 'from-violet-500 to-purple-700'
  const isUnofficial = proposal.proposalType === 'UNOFFICIAL'
  const items = proposal.items || []
  const grandTotal = Number(proposal.grandTotal || 0)
  const subtotal = Number(proposal.subtotal || 0)
  const vatTotal = Number(proposal.vatTotal || 0)
  const discountAmount = Number(proposal.discountAmount || 0)

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('updated'))
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({ message: t('confirmDelete'), confirmText: tc('delete'), variant: 'danger' })
    if (!ok) return
    try {
      await fetch(`/api/v1/proposals/${proposal.id}`, { method: 'DELETE' })
      toast.success(t('deleted'))
      onClose()
      onMutate?.()
    } catch {
      toast.error(t('deleteError'))
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/proposal/${proposal.publicToken}`
    navigator.clipboard.writeText(link)
    toast.success(t('linkCopied'))
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/v1/proposals/${proposal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
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
            {proposal.customer?.id && (
              <button
                onClick={() => router.push(`/${locale}/customers`)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
              >
                {tc('edit')} <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </DetailPanelSection>

        {/* Financial Summary */}
        <DetailPanelSection
          title={t('totalAmount')}
          icon={<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />}
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

        {/* Items */}
        {items.length > 0 && (
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
                  <div key={item.id || i} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                        {item.discountRate ? ` (-${item.discountRate}%)` : ''}
                        {!isUnofficial && item.vatRate ? ` · KDV %${item.vatRate}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0 ml-3">
                      {formatCurrency(afterDiscount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </DetailPanelSection>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <DetailPanelSection>
            <InlineField
              label={t('createdAt')}
              value={new Date(proposal.createdAt).toLocaleDateString(dateLocale)}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </DetailPanelSection>
          <DetailPanelSection>
            <InlineField
              label={t('list.status')}
              value={t(`status.${proposal.status}` as Parameters<typeof t>[0])}
              icon={<div className={cn('h-2.5 w-2.5 rounded-full', STATUS_DOT[proposal.status] || 'bg-gray-400')} />}
            />
          </DetailPanelSection>
        </div>

        {/* Extra Info */}
        <div className="grid grid-cols-2 gap-3">
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
        {(proposal.paymentTerms || proposal.deliveryTerms || proposal.notes || canUpdate) && (
          <DetailPanelSection title={t('steps.details')} icon={<FileText className="h-3.5 w-3.5 text-muted-foreground" />}>
            <div className="space-y-3">
              <InlineField
                label={t('paymentTerms')}
                value={proposal.paymentTerms}
                editable={canUpdate}
                onSave={canUpdate ? (v) => handleFieldUpdate('paymentTerms', v) : undefined}
                icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="-"
              />
              <InlineField
                label={t('deliveryTerms')}
                value={proposal.deliveryTerms}
                editable={canUpdate}
                onSave={canUpdate ? (v) => handleFieldUpdate('deliveryTerms', v) : undefined}
                icon={<Truck className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="-"
              />
              {proposal.notes && (
                <InlineField
                  label={t('notes')}
                  value={proposal.notes}
                  editable={canUpdate}
                  onSave={canUpdate ? (v) => handleFieldUpdate('notes', v) : undefined}
                  type="textarea"
                  icon={<MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                />
              )}
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
