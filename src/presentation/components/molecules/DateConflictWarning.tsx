'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

interface ConflictItem {
  id: string
  proposalNumber: string
  title: string | null
  status: string
  customer?: string | null
  deliveryMatches: boolean
  installationMatches: boolean
}

interface ConflictResponse {
  hasAcceptedConflict: boolean
  conflicts: ConflictItem[]
  hard: number
  warn: number
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  READY: 'Hazır',
  SENT: 'Gönderildi',
  VIEWED: 'Görüntülendi',
  ACCEPTED: 'Kabul edildi',
  REJECTED: 'Reddedildi',
  REVISION_REQUESTED: 'Revizyon istendi',
  REVISED: 'Revize edildi',
  EXPIRED: 'Süresi doldu',
  CANCELLED: 'İptal',
  INVOICED: 'Faturalandı',
}

/**
 * Teslim/Kurulum tarihi alanlarının altında çakışma uyarısı gösterir.
 * - Aynı tarihteki KABUL EDİLMİŞ teklif varsa kırmızı blok (form submit'te engellenir).
 * - Sadece açık (taslak/gönderildi/görüntülendi vb.) teklif varsa sarı uyarı.
 *
 * Parent komponent `onConflictChange` ile blok durumunu öğrenip submit kararını verir.
 */
export default function DateConflictWarning({
  date,
  type,
  excludeId,
  onConflictChange,
}: {
  date: Date | null | undefined
  type: 'delivery' | 'installation'
  excludeId?: string
  onConflictChange?: (hasAcceptedConflict: boolean) => void
}) {
  const [data, setData] = useState<ConflictResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date) {
      setData(null)
      onConflictChange?.(false)
      return
    }

    const iso = date.toISOString()
    const ctrl = new AbortController()
    setLoading(true)

    const params = new URLSearchParams({ date: iso, type })
    if (excludeId) params.set('excludeId', excludeId)

    fetch(`/api/v1/proposals/check-date-conflict?${params.toString()}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ConflictResponse | null) => {
        setData(json)
        onConflictChange?.(json?.hasAcceptedConflict ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ctrl.abort()
    // onConflictChange'i değişen referans yüzünden tetiklememek için bağımlılığa eklemiyoruz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.getTime(), type, excludeId])

  if (!date || loading || !data || data.conflicts.length === 0) return null

  const hard = data.conflicts.filter((c) =>
    ['ACCEPTED', 'INVOICED'].includes(c.status),
  )
  const warn = data.conflicts.filter(
    (c) => !['ACCEPTED', 'INVOICED'].includes(c.status),
  )

  const typeLabel = type === 'delivery' ? 'teslim' : 'kurulum'

  return (
    <div className="mt-2 space-y-2">
      {hard.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                Tarih çakışması — devam edilemez
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                Bu güne sabitlenmiş <strong>{hard.length}</strong> kabul edilmiş
                teklif var. Aynı güne ikinci bir {typeLabel} planlanamaz.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {hard.map((c) => (
                  <li key={c.id} className="text-red-700 dark:text-red-300">
                    • <span className="font-mono">{c.proposalNumber}</span>
                    {c.title && ` — ${c.title}`}
                    {c.customer && ` (${c.customer})`}
                    {' · '}
                    <span className="font-semibold">
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                    {c.deliveryMatches && c.installationMatches
                      ? ' · teslim+kurulum aynı gün'
                      : c.deliveryMatches
                      ? ' · aynı gün teslim'
                      : c.installationMatches
                      ? ' · aynı gün kurulum'
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warn.length > 0 && hard.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Aynı güne başka teklif var
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                <strong>{warn.length}</strong> teklif aynı tarihe planlanmış —
                henüz kabul edilmediği için kaydetmeye devam edebilirsin, ama
                programının dolu olabileceğini hatırlat.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {warn.slice(0, 3).map((c) => (
                  <li key={c.id} className="text-amber-700 dark:text-amber-300">
                    • <span className="font-mono">{c.proposalNumber}</span>
                    {c.title && ` — ${c.title}`}
                    {c.customer && ` (${c.customer})`}
                    {' · '}
                    {STATUS_LABELS[c.status] ?? c.status}
                  </li>
                ))}
                {warn.length > 3 && (
                  <li className="text-amber-700 dark:text-amber-300">
                    +{warn.length - 3} tane daha
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
