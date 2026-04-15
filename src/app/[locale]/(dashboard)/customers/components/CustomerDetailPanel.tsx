'use client'

import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  User, Phone, Mail, MapPin, Calendar, Hash, Edit, Trash2,
  Building2, CreditCard, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
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

interface Customer {
  id: string
  name: string
  shortName?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  address?: string
  taxNumber?: string
  isActive?: boolean
  balance?: number
  syncedFromParasut?: boolean
  createdAt?: string
}

interface CustomerDetailPanelProps {
  customer: Customer | null
  open: boolean
  onClose: () => void
  onMutate?: () => void
  onEdit?: (customer: Customer) => void
}

export default function CustomerDetailPanel({ customer, open, onClose, onMutate, onEdit }: CustomerDetailPanelProps) {
  const locale = useLocale()
  const t = useTranslations('customersPage')
  const tc = useTranslations('common')
  const confirm = useConfirm()
  const { can } = usePermissions()
  const { formatCurrency } = useCurrency()
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  const canUpdate = can('customer.update')
  const canDelete = can('customer.delete')

  if (!customer) return null

  const gradient = customer.syncedFromParasut
    ? 'from-emerald-600 to-teal-600'
    : 'from-blue-600 to-indigo-600'

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/v1/customers/${customer.id}`, {
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

  const handleDelete = async () => {
    const ok = await confirm({ message: t('confirmDelete'), confirmText: tc('delete'), variant: 'danger' })
    if (!ok) return
    try {
      await fetch(`/api/v1/customers/${customer.id}`, { method: 'DELETE' })
      toast.success(t('deleted'))
      onClose()
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
  }

  return (
    <DetailPanel open={open} onClose={onClose} width="520px">
      <DetailPanelHeader gradient={gradient} onClose={onClose}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold bg-white/20 text-white ring-2 ring-white/50 shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-lg font-bold truncate pr-8">{customer.name}</h2>
            {customer.shortName && (
              <p className="text-white/60 text-xs mt-0.5">{customer.shortName}</p>
            )}
            <p className="text-sm text-white/70 mt-1">
              {customer.syncedFromParasut ? t('syncedFrom') : t('manuallyAdded')}
            </p>
          </div>
        </div>
      </DetailPanelHeader>

      <DetailPanelBody>
        {/* Contact Info */}
        <DetailPanelSection
          title={t('contactInfo')}
          icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          <div className="space-y-3">
            <InlineField
              label={t('phone')}
              value={customer.phone}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('phone', v) : undefined}
              type="tel"
              icon={<div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /></div>}
              placeholder="-"
            />
            <InlineField
              label={t('email')}
              value={customer.email}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('email', v) : undefined}
              type="email"
              icon={<div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Mail className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /></div>}
              placeholder="-"
            />
            <InlineField
              label={t('address')}
              value={[customer.address, customer.city].filter(Boolean).join(', ') || null}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('address', v) : undefined}
              icon={<div className="h-7 w-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" /></div>}
              placeholder="-"
            />
          </div>
        </DetailPanelSection>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <DetailPanelSection>
            <InlineField
              label={t('taxNo')}
              value={customer.taxNumber}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('taxNumber', v) : undefined}
              icon={<Hash className="h-3.5 w-3.5 text-muted-foreground" />}
              placeholder="-"
            />
          </DetailPanelSection>
          <DetailPanelSection>
            <InlineField
              label={t('balance')}
              value={customer.balance !== undefined ? formatCurrency(customer.balance) : null}
              display={
                customer.balance !== undefined ? (
                  <p className={cn(
                    'font-bold text-base',
                    customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-600' : 'text-foreground'
                  )}>
                    {formatCurrency(customer.balance)}
                  </p>
                ) : undefined
              }
              icon={<CreditCard className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </DetailPanelSection>
        </div>

        {/* Status & Date */}
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-gray-900/50 p-4">
          <Badge variant="default" className={cn(
            'rounded-full px-3',
            customer.isActive !== false
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {customer.isActive !== false ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Aktif</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Pasif</>
            )}
          </Badge>
          {customer.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(customer.createdAt).toLocaleDateString(dateLocale)}</span>
            </div>
          )}
        </div>
      </DetailPanelBody>

      <DetailPanelFooter>
        {canUpdate && (
          <Button
            className="flex-1 rounded-xl h-10"
            onClick={() => { onClose(); onEdit?.(customer) }}
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
