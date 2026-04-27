'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Tag, Box, Package, Layers, Edit, Trash2, ExternalLink,
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
import { type Product, PRODUCT_TYPE_COLORS, isLowStock } from './types'

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  COMMERCIAL: 'Ticari',
  RAW_MATERIAL: 'Hammadde',
  SEMI_FINISHED: 'Yarı Mamul',
  CONSUMABLE: 'Sarf Malzeme',
}

interface ProductDetailPanelProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onMutate?: () => void
  onEdit?: (product: Product) => void
}

export default function ProductDetailPanel({ product, open, onClose, onMutate, onEdit }: ProductDetailPanelProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('productsPage')
  const tc = useTranslations('common')
  const confirm = useConfirm()
  const { can } = usePermissions()
  const { formatCurrency } = useCurrency()

  const canUpdate = can('product.update')
  const canDelete = can('product.delete')

  if (!product) return null

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/v1/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: field === 'listPrice' || field === 'costPrice' || field === 'vatRate' ? Number(value) : value }),
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
      await fetch(`/api/v1/products/${product.id}`, { method: 'DELETE' })
      toast.success(t('deleted'))
      onClose()
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
  }

  const lowStock = isLowStock(product)

  return (
    <DetailPanel open={open} onClose={onClose} width="520px">
      <DetailPanelHeader gradient="from-mint-600 to-mint-700" onClose={onClose}>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate pr-8">{product.name}</h2>
            <p className="text-sm text-white/70 mt-0.5 font-mono">{product.code ?? '-'}</p>
            <Badge className="mt-2 bg-white/20 text-white border-0 hover:bg-white/30 text-xs">
              {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
            </Badge>
          </div>
          {product.imageUrl && (
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 shrink-0 relative">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                unoptimized={product.imageUrl.startsWith('data:')}
              />
            </div>
          )}
        </div>
      </DetailPanelHeader>

      <DetailPanelBody>
        {/* Pricing */}
        <DetailPanelSection
          title={t('pricing')}
          icon={<Tag className="h-3.5 w-3.5 text-muted-foreground" />}
          className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="space-y-3">
            <InlineField
              label={t('listPrice')}
              value={product.listPrice}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('listPrice', v) : undefined}
              type="number"
              display={<p className="text-2xl font-bold">{formatCurrency(product.listPrice)}</p>}
            />
            <div className="flex items-center justify-between">
              <InlineField
                label={t('vatRate')}
                value={`%${product.vatRate}`}
                editable={canUpdate}
                onSave={canUpdate ? (v) => handleFieldUpdate('vatRate', v.replace('%', '')) : undefined}
              />
              {product.costPrice > 0 && (
                <InlineField
                  label={t('cost')}
                  value={product.costPrice}
                  editable={canUpdate}
                  onSave={canUpdate ? (v) => handleFieldUpdate('costPrice', v) : undefined}
                  type="number"
                  display={<p className="text-sm font-medium text-muted-foreground">{formatCurrency(product.costPrice)}</p>}
                />
              )}
            </div>
          </div>
        </DetailPanelSection>

        {/* Stock */}
        {product.trackStock && (
          <DetailPanelSection
            title={t('stockStatus')}
            icon={<Box className="h-3.5 w-3.5 text-muted-foreground" />}
            className={cn(
              'border',
              lowStock
                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                : 'border-gray-200 dark:border-gray-800'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('currentStock')}</p>
                <p className={cn(
                  'text-xl font-bold mt-0.5',
                  lowStock ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {product.stockQuantity} {product.unit}
                </p>
              </div>
              {product.minStockLevel > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('minLevel')}</p>
                  <p className="text-sm font-medium text-muted-foreground mt-0.5">
                    {product.minStockLevel} {product.unit}
                  </p>
                </div>
              )}
            </div>
            {product.minStockLevel > 0 && (
              <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    lowStock ? 'bg-red-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min((product.stockQuantity / product.minStockLevel) * 100, 100)}%` }}
                />
              </div>
            )}
          </DetailPanelSection>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <DetailPanelSection>
            <InlineField
              label={t('category')}
              value={product.category}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('category', v) : undefined}
              icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />}
              placeholder="-"
            />
          </DetailPanelSection>
          <DetailPanelSection>
            <InlineField
              label={t('unit')}
              value={product.unit}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('unit', v) : undefined}
              icon={<Package className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </DetailPanelSection>
        </div>

        {/* Description */}
        {(product.description || canUpdate) && (
          <DetailPanelSection>
            <InlineField
              label={t('descriptionLabel')}
              value={product.description}
              editable={canUpdate}
              onSave={canUpdate ? (v) => handleFieldUpdate('description', v) : undefined}
              type="textarea"
              placeholder="-"
            />
          </DetailPanelSection>
        )}
      </DetailPanelBody>

      <DetailPanelFooter>
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-10"
          onClick={() => { router.push(`/${locale}/products/${product.id}`); onClose() }}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('fullScreenView')}
        </Button>
        {canUpdate && (
          <Button
            className="flex-1 rounded-xl h-10"
            onClick={() => { onClose(); onEdit?.(product) }}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t('editBtn')}
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
