'use client'

import { useTranslations } from 'next-intl'
import {
  ArrowUpCircle, ArrowDownCircle, RotateCcw, Factory,
  AlertTriangle, CheckCircle2, XCircle, Box, Package,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelBody,
  DetailPanelSection,
  DetailPanelFooter,
} from '@/shared/components/DetailPanel'
import { cn } from '@/shared/utils/cn'

// ── Types ──────────────────────────────────────────

interface StockProduct {
  id: string
  code: string | null
  name: string
  productType: string
  unit: string
  stockQuantity: number
  minStockLevel: number
  costPrice: number
  trackStock: boolean
}

interface StockMovement {
  id: string
  type: string
  quantity: number
  unitPrice: number | null
  reference: string | null
  notes: string | null
  createdAt: string
  product?: { id: string; name: string }
}

interface StockDetailPanelProps {
  product: StockProduct | null
  open: boolean
  onClose: () => void
  movements: StockMovement[]
  formatCurrency: (value: number) => string
  formatDate: (dateStr: string) => string
  productTypeLabels: Record<string, string>
  productTypeColors: Record<string, string>
  movementTypeConfig: Record<string, { label: string; color: string }>
}

const isLowStock = (p: StockProduct) =>
  p.trackStock && p.minStockLevel > 0 && p.stockQuantity < p.minStockLevel

const isOutOfStock = (p: StockProduct) =>
  p.trackStock && p.stockQuantity <= 0

// ── Component ──────────────────────────────────────

export default function StockDetailPanel({
  product,
  open,
  onClose,
  movements,
  formatCurrency,
  formatDate,
  productTypeLabels,
  productTypeColors,
  movementTypeConfig,
}: StockDetailPanelProps) {
  const t = useTranslations('stockPage')

  if (!product) return null

  const outOfStock = isOutOfStock(product)
  const lowStock = isLowStock(product)

  return (
    <DetailPanel open={open} onClose={onClose} width="520px">
      <DetailPanelHeader
        gradient={
          outOfStock
            ? 'from-red-600 to-rose-600'
            : lowStock
              ? 'from-amber-600 to-orange-600'
              : 'from-emerald-600 to-teal-600'
        }
        onClose={onClose}
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate pr-8">{product.name}</h2>
          <p className="text-sm text-white/70 mt-0.5 font-mono">{product.code ?? '-'}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn('border-0 text-xs bg-white/20 text-white hover:bg-white/30')}>
              {productTypeLabels[product.productType] ?? product.productType}
            </Badge>
            <span className="text-xs text-white/60">{product.unit}</span>
          </div>
        </div>
      </DetailPanelHeader>

      <DetailPanelBody>
        {/* Stock Status */}
        <DetailPanelSection
          title={t('table.status')}
          icon={<Box className="h-3.5 w-3.5 text-muted-foreground" />}
          className={cn(
            'border',
            outOfStock
              ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
              : lowStock
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-gray-200 dark:border-gray-800'
          )}
        >
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('detail.currentStock')}</p>
              <p className={cn(
                'text-xl font-bold mt-0.5',
                outOfStock ? 'text-red-600 dark:text-red-400'
                  : lowStock ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              )}>
                {product.stockQuantity}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('detail.minLevel')}</p>
              <p className="text-xl font-bold mt-0.5">{product.minStockLevel}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('table.status')}</p>
              {outOfStock ? (
                <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  <XCircle className="mr-1 h-3 w-3" />
                  {t('table.outOfStock')}
                </Badge>
              ) : lowStock ? (
                <Badge className="mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {t('table.low')}
                </Badge>
              ) : (
                <Badge className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {t('table.ok')}
                </Badge>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {product.minStockLevel > 0 && (
            <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  outOfStock ? 'bg-red-500' : lowStock ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min((product.stockQuantity / product.minStockLevel) * 100, 100)}%` }}
              />
            </div>
          )}
        </DetailPanelSection>

        {/* Cost Info */}
        <DetailPanelSection className="border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('detail.costPrice')}</p>
              <p className="text-sm font-medium mt-0.5">{formatCurrency(product.costPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t('kpi.totalValue')}</p>
              <p className="text-sm font-medium mt-0.5">{formatCurrency(product.stockQuantity * product.costPrice)}</p>
            </div>
          </div>
        </DetailPanelSection>

        {/* Recent Movements */}
        <DetailPanelSection
          title={t('detail.movements')}
          icon={<RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
        >
          {movements.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <RotateCcw className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{t('detail.noMovements')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((mov) => {
                const config = movementTypeConfig[mov.type] ?? { label: mov.type, color: 'bg-gray-100 text-gray-800' }
                const isPositive = ['IN', 'PRODUCTION_IN', 'ADJUSTMENT'].includes(mov.type)
                return (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {mov.type === 'IN' && <ArrowDownCircle className="h-4 w-4 shrink-0 text-green-500" />}
                      {mov.type === 'OUT' && <ArrowUpCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      {mov.type === 'ADJUSTMENT' && <RotateCcw className="h-4 w-4 shrink-0 text-blue-500" />}
                      {mov.type === 'PRODUCTION_IN' && <Factory className="h-4 w-4 shrink-0 text-emerald-500" />}
                      {mov.type === 'PRODUCTION_OUT' && <Factory className="h-4 w-4 shrink-0 text-orange-500" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
                          {mov.reference && (
                            <span className="text-xs text-muted-foreground truncate">{mov.reference}</span>
                          )}
                        </div>
                        {mov.notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">{mov.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className={cn(
                        'font-medium',
                        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {isPositive ? '+' : '-'}{mov.quantity}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(mov.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DetailPanelSection>
      </DetailPanelBody>
    </DetailPanel>
  )
}
