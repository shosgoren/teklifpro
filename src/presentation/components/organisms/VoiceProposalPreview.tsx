'use client'

import { Button } from '@/presentation/components/ui/button'
import { cn } from '@/shared/utils/cn'
import type { VoiceParseResult } from '@/infrastructure/services/voice/types'
import {
  User,
  ShoppingCart,
  Receipt,
  CreditCard,
  RotateCcw,
  Mic,
  Pencil,
  Check,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'

interface VoiceProposalPreviewProps {
  data: VoiceParseResult
  onEdit: () => void
  onVoiceEdit: () => void
  onApprove: () => void
  onRetry: () => void
  isLoading?: boolean
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      : pct >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {pct >= 80 ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      %{pct}
    </span>
  )
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const barColor =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'
  const label =
    pct >= 80
      ? 'Yuksek Guven'
      : pct >= 50
        ? 'Orta Guven'
        : 'Dusuk Guven'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Genel Guven Skoru</span>
        <span className="font-semibold">{label} - %{pct}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function VoiceProposalPreview({
  data,
  onEdit,
  onVoiceEdit,
  onApprove,
  onRetry,
  isLoading = false,
}: VoiceProposalPreviewProps) {
  const subtotal = data.items.reduce((sum, item) => {
    const price = item.unitPrice ?? 0
    return sum + price * item.quantity
  }, 0)

  const discountAmount = subtotal * (data.discountRate / 100)
  const afterDiscount = subtotal - discountAmount

  // Calculate weighted KDV
  const kdvAmount = data.items.reduce((sum, item) => {
    const price = item.unitPrice ?? 0
    const lineTotal = price * item.quantity
    const lineDiscount = lineTotal * (data.discountRate / 100)
    return sum + (lineTotal - lineDiscount) * (item.vatRate / 100)
  }, 0)

  const grandTotal = afterDiscount + kdvAmount

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* ── Customer ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <User className="h-4 w-4" />
            Musteri
          </div>
          <ConfidenceBadge confidence={data.customer.confidence} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {data.customer.matchedName || data.customer.query}
            </p>
            {data.customer.isNewCustomer && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Yeni musteri olarak eklenecek</p>
            )}
            {!data.customer.isNewCustomer && data.customer.matchedName && data.customer.query !== data.customer.matchedName && (
              <p className="text-xs text-slate-500 mt-0.5">Aranan: &quot;{data.customer.query}&quot;</p>
            )}
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onEdit}>
            Degistir <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <ShoppingCart className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Kalemler ({data.items.length})
          </span>
        </div>

        {/* Mobile-friendly: cards on small screens, table on md+ */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="text-left px-4 py-2 font-medium">Urun/Hizmet</th>
                <th className="text-right px-4 py-2 font-medium">Miktar</th>
                <th className="text-right px-4 py-2 font-medium">Birim Fiyat</th>
                <th className="text-right px-4 py-2 font-medium">Toplam</th>
                <th className="text-center px-4 py-2 font-medium">Guven</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const lineTotal = (item.unitPrice ?? 0) * item.quantity
                const isLowConfidence = item.confidence < 0.5

                return (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-slate-50 dark:border-slate-800/50 last:border-0',
                      isLowConfidence && 'bg-amber-50/60 dark:bg-amber-950/20'
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {item.matchedProductName || item.name}
                      </p>
                      {item.matchedProductName && item.name !== item.matchedProductName && (
                        <p className="text-xs text-slate-400 mt-0.5">Soylenen: &quot;{item.name}&quot;</p>
                      )}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      {item.unitPrice != null ? formatCurrency(item.unitPrice) : <span className="text-amber-500 text-xs">Belirsiz</span>}
                    </td>
                    <td className="text-right px-4 py-2.5 font-medium tabular-nums">
                      {formatCurrency(lineTotal)}
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <ConfidenceBadge confidence={item.confidence} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {data.items.map((item, i) => {
            const lineTotal = (item.unitPrice ?? 0) * item.quantity
            const isLowConfidence = item.confidence < 0.5

            return (
              <div
                key={i}
                className={cn(
                  'px-4 py-3',
                  isLowConfidence && 'bg-amber-50/60 dark:bg-amber-950/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                      {item.matchedProductName || item.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.quantity} {item.unit} x {item.unitPrice != null ? formatCurrency(item.unitPrice) : '?'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(lineTotal)}</p>
                    <ConfidenceBadge confidence={item.confidence} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Totals ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ozet</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Ara Toplam</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {data.discountRate > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Iskonto (%{data.discountRate})</span>
              <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">KDV</span>
            <span className="tabular-nums">{formatCurrency(kdvAmount)}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
            <span className="font-bold text-slate-900 dark:text-white">Genel Toplam</span>
            <span className="font-bold text-lg tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Payment & Delivery Terms ── */}
      {(data.paymentTerms || data.deliveryTerms) && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kosullar</span>
          </div>
          {data.paymentTerms && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Odeme:</span> {data.paymentTerms}
            </p>
          )}
          {data.deliveryTerms && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-medium">Teslimat:</span> {data.deliveryTerms}
            </p>
          )}
          {data.notes && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-medium">Not:</span> {data.notes}
            </p>
          )}
        </div>
      )}

      {/* ── Overall Confidence ── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <ConfidenceMeter confidence={data.overallConfidence} />
      </div>

      {/* ── Action Buttons ── */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={onRetry}
          disabled={isLoading}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Tekrar Soyle
        </Button>
        <Button
          variant="outline"
          onClick={onVoiceEdit}
          disabled={isLoading}
          className="gap-2"
        >
          <Mic className="h-4 w-4" />
          Sesle Duzenle
        </Button>
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isLoading}
          className="gap-2"
        >
          <Pencil className="h-4 w-4" />
          Elle Duzenle
        </Button>
        <Button
          onClick={onApprove}
          disabled={isLoading}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0"
        >
          <Check className="h-4 w-4" />
          {isLoading ? 'Olusturuluyor...' : 'Onayla'}
        </Button>
      </div>
    </div>
  )
}
