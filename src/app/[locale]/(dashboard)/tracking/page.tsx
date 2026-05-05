'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  CalendarIcon,
  KanbanSquare,
  MapPin,
  Search,
  Truck,
  Wrench,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface TrackingEvent {
  id: string
  type: 'delivery' | 'installation'
  date: string
  completed: boolean
  proposal: {
    id: string
    number: string
    title: string | null
    status: string
    proposalType: string
  }
  customer: {
    id: string
    name: string
    address: string | null
    phone: string | null
  } | null
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const VIEWS = [
  { k: 'calendar', label: 'Takvim', Icon: CalendarIcon },
  { k: 'kanban', label: 'Kanban', Icon: KanbanSquare },
  { k: 'map', label: 'Harita', Icon: MapPin },
] as const
type ViewKey = (typeof VIEWS)[number]['k']

const GRANULARITY = [
  { k: 'week', label: 'Hafta' },
  { k: 'month', label: 'Ay' },
  { k: 'quarter', label: 'Çeyrek' },
] as const
type Granularity = (typeof GRANULARITY)[number]['k']

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  READY: 'Hazır',
  SENT: 'Gönderildi',
  VIEWED: 'Görüntülendi',
  ACCEPTED: 'Kabul edildi',
  REVISION_REQUESTED: 'Revizyon istendi',
  REVISED: 'Revize edildi',
  INVOICED: 'Faturalandı',
}

function isOfficial(t: string) {
  return t === 'OFFICIAL'
}
function isAccepted(s: string) {
  return s === 'ACCEPTED' || s === 'INVOICED'
}

// Renkler
const COLORS = {
  delivery: { bg: 'bg-cyan-500', text: 'text-cyan-700', soft: 'bg-cyan-50', border: 'border-cyan-200' },
  installation: { bg: 'bg-violet-500', text: 'text-violet-700', soft: 'bg-violet-50', border: 'border-violet-200' },
}

export default function TrackingPage() {
  const locale = useLocale()
  const [view, setView] = useState<ViewKey>('calendar')
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [cursor, setCursor] = useState(() => new Date()) // şu anki ay/hafta/çeyrek başı
  const [search, setSearch] = useState('')

  const { data, isLoading } = useSWR<{ events: TrackingEvent[] }>(
    '/api/v1/tracking/events',
    fetcher,
  )
  const events = useMemo(() => data?.events ?? [], [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return events
    const q = search.toLocaleLowerCase('tr-TR')
    return events.filter((e) => {
      const hay = [
        e.customer?.name ?? '',
        e.customer?.address ?? '',
        e.proposal.number,
        e.proposal.title ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
      return hay.includes(q)
    })
  }, [events, search])

  return (
    <div className="min-h-full bg-emerald-50/30">
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">
            Teslim & Kurulum
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tüm tekliflerin teslim ve kurulum programı tek ekranda. Onaylı +
            taslak ayrımı, hafta/ay/çeyrek bazında.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div
            className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto"
            role="tablist"
          >
            {VIEWS.map(({ k, label, Icon }) => {
              const active = view === k
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(k)}
                  className={[
                    'inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-w-[44px] justify-center',
                    active
                      ? 'bg-emerald-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 min-w-[180px] flex-1 lg:flex-none lg:w-72 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri, adres, no…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Renk lejandı */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <Legend dotClass="bg-cyan-500" label="Teslim" />
          <Legend dotClass="bg-violet-500" label="Kurulum" />
          <Legend
            ringClass="ring-2 ring-emerald-500 ring-offset-1"
            label="Onaylı (gerçek/taslak)"
          />
          <Legend label="Resmi (Gerçek): kalın çerçeve" stripeClass="border-2 border-slate-700" />
          <Legend label="Resmi olmayan (Taslak): kesik çerçeve" stripeClass="border-2 border-dashed border-slate-400" />
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Yükleniyor…
          </div>
        )}

        {!isLoading && view === 'calendar' && (
          <CalendarView
            events={filtered}
            granularity={granularity}
            setGranularity={setGranularity}
            cursor={cursor}
            setCursor={setCursor}
            locale={locale}
          />
        )}
        {!isLoading && view === 'kanban' && <KanbanView events={filtered} locale={locale} />}
        {!isLoading && view === 'map' && <MapView events={filtered} locale={locale} />}
      </div>
    </div>
  )
}

function Legend({
  dotClass,
  ringClass,
  stripeClass,
  label,
}: {
  dotClass?: string
  ringClass?: string
  stripeClass?: string
  label: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-slate-600">
      {dotClass && <span className={`w-3 h-3 rounded-full ${dotClass}`} />}
      {ringClass && <span className={`w-3 h-3 rounded-full bg-slate-300 ${ringClass}`} />}
      {stripeClass && <span className={`w-4 h-3 rounded-sm ${stripeClass}`} />}
      <span>{label}</span>
    </div>
  )
}

function eventCardClasses(e: TrackingEvent): string {
  const accepted = isAccepted(e.proposal.status)
  const official = isOfficial(e.proposal.proposalType)
  const colors = e.type === 'delivery' ? COLORS.delivery : COLORS.installation
  return [
    'rounded-md text-[11px] px-1.5 py-0.5 truncate cursor-pointer transition-shadow hover:shadow',
    colors.soft,
    colors.text,
    official ? 'border-2' : 'border-2 border-dashed',
    `border-${e.type === 'delivery' ? 'cyan' : 'violet'}-300`,
    accepted ? 'ring-2 ring-emerald-500 ring-offset-1' : '',
  ].join(' ')
}

// ── Calendar ──────────────────────────────────────────────────

function CalendarView({
  events,
  granularity,
  setGranularity,
  cursor,
  setCursor,
  locale,
}: {
  events: TrackingEvent[]
  granularity: Granularity
  setGranularity: (g: Granularity) => void
  cursor: Date
  setCursor: (d: Date) => void
  locale: string
}) {
  const range = useMemo(() => computeRange(cursor, granularity), [cursor, granularity])
  const visible = useMemo(
    () =>
      events.filter((e) => {
        const d = new Date(e.date).getTime()
        return d >= range.start.getTime() && d < range.end.getTime()
      }),
    [events, range],
  )

  const byDay = useMemo(() => {
    const m = new Map<string, TrackingEvent[]>()
    for (const e of visible) {
      const k = new Date(e.date).toISOString().slice(0, 10)
      const arr = m.get(k) ?? []
      arr.push(e)
      m.set(k, arr)
    }
    return m
  }, [visible])

  function shift(direction: -1 | 1) {
    const d = new Date(cursor)
    if (granularity === 'week') d.setDate(d.getDate() + direction * 7)
    if (granularity === 'month') d.setMonth(d.getMonth() + direction)
    if (granularity === 'quarter') d.setMonth(d.getMonth() + direction * 3)
    setCursor(d)
  }

  return (
    <div className="space-y-4">
      {/* Granularity + nav */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {GRANULARITY.map(({ k, label }) => {
            const active = granularity === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setGranularity(k)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-emerald-900 text-white' : 'text-slate-600 hover:bg-emerald-50',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            aria-label="Önceki"
            onClick={() => shift(-1)}
            className="w-9 h-9 grid place-items-center rounded-lg bg-white border border-slate-200 hover:bg-emerald-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium min-w-[160px] text-center">
            {range.label}
          </span>
          <button
            type="button"
            aria-label="Sonraki"
            onClick={() => shift(1)}
            className="w-9 h-9 grid place-items-center rounded-lg bg-white border border-slate-200 hover:bg-emerald-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="ml-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm hover:bg-emerald-50"
          >
            Bugün
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
            <div key={d} className="px-3 py-2 text-xs font-semibold text-slate-500 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {range.days.map((day) => {
            const key = day.toISOString().slice(0, 10)
            const dayEvents = byDay.get(key) ?? []
            const inRange = day.getTime() >= range.start.getTime() && day.getTime() < range.end.getTime()
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={key}
                className={[
                  'min-h-[110px] border-b border-r border-slate-100 p-1.5',
                  inRange ? 'bg-white' : 'bg-slate-50/40 text-slate-400',
                ].join(' ')}
              >
                <div
                  className={[
                    'text-xs font-medium mb-1 flex items-center justify-between',
                    isToday ? 'text-emerald-700 font-bold' : '',
                  ].join(' ')}
                >
                  <span>{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-slate-400">{dayEvents.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      href={`/${locale}/proposals/${e.proposal.id}`}
                      className={eventCardClasses(e)}
                      title={`${e.type === 'delivery' ? 'Teslim' : 'Kurulum'} · ${e.customer?.name ?? '—'} · ${e.proposal.number} · ${STATUS_LABELS[e.proposal.status] ?? e.proposal.status}`}
                    >
                      <div className="flex items-center gap-1">
                        {e.type === 'delivery' ? (
                          <Truck className="w-3 h-3 shrink-0" />
                        ) : (
                          <Wrench className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{e.customer?.name ?? '—'}</span>
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-slate-500 px-1">
                      +{dayEvents.length - 3} daha
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Aktif aralıkta detay listesi */}
      {visible.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Bu {granularity === 'week' ? 'hafta' : granularity === 'month' ? 'ay' : 'çeyrek'}: {visible.length} etkinlik
            </h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {visible.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <EventRow e={e} locale={locale} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EventRow({ e, locale }: { e: TrackingEvent; locale: string }) {
  const accepted = isAccepted(e.proposal.status)
  const official = isOfficial(e.proposal.proposalType)
  const colors = e.type === 'delivery' ? COLORS.delivery : COLORS.installation
  return (
    <Link
      href={`/${locale}/proposals/${e.proposal.id}`}
      className="flex items-start gap-3 hover:bg-slate-50 -mx-4 px-4 py-1 rounded-lg"
    >
      <div className={`w-10 h-10 rounded-xl ${colors.soft} grid place-items-center shrink-0`}>
        {e.type === 'delivery' ? (
          <Truck className={`w-5 h-5 ${colors.text}`} />
        ) : (
          <Wrench className={`w-5 h-5 ${colors.text}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{e.customer?.name ?? 'Müşteri yok'}</span>
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold',
              accepted
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            ].join(' ')}
          >
            {accepted ? '● Onaylı' : '○ Açık'}
          </span>
          <span
            className={[
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
              official ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500 border border-dashed border-slate-300',
            ].join(' ')}
          >
            {official ? 'Gerçek' : 'Taslak'}
          </span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 font-mono">
          {e.proposal.number} · {STATUS_LABELS[e.proposal.status] ?? e.proposal.status}
          {e.proposal.title && ` · ${e.proposal.title}`}
        </div>
        {e.customer?.address && (
          <div className="text-xs text-slate-400 mt-0.5 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{e.customer.address}</span>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-medium">
          {new Date(e.date).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'short',
          })}
        </div>
        <div
          className={[
            'inline-flex items-center gap-1 text-[10px] mt-0.5',
            e.completed ? 'text-emerald-600' : 'text-slate-400',
          ].join(' ')}
        >
          {e.completed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {e.completed ? 'Tamam' : 'Beklemede'}
        </div>
      </div>
    </Link>
  )
}

// ── Kanban ────────────────────────────────────────────────────

function KanbanView({ events, locale }: { events: TrackingEvent[]; locale: string }) {
  const columns: Array<{ key: string; label: string; tone: string; filter: (e: TrackingEvent) => boolean }> = [
    {
      key: 'pending',
      label: 'Beklemede',
      tone: 'border-amber-300 bg-amber-50',
      filter: (e) => !e.completed && new Date(e.date).getTime() > Date.now(),
    },
    {
      key: 'today',
      label: 'Bugün',
      tone: 'border-cyan-300 bg-cyan-50',
      filter: (e) => isSameDay(new Date(e.date), new Date()),
    },
    {
      key: 'overdue',
      label: 'Geciken',
      tone: 'border-rose-300 bg-rose-50',
      filter: (e) => !e.completed && new Date(e.date).getTime() < Date.now() - 86400000,
    },
    {
      key: 'done',
      label: 'Tamamlandı',
      tone: 'border-emerald-300 bg-emerald-50',
      filter: (e) => e.completed,
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map((col) => {
        const items = events.filter(col.filter)
        return (
          <div key={col.key} className={`rounded-2xl border ${col.tone} p-3`}>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              {col.label}
              <span className="text-xs font-medium bg-white rounded-full px-2 py-0.5 border border-slate-200">
                {items.length}
              </span>
            </h3>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Boş</p>
              ) : (
                items.map((e) => (
                  <Link
                    key={e.id}
                    href={`/${locale}/proposals/${e.proposal.id}`}
                    className="block rounded-xl bg-white border border-slate-200 p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {e.type === 'delivery' ? (
                          <Truck className="w-3.5 h-3.5 text-cyan-600" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5 text-violet-600" />
                        )}
                        <span className={e.type === 'delivery' ? 'text-cyan-700' : 'text-violet-700'}>
                          {e.type === 'delivery' ? 'Teslim' : 'Kurulum'}
                        </span>
                      </div>
                      <span
                        className={[
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          isOfficial(e.proposal.proposalType)
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-500 border border-dashed border-slate-300',
                        ].join(' ')}
                      >
                        {isOfficial(e.proposal.proposalType) ? 'Gerçek' : 'Taslak'}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-slate-900 truncate">
                      {e.customer?.name ?? '—'}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {e.proposal.number}
                      </p>
                      <span
                        className={[
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          isAccepted(e.proposal.status)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700',
                        ].join(' ')}
                      >
                        {isAccepted(e.proposal.status) ? 'Onaylı' : STATUS_LABELS[e.proposal.status] ?? e.proposal.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(e.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Map ───────────────────────────────────────────────────────

function MapView({ events, locale }: { events: TrackingEvent[]; locale: string }) {
  // Sadece kabul edilmiş tekliflerin sevk adresleri
  const acceptedOnly = events.filter((e) => isAccepted(e.proposal.status))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <p className="text-sm text-slate-600">
          🗺️ Harita yalnızca <strong>onaylanmış</strong> tekliflerin müşteri sevk
          adreslerini gösterir. {acceptedOnly.length} adres listeleniyor.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Harita render entegrasyonu (Mapbox / Google Maps) sıradaki dalgada — şimdilik
          adres listesi.
        </p>
      </div>

      {acceptedOnly.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Henüz onaylanmış teklif yok.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {acceptedOnly.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl bg-white border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <Link href={`/${locale}/proposals/${e.proposal.id}`} className="block">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${
                      e.type === 'delivery' ? 'bg-cyan-100' : 'bg-violet-100'
                    } grid place-items-center shrink-0`}
                  >
                    <MapPin
                      className={`w-5 h-5 ${
                        e.type === 'delivery' ? 'text-cyan-700' : 'text-violet-700'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{e.customer?.name ?? '—'}</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                        Onaylı
                      </span>
                      <span
                        className={[
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          isOfficial(e.proposal.proposalType)
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-500 border border-dashed border-slate-300',
                        ].join(' ')}
                      >
                        {isOfficial(e.proposal.proposalType) ? 'Gerçek' : 'Taslak'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {e.proposal.number}
                    </p>
                    <p className="text-xs text-slate-700 mt-2">
                      {e.customer?.address ?? 'Adres yok'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {e.type === 'delivery' ? '🚚 Teslim' : '🔧 Kurulum'} —{' '}
                      {new Date(e.date).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7 // Pzt = 0
  const r = new Date(d)
  r.setDate(d.getDate() - day)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3
  return new Date(d.getFullYear(), q, 1)
}

function computeRange(cursor: Date, granularity: Granularity): {
  start: Date
  end: Date
  days: Date[]
  label: string
} {
  let start: Date
  let end: Date
  if (granularity === 'week') {
    start = startOfWeek(cursor)
    end = new Date(start)
    end.setDate(end.getDate() + 7)
  } else if (granularity === 'month') {
    start = startOfMonth(cursor)
    end = new Date(start)
    end.setMonth(end.getMonth() + 1)
  } else {
    start = startOfQuarter(cursor)
    end = new Date(start)
    end.setMonth(end.getMonth() + 3)
  }

  // Grid'de gösterilecek günler — önce ilk haftanın başına git, sonunda son haftanın sonu
  const gridStart = startOfWeek(start)
  const gridEndDate = new Date(end)
  // Bitiş haftası tamamlanana kadar
  const tailDay = (gridEndDate.getDay() + 6) % 7
  if (tailDay !== 0) gridEndDate.setDate(gridEndDate.getDate() + (7 - tailDay))

  const days: Date[] = []
  const cur = new Date(gridStart)
  while (cur < gridEndDate) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  let label: string
  if (granularity === 'week') {
    label = `${start.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} - ${new Date(end.getTime() - 1).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}`
  } else if (granularity === 'month') {
    label = start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  } else {
    const q = Math.floor(start.getMonth() / 3) + 1
    label = `${q}. Çeyrek ${start.getFullYear()}`
  }

  return { start, end, days, label }
}
