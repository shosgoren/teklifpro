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
  onItemEdit?: (index: number) => void
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
  onItemEdit,
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
                <th className="px-2 py-2" />
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
                      {item.matchedProductId === null && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Yeni urun olarak eklenecek</p>
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
                    <td className="px-2 py-2.5">
                      {onItemEdit && (
                        <button
                          onClick={() => onItemEdit(i)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                          title="Kalemi duzenle"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
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
                    {item.matchedProductId === null && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Yeni urun olarak eklenecek</p>
                    )}
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(lineTotal)}</p>
                      <ConfidenceBadge confidence={item.confidence} />
                    </div>
                    {onItemEdit && (
                      <button
                        onClick={() => onItemEdit(i)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors mt-0.5"
                        title="Kalemi duzenle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
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

      {/* ── Low Confidence Warning ── */}
      {data.overallConfidence < 0.6 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Dusuk Guven Skoru</p>
            <p className="text-xs text-amber-600 dark:text-amber-500">Bazi bilgiler belirsiz. Onaylamadan once kontrol edin veya sesle duzenleyin.</p>
          </div>
        </div>
      )}

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
          disabled={isLoading || data.overallConfidence < 0.4}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0"
        >
          <Check className="h-4 w-4" />
          {isLoading ? 'Olusturuluyor...' : data.overallConfidence < 0.4 ? 'Guven Cok Dusuk' : 'Onayla'}
        </Button>
      </div>

      {/* ── Usage Examples ── */}
      <details className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <summary className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors list-none flex items-center justify-between">
          <span>Kullanim Ornekleri</span>
          <ChevronRight className="h-4 w-4 transition-transform" />
        </summary>
        <div className="px-4 pb-4 space-y-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Yeni Teklif</p>
            <ul className="space-y-0.5 pl-2">
              <li>&bull; &quot;Ahmet Beye 10 adet laptop 15.000 liradan teklif hazirla&quot;</li>
              <li>&bull; &quot;ABC Muhendislik&apos;e 100 adet M8 civata ve 50 kilo celik levha&quot;</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Duzenleme</p>
            <ul className="space-y-0.5 pl-2">
              <li>&bull; &quot;Miktari 200 yap&quot;</li>
              <li>&bull; &quot;M8 civata yerine M10 civata koy&quot;</li>
              <li>&bull; &quot;Fiyati 5 lira yap&quot;</li>
              <li>&bull; &quot;Iskontoyu yuzde 15 yap&quot;</li>
              <li>&bull; &quot;50 adet M10 somun da ekle&quot;</li>
              <li>&bull; &quot;Celik levhayi cikar&quot;</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Sesli Komutlar</p>
            <ul className="space-y-0.5 pl-2">
              <li>&bull; <span className="font-medium text-slate-600 dark:text-slate-300">&quot;Onayla&quot;</span> &mdash; Teklifi onayla</li>
              <li>&bull; <span className="font-medium text-slate-600 dark:text-slate-300">&quot;Iptal&quot;</span> &mdash; Bastan basla</li>
              <li>&bull; <span className="font-medium text-slate-600 dark:text-slate-300">&quot;Duzenle&quot;</span> &mdash; Sesle duzenle</li>
              <li>&bull; <span className="font-medium text-slate-600 dark:text-slate-300">&quot;Gonder&quot;</span> &mdash; WhatsApp ile gonder</li>
              <li>&bull; <span className="font-medium text-slate-600 dark:text-slate-300">&quot;Geri al&quot;</span> &mdash; Son degisikligi geri al</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}
