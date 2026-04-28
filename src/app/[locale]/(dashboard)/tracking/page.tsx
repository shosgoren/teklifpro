'use client'

import { useMemo, useState } from 'react'
import {
  List,
  KanbanSquare,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Plus,
  Truck,
  Wrench,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Phone,
  MessageCircle,
  Search,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types & mock data
// ─────────────────────────────────────────────────────────────────────────────
type TrackType = 'delivery' | 'install' | 'appointment'
type TrackStatus = 'new' | 'confirmed' | 'in-progress' | 'done' | 'cancelled'

interface TrackItem {
  id: string
  type: TrackType
  customer: string
  subject: string
  address: string
  city: string
  date: string // ISO
  status: TrackStatus
  assignee: string
  amount?: number
  // map coords (0-1 normalised)
  x: number
  y: number
}

const ITEMS: TrackItem[] = [
  { id: 'TP-0042', type: 'install',     customer: 'Mehmet Kaya',          subject: 'Klima montajı 18.000 BTU',   address: 'Caferağa Mh. Mühürdar Cd. 12',  city: 'Kadıköy',     date: '2026-04-28T14:00:00', status: 'confirmed',   assignee: 'Ali Yılmaz',   amount: 24500,  x: 0.62, y: 0.55 },
  { id: 'TP-0041', type: 'delivery',    customer: 'Sema Demir',           subject: 'Kamera sistemi NVR + 4 kamera', address: 'Atatürk Mh. Çayır Sk. 8',     city: 'Ataşehir',    date: '2026-04-28T11:00:00', status: 'in-progress', assignee: 'Can Aksoy',    amount: 58200,  x: 0.71, y: 0.47 },
  { id: 'TP-0040', type: 'appointment', customer: 'Asya Tekstil A.Ş.',    subject: 'Ofis mobilyası keşif',         address: 'Maslak Mh. Büyükdere Cd. 245', city: 'Maslak',      date: '2026-04-29T10:30:00', status: 'new',         assignee: 'Selin Demir',  amount: 142000, x: 0.48, y: 0.36 },
  { id: 'TP-0039', type: 'appointment', customer: 'Ceren İnşaat Ltd.',    subject: 'Bakım sözleşmesi görüşmesi',   address: 'Beylikdüzü Mh. Sahil Cd. 17',  city: 'Beylikdüzü',  date: '2026-04-29T15:30:00', status: 'confirmed',   assignee: 'Yusuf Acar',   amount: 18900,  x: 0.16, y: 0.48 },
  { id: 'TP-0038', type: 'install',     customer: 'Durak Cafe',           subject: 'Klima x 3 kurulum',            address: 'Beşiktaş Mh. Barbaros Bul. 41', city: 'Beşiktaş',    date: '2026-04-30T09:00:00', status: 'done',        assignee: 'Can Aksoy',    amount: 74200,  x: 0.55, y: 0.42 },
  { id: 'TP-0037', type: 'delivery',    customer: 'Vero Giyim',           subject: '3 paket NVR teslimi',          address: 'Şişli Mh. Halaskargazi Cd. 92', city: 'Şişli',       date: '2026-04-30T13:24:00', status: 'done',        assignee: 'Ali Yılmaz',   amount: 36100,  x: 0.58, y: 0.38 },
  { id: 'TP-0036', type: 'install',     customer: 'Nova Otel',            subject: 'Sistem yenileme tadilatı',     address: 'Sarıyer Mh. Tarabya Cd. 5',     city: 'Sarıyer',     date: '2026-05-01T11:00:00', status: 'cancelled',   assignee: '—',            amount: 285000, x: 0.52, y: 0.22 },
  { id: 'TP-0035', type: 'appointment', customer: 'Mavi Zemin A.Ş.',      subject: 'Showroom ziyareti',            address: 'Ümraniye Mh. Alemdağ Cd. 102',  city: 'Ümraniye',    date: '2026-05-02T14:00:00', status: 'new',         assignee: 'Selin Demir',  amount: 0,      x: 0.78, y: 0.52 },
  { id: 'TP-0034', type: 'delivery',    customer: 'Birsen Aydın',         subject: 'Beyaz eşya teslimi',           address: 'Bakırköy Mh. İncirli Cd. 28',   city: 'Bakırköy',    date: '2026-05-03T10:00:00', status: 'confirmed',   assignee: 'Yusuf Acar',   amount: 42100,  x: 0.34, y: 0.55 },
  { id: 'TP-0033', type: 'install',     customer: 'Pınar Mobilya',        subject: 'Ofis kurulumu',                address: 'Kartal Mh. Yakacık Cd. 14',     city: 'Kartal',      date: '2026-05-05T09:30:00', status: 'in-progress', assignee: 'Ali Yılmaz',   amount: 96400,  x: 0.84, y: 0.62 },
  { id: 'TP-0032', type: 'appointment', customer: 'Karlı Apartmanı',      subject: 'Yıllık bakım',                 address: 'Levent Mh. Büyükdere Cd. 178',  city: 'Levent',      date: '2026-05-06T11:00:00', status: 'new',         assignee: 'Can Aksoy',    amount: 7800,   x: 0.50, y: 0.32 },
  { id: 'TP-0031', type: 'delivery',    customer: 'Esma Ticaret',         subject: 'Kasa & POS teslimi',           address: 'Fatih Mh. Aksaray Cd. 22',      city: 'Fatih',       date: '2026-05-07T13:00:00', status: 'confirmed',   assignee: 'Selin Demir',  amount: 12600,  x: 0.40, y: 0.41 },
]

// ─────────────────────────────────────────────────────────────────────────────
// Status & type helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META: Record<TrackStatus, { label: string; chip: string; dot: string; ring: string }> = {
  new:           { label: 'Yeni',         chip: 'bg-sky-50 text-sky-700 border-sky-200',           dot: 'bg-sky-500',           ring: 'ring-sky-200' },
  confirmed:     { label: 'Onaylı',       chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500',     ring: 'ring-emerald-200' },
  'in-progress': { label: 'Devam ediyor', chip: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-500',         ring: 'ring-amber-200' },
  done:          { label: 'Tamamlandı',   chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-700',   ring: 'ring-emerald-300' },
  cancelled:     { label: 'İptal',        chip: 'bg-rose-50 text-rose-700 border-rose-200',         dot: 'bg-rose-500',         ring: 'ring-rose-200' },
}

const TYPE_META: Record<TrackType, { label: string; Icon: typeof Truck; color: string; bg: string }> = {
  delivery:    { label: 'Teslimat', Icon: Truck,        color: 'text-sky-700',     bg: 'bg-sky-50' },
  install:     { label: 'Kurulum',  Icon: Wrench,       color: 'text-amber-700',   bg: 'bg-amber-50' },
  appointment: { label: 'Randevu',  Icon: CalendarDays, color: 'text-emerald-700', bg: 'bg-emerald-50' },
}

const VIEWS = [
  { k: 'list',     label: 'Liste',    Icon: List },
  { k: 'kanban',   label: 'Kanban',   Icon: KanbanSquare },
  { k: 'timeline', label: 'Zaman',    Icon: Clock },
  { k: 'map',      label: 'Harita',   Icon: MapPin },
  { k: 'calendar', label: 'Takvim',   Icon: CalendarIcon },
] as const

type ViewKey = (typeof VIEWS)[number]['k']

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long' })

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [view, setView] = useState<ViewKey>('list')
  const [search, setSearch] = useState('')

  const items = useMemo(() => {
    if (!search.trim()) return ITEMS
    const q = search.toLowerCase()
    return ITEMS.filter(
      (i) =>
        i.customer.toLowerCase().includes(q) ||
        i.subject.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q),
    )
  }, [search])

  const counts = useMemo(() => {
    const total = items.length
    const today = items.filter((i) => {
      const d = new Date(i.date)
      const now = new Date()
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
    }).length
    const inProgress = items.filter((i) => i.status === 'in-progress').length
    const done = items.filter((i) => i.status === 'done').length
    return { total, today, inProgress, done }
  }, [items])

  return (
    <div className="min-h-full bg-emerald-50/30">
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1400px] mx-auto">
        {/* ─── Header ─── */}
        <div className="mb-5 sm:mb-7">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-950">Takip</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-medium border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Canlı
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Teslimat, kurulum ve randevuları tek ekranda yönetin.</p>

          {/* summary badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
            <SummaryCard label="Toplam" value={counts.total} tone="slate" />
            <SummaryCard label="Bugün" value={counts.today} tone="sky" />
            <SummaryCard label="Devam ediyor" value={counts.inProgress} tone="amber" />
            <SummaryCard label="Tamamlandı" value={counts.done} tone="emerald" />
          </div>
        </div>

        {/* ─── Toolbar ─── */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          {/* view tabs */}
          <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto" role="tablist" aria-label="Görünüm">
            {VIEWS.map(({ k, label, Icon }) => {
              const active = view === k
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={label}
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

          {/* search */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 min-w-[180px] flex-1 lg:flex-none lg:w-72 shadow-sm">
            <Search className="w-4 h-4 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Müşteri, adres, şehir…"
              aria-label="Takip listesinde ara"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <ToolbarButton icon={<Filter className="w-4 h-4" />} label="Filtre" />
            <ToolbarButton icon={<Download className="w-4 h-4" />} label="Dışa aktar" />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              aria-label="Yeni kayıt ekle"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yeni</span>
            </button>
          </div>
        </div>

        {/* ─── Active view ─── */}
        {view === 'list'     && <ListView items={items} />}
        {view === 'kanban'   && <KanbanView items={items} />}
        {view === 'timeline' && <TimelineView items={items} />}
        {view === 'map'      && <MapView items={items} />}
        {view === 'calendar' && <CalendarView items={items} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'sky' | 'amber' | 'emerald' }) {
  const tones: Record<typeof tone, string> = {
    slate: 'bg-white border-slate-200 text-slate-700',
    sky: 'bg-sky-50 border-sky-200 text-sky-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  }
  return (
    <div className={`rounded-xl border ${tones[tone]} px-4 py-3 shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  )
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-white text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function StatusChip({ status }: { status: TrackStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }: { type: TrackType }) {
  const { Icon, label, color, bg } = TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${bg} ${color} text-xs font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ListView({ items }: { items: TrackItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-slate-100">
        {items.map((it) => (
          <div key={it.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-500">{it.id}</span>
                  <TypeBadge type={it.type} />
                </div>
                <p className="font-semibold text-sm text-slate-900 mt-1 truncate">{it.customer}</p>
                <p className="text-xs text-slate-500 truncate">{it.subject}</p>
              </div>
              <StatusChip status={it.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
              <span className="inline-flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{fmtDate(it.date)} · {fmtTime(it.date)}</span>
              <span className="truncate">{it.assignee}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/40">
            <tr className="text-xs text-slate-500 uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-semibold">Tarih</th>
              <th className="text-left px-3 py-3 font-semibold">Müşteri</th>
              <th className="text-left px-3 py-3 font-semibold">Tür</th>
              <th className="text-left px-3 py-3 font-semibold">Konu / Adres</th>
              <th className="text-left px-3 py-3 font-semibold">Durum</th>
              <th className="text-left px-3 py-3 font-semibold">Sorumlu</th>
              <th className="text-right px-5 py-3 font-semibold">Aksiyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-emerald-50/30 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="text-sm font-medium text-slate-900">{fmtDate(it.date)}</div>
                  <div className="text-xs text-slate-500 font-mono">{fmtTime(it.date)}</div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {it.customer.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{it.customer}</div>
                      <div className="text-xs text-slate-400 font-mono">{it.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5"><TypeBadge type={it.type} /></td>
                <td className="px-3 py-3.5 max-w-[280px]">
                  <div className="text-sm text-slate-700 truncate">{it.subject}</div>
                  <div className="text-xs text-slate-400 truncate">{it.city} · {it.address}</div>
                </td>
                <td className="px-3 py-3.5"><StatusChip status={it.status} /></td>
                <td className="px-3 py-3.5 text-sm text-slate-600">{it.assignee}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="inline-flex gap-1">
                    <IconBtn icon={<Phone className="w-3.5 h-3.5" />} label="Ara" />
                    <IconBtn icon={<MessageCircle className="w-3.5 h-3.5" />} label="Mesaj" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IconBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
    >
      {icon}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KANBAN VIEW (4 columns by status)
// ─────────────────────────────────────────────────────────────────────────────
function KanbanView({ items }: { items: TrackItem[] }) {
  const cols: { key: TrackStatus; title: string }[] = [
    { key: 'new', title: 'Yeni' },
    { key: 'confirmed', title: 'Onaylı' },
    { key: 'in-progress', title: 'Devam ediyor' },
    { key: 'done', title: 'Tamamlandı' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cols.map((col) => {
        const colItems = items.filter((i) => i.status === col.key)
        const meta = STATUS_META[col.key]
        return (
          <div key={col.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[200px]">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden />
                <h3 className="text-sm font-semibold text-slate-800">{col.title}</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">{colItems.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 max-h-[640px] overflow-y-auto">
              {colItems.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-8">Kayıt yok</div>
              ) : (
                colItems.map((it) => (
                  <article
                    key={it.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all cursor-grab"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-slate-400">{it.id}</span>
                      <TypeBadge type={it.type} />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate">{it.customer}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{it.subject}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {fmtDate(it.date)}
                      </span>
                      <div
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center"
                        title={it.assignee}
                      >
                        {it.assignee.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
            <button
              type="button"
              className="m-2 mt-0 py-2 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
            >
              + Ekle
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TimelineView({ items }: { items: TrackItem[] }) {
  // group by day, sort ascending by date
  const groups = useMemo(() => {
    const sorted = [...items].sort((a, b) => +new Date(a.date) - +new Date(b.date))
    const map = new Map<string, TrackItem[]>()
    sorted.forEach((it) => {
      const key = new Date(it.date).toISOString().slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(it)
      map.set(key, arr)
    })
    return Array.from(map.entries())
  }, [items])

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
      <div className="text-base font-semibold text-emerald-950 mb-4">Aktivite akışı</div>
      <div className="space-y-6">
        {groups.map(([day, arr]) => (
          <div key={day} className="flex flex-col sm:flex-row gap-3 sm:gap-6">
            {/* Date column */}
            <div className="sm:w-32 shrink-0">
              <div className="text-sm font-semibold text-emerald-900">{fmtDate(day)}</div>
              <div className="text-xs text-slate-400">{fmtDay(day)}</div>
            </div>
            {/* Vertical line + items */}
            <div className="relative flex-1 sm:border-l sm:border-slate-200 sm:pl-6 space-y-3">
              {arr.map((it) => {
                const { Icon, color, bg } = TYPE_META[it.type]
                return (
                  <div key={it.id} className="relative">
                    <span
                      className={`hidden sm:flex absolute -left-[33px] top-2 w-4 h-4 rounded-full ${bg} ring-4 ring-white border-2 border-white items-center justify-center`}
                      aria-hidden
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_META[it.status].dot}`} />
                    </span>
                    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors">
                      <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-slate-400">{it.id}</span>
                          <span className="text-sm font-semibold text-slate-900">{it.customer}</span>
                          <StatusChip status={it.status} />
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{it.subject}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(it.date)}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{it.city}</span>
                          <span className="truncate">{it.assignee}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP VIEW
// ─────────────────────────────────────────────────────────────────────────────
function MapView({ items }: { items: TrackItem[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Map */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div
          className="relative w-full"
          style={{
            height: 'min(640px, 60vh)',
            background: `
              linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%),
              repeating-linear-gradient(0deg, transparent 0 40px, rgba(16,185,129,0.06) 40px 41px),
              repeating-linear-gradient(90deg, transparent 0 40px, rgba(16,185,129,0.06) 40px 41px)
            `,
            backgroundBlendMode: 'normal, multiply, multiply',
          }}
        >
          {/* faux roads */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden>
            <path d="M 0,300 Q 200,250 400,310 T 800,280" stroke="rgb(167 243 208)" strokeWidth="8" fill="none" />
            <path d="M 100,560 Q 300,400 500,360 T 900,340" stroke="rgb(186 230 253)" strokeWidth="6" fill="none" />
            <path d="M 200,0 Q 240,200 280,400 T 360,700" stroke="rgb(167 243 208)" strokeWidth="5" fill="none" />
          </svg>

          {/* pins */}
          {items.slice(0, 8).map((it) => {
            const meta = STATUS_META[it.status]
            return (
              <div
                key={it.id}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%` }}
              >
                <div className="bg-white rounded-full px-3 py-1.5 border border-slate-200 shadow-md flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full ${meta.dot}`} aria-hidden />
                  <span className="truncate max-w-[140px]">{it.customer}</span>
                </div>
                <div className="w-0.5 h-3.5 bg-emerald-900/40 mx-auto" />
              </div>
            )
          })}

          {/* live courier */}
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '45%', top: '58%' }}>
            <div className="bg-emerald-900 text-white rounded-2xl px-3 py-2 shadow-lg flex items-center gap-2 text-xs font-semibold">
              <Truck className="w-4 h-4" />
              <div>
                <div>Kurye Yusuf</div>
                <div className="text-[10px] text-emerald-200 font-normal">2/3 teslim · 18 dk</div>
              </div>
            </div>
          </div>

          {/* zoom controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            {['+', '−'].map((s) => (
              <button
                key={s}
                type="button"
                aria-label={s === '+' ? 'Yakınlaştır' : 'Uzaklaştır'}
                className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-700 font-mono hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              aria-label="Konuma git"
              className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-700 inline-flex items-center justify-center hover:bg-slate-50"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>

          {/* footer pill */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-white/95 backdrop-blur border border-slate-200 text-xs text-slate-500 font-mono">
            İstanbul · {items.length} aktif
          </div>
        </div>
      </div>

      {/* Side list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Bugünkü kayıtlar</p>
          <p className="text-xs text-slate-400">{items.filter((i) => i.status === 'in-progress').length} aktif · {items.filter((i) => i.status === 'done').length} tamamlandı</p>
        </div>
        <ul className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {items.slice(0, 8).map((it) => {
            const { Icon, bg, color } = TYPE_META[it.type]
            const meta = STATUS_META[it.status]
            return (
              <li key={it.id} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/30">
                <div className={`w-9 h-9 rounded-full ${bg} ${color} flex items-center justify-center shrink-0`}>
                  {it.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{it.customer}</div>
                  <div className="text-xs text-slate-400 truncate">{it.city} · {it.assignee}</div>
                </div>
                <span className="text-xs font-mono text-slate-400 inline-flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {fmtTime(it.date)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CalendarView({ items }: { items: TrackItem[] }) {
  // April 2026: starts on Wednesday (April 1, 2026)
  const monthLabel = 'Nisan 2026'
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  const firstDayOffset = 2 // April 1, 2026 is Wednesday → index 2 in [Pzt..Paz]
  const daysInMonth = 30

  const eventsByDay = useMemo(() => {
    const m = new Map<number, TrackItem[]>()
    items.forEach((it) => {
      const d = new Date(it.date)
      if (d.getFullYear() === 2026 && d.getMonth() === 3) {
        const day = d.getDate()
        const arr = m.get(day) ?? []
        arr.push(it)
        m.set(day, arr)
      }
    })
    return m
  }, [items])

  const todayDay = new Date().getMonth() === 3 && new Date().getFullYear() === 2026 ? new Date().getDate() : -1
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 sm:px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-emerald-950">{monthLabel}</h3>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Önceki ay" className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Sonraki ay" className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-emerald-50/40">
        {days.map((d) => (
          <div key={d} className="px-2 sm:px-3 py-2.5 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      {/* Cells */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, i) => {
          const day = i - firstDayOffset + 1
          const valid = day >= 1 && day <= daysInMonth
          const evs = valid ? (eventsByDay.get(day) ?? []) : []
          const isToday = valid && day === todayDay
          return (
            <div
              key={i}
              className={[
                'min-h-[80px] sm:min-h-[110px] border-r border-b border-slate-100 p-1.5 sm:p-2',
                valid ? 'bg-white' : 'bg-slate-50/50 opacity-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={[
                    'inline-flex w-6 h-6 items-center justify-center text-xs font-semibold rounded-full',
                    isToday ? 'bg-emerald-600 text-white' : 'text-slate-700',
                  ].join(' ')}
                >
                  {valid ? day : ''}
                </span>
                {evs.length > 3 && (
                  <span className="text-[10px] font-mono text-slate-400">+{evs.length - 3}</span>
                )}
              </div>
              <div className="space-y-1">
                {evs.slice(0, 3).map((it) => {
                  const { bg, color } = TYPE_META[it.type]
                  return (
                    <div
                      key={it.id}
                      className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded ${bg} ${color} font-medium truncate flex items-center gap-1`}
                      title={`${fmtTime(it.date)} ${it.customer}`}
                    >
                      <span className="font-mono opacity-70 hidden sm:inline">{fmtTime(it.date)}</span>
                      <span className="truncate">{it.customer}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
