'use client'

import React, { useState, useEffect, useRef, useMemo, type ComponentType } from 'react'
import { ConfirmProvider, useConfirm } from '@/shared/components/confirm-dialog'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Home,
  FileText,
  Users,
  Package,
  Settings,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  Search,
  Truck,
  Wrench,
  Calendar,
  User,
  Box,
  Sparkles,
} from 'lucide-react'
import { NotificationCenter } from '@/presentation/components/organisms/NotificationCenter'
import { GlobalSearch } from '@/presentation/components/organisms/GlobalSearch'
import { WorkspaceProvider } from '@/presentation/components/dashboard/WorkspaceProvider'
import useSWR from 'swr'

const tenantFetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

interface NavItem {
  nameKey: string
  fallbackLabel: string
  href: string
  icon: ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  badge?: { text: string; bg: string; color: string }
  /** Optional matcher for active state when href includes search params */
  matchType?: string
}

interface NavSection {
  titleKey: string
  fallbackTitle: string
  items: NavItem[]
}

const HOME_ITEM: NavItem = {
  nameKey: 'navDashboard',
  fallbackLabel: 'Ana sayfa',
  href: '/dashboard',
  icon: Home,
  iconBg: 'bg-emerald-100',
  iconColor: 'text-emerald-600',
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'sectionSales',
    fallbackTitle: 'SATIŞ',
    items: [
      {
        nameKey: 'navProposals',
        fallbackLabel: 'Teklifler',
        href: '/proposals',
        icon: FileText,
        iconBg: 'bg-sky-100',
        iconColor: 'text-sky-600',
        badge: { text: '12', bg: 'bg-emerald-100', color: 'text-emerald-700' },
      },
      {
        nameKey: 'navOrders',
        fallbackLabel: 'Siparişler',
        href: '/proposals?status=approved',
        icon: Package,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        badge: { text: '4', bg: 'bg-amber-100', color: 'text-amber-700' },
      },
      {
        nameKey: 'navDelivery',
        fallbackLabel: 'Teslimat',
        href: '/tracking?type=delivery',
        icon: Truck,
        iconBg: 'bg-cyan-100',
        iconColor: 'text-cyan-600',
        matchType: 'delivery',
      },
      {
        nameKey: 'navInstall',
        fallbackLabel: 'Kurulum',
        href: '/tracking?type=install',
        icon: Wrench,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        matchType: 'install',
      },
      {
        nameKey: 'navAppointments',
        fallbackLabel: 'Randevular',
        href: '/tracking?type=appointment',
        icon: Calendar,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        matchType: 'appointment',
      },
    ],
  },
  {
    titleKey: 'sectionRecords',
    fallbackTitle: 'KAYITLAR',
    items: [
      {
        nameKey: 'navCustomers',
        fallbackLabel: 'Müşteriler',
        href: '/customers',
        icon: User,
        iconBg: 'bg-pink-100',
        iconColor: 'text-pink-600',
      },
      {
        nameKey: 'navProducts',
        fallbackLabel: 'Ürünler',
        href: '/products',
        icon: Box,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
    ],
  },
  {
    titleKey: 'sectionSystem',
    fallbackTitle: 'SİSTEM',
    items: [
      {
        nameKey: 'navSettings',
        fallbackLabel: 'Ayarlar',
        href: '/settings',
        icon: Settings,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600',
      },
    ],
  },
]

const SIDEBAR_COLLAPSED_KEY = 'teklifpro-sidebar-collapsed'
const RECENT_PAGES_KEY = 'tp-recent-pages'
const MAX_RECENT_PAGES = 4

interface RecentPage {
  pathname: string
  label: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <WorkspaceProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </WorkspaceProvider>
    </ConfirmProvider>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const confirm = useConfirm()
  const [collapsed, setCollapsed] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const langMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const t = useTranslations('layout')

  const safeT = (key: string, fallback: string) => {
    try {
      const value = t(key as Parameters<typeof t>[0])
      return value || fallback
    } catch {
      return fallback
    }
  }

  // Build a flat label map for nav items
  const allNavItems = useMemo<NavItem[]>(() => {
    return [HOME_ITEM, ...NAV_SECTIONS.flatMap((s) => s.items)]
  }, [])

  const getLabel = (item: NavItem) => safeT(item.nameKey, item.fallbackLabel)

  const { data: tenantData } = useSWR('/api/v1/settings/logo', tenantFetcher, { revalidateOnFocus: false })
  const tenantLogo: string | null = tenantData?.data?.logo || null
  const tenantName: string | null = tenantData?.data?.name || null

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === 'true') setCollapsed(true)

    // Load recent pages
    try {
      const raw = localStorage.getItem(RECENT_PAGES_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RecentPage[]
        if (Array.isArray(parsed)) {
          setRecentPages(parsed.slice(0, MAX_RECENT_PAGES))
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [mounted])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  const user = session?.user
  const userName = user?.name || safeT('user', 'Kullanıcı')
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const getLocalizedHref = (href: string) => `/${locale}${href}`

  // Read current type query param from window (client-side only)
  const [currentTypeParam, setCurrentTypeParam] = useState<string | null>(null)
  const [currentStatusParam, setCurrentStatusParam] = useState<string | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    setCurrentTypeParam(sp.get('type'))
    setCurrentStatusParam(sp.get('status'))
  }, [pathname])

  const isActive = (item: NavItem): boolean => {
    const [hrefPath, hrefQuery] = item.href.split('?')
    const localizedHref = getLocalizedHref(hrefPath)

    if (hrefPath === '/dashboard') {
      return pathname === localizedHref || pathname === `/${locale}`
    }

    // Tracking variants — match by pathname + ?type=
    if (hrefPath === '/tracking' && item.matchType) {
      return pathname.includes('/tracking') && currentTypeParam === item.matchType
    }

    // Orders placeholder under /proposals?status=approved
    if (hrefPath === '/proposals' && hrefQuery && hrefQuery.includes('status=approved')) {
      return pathname.startsWith(localizedHref) && currentStatusParam === 'approved'
    }

    // Plain proposals — must NOT match when status=approved (so "Siparişler" doesn't conflict)
    if (item.href === '/proposals') {
      return pathname.startsWith(localizedHref) && currentStatusParam !== 'approved'
    }

    return pathname.startsWith(localizedHref)
  }

  // Track recent pages: push the current pathname's matching nav item
  useEffect(() => {
    if (!mounted) return
    const matched = allNavItems.find((it) => isActive(it))
    if (!matched) return
    const label = getLabel(matched)
    const entry: RecentPage = { pathname: matched.href, label }

    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.pathname !== entry.pathname)
      const next = [entry, ...filtered].slice(0, MAX_RECENT_PAGES)
      try {
        localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(next))
      } catch {
        // ignore quota errors
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentTypeParam, currentStatusParam, mounted, locale])

  // Mock initial recent pages when none exist
  const displayRecentPages: RecentPage[] = useMemo(() => {
    if (recentPages.length > 0) return recentPages
    return [
      { pathname: '/products', label: safeT('navProducts', 'Ürünler') },
      { pathname: '/customers', label: safeT('navCustomers', 'Müşteriler') },
      { pathname: '/proposals?status=approved', label: safeT('navOrders', 'Siparişler') },
      { pathname: '/settings', label: safeT('navSettings', 'Ayarlar') },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentPages, locale])

  const switchLocale = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
    router.push(`/${newLocale}${pathWithoutLocale}`)
    setLangMenuOpen(false)
  }

  const isDark = theme === 'dark'
  const activeNavItem = allNavItems.find((item) => isActive(item))
  const activePageLabel = activeNavItem ? getLabel(activeNavItem) : safeT('navDashboard', 'Ana sayfa')

  // Mobile bottom nav: Ana sayfa, Teklifler, Müşteriler, Ürünler, More (drawer)
  const mobilePrimaryItems: NavItem[] = [
    HOME_ITEM,
    NAV_SECTIONS[0].items[0], // Teklifler
    NAV_SECTIONS[1].items[0], // Müşteriler
    NAV_SECTIONS[1].items[1], // Ürünler
  ]
  const mobileSecondaryItems: NavItem[] = [
    NAV_SECTIONS[0].items[1], // Siparişler
    NAV_SECTIONS[0].items[2], // Teslimat
    NAV_SECTIONS[0].items[3], // Kurulum
    NAV_SECTIONS[0].items[4], // Randevular
    NAV_SECTIONS[2].items[0], // Ayarlar
  ]
  const isSecondaryActive = mobileSecondaryItems.some((item) => isActive(item))

  const handleLogout = async () => {
    const ok = await confirm({
      title: safeT('logoutTitle', 'Çıkış yap'),
      message: safeT('logoutMessage', 'Çıkış yapmak istediğinize emin misiniz?'),
      confirmText: safeT('logoutConfirm', 'Çıkış yap'),
      cancelText: safeT('logoutCancel', 'İptal'),
      variant: 'warning',
    })
    if (ok) {
      signOut({ callbackUrl: `/${locale}/login` })
    }
  }

  // Plan usage card values (mock)
  const planName = 'Professional'
  const planUsedCount = 42
  const planTotalCount = 200
  const planPercent = Math.round((planUsedCount / planTotalCount) * 100)

  // Render a single nav row
  const renderNavRow = (item: NavItem) => {
    const active = isActive(item)
    const Icon = item.icon
    const label = getLabel(item)
    return (
      <div key={item.href} className="relative group">
        <Link
          href={getLocalizedHref(item.href)}
          aria-current={active ? 'page' : undefined}
          className={`flex items-center rounded-lg transition-all duration-150 ${
            collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-2.5 py-2'
          } ${
            active
              ? 'bg-emerald-50 text-emerald-700 font-semibold'
              : 'text-slate-600 hover:bg-muted hover:text-foreground'
          }`}
        >
          <span
            className={`flex items-center justify-center rounded-lg flex-shrink-0 ${
              collapsed ? 'w-7 h-7' : 'w-8 h-8'
            } ${item.iconBg}`}
          >
            <Icon className={`w-4 h-4 ${item.iconColor}`} />
          </span>
          {!collapsed && (
            <>
              <span className="text-sm flex-1 truncate">{label}</span>
              {item.badge && (
                <span
                  className={`ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${item.badge.bg} ${item.badge.color}`}
                >
                  {item.badge.text}
                </span>
              )}
            </>
          )}
        </Link>
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-slate-950 border-r border-border transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo + Collapse Toggle */}
        <div className={`border-b border-border ${collapsed ? 'px-3 py-5' : 'px-5 py-6'}`}>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
            {tenantLogo ? (
              <img
                src={tenantLogo}
                alt={tenantName || 'Logo'}
                className="rounded-xl object-contain flex-shrink-0 w-10 h-10 shadow-tp-card"
              />
            ) : (
              <div className="rounded-xl bg-gradient-to-br from-mint-500 to-mint-700 flex items-center justify-center shadow-tp-card flex-shrink-0 w-10 h-10">
                <span className="text-white font-bold text-lg">{tenantName ? tenantName.charAt(0).toUpperCase() : 'TP'}</span>
              </div>
            )}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-semibold text-foreground tracking-tight truncate">{tenantName || 'TeklifPro'}</h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {safeT('quotePlatform', 'Teklif Platformu')}
                  </p>
                </div>
                <button
                  onClick={toggleCollapsed}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground flex-shrink-0"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={toggleCollapsed}
                className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 py-4 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}
          role="navigation"
          aria-label={safeT('mainNavigation', 'Ana navigasyon')}
        >
          {/* Solo: Ana sayfa */}
          <div className="space-y-1">{renderNavRow(HOME_ITEM)}</div>

          {/* Sections */}
          {NAV_SECTIONS.map((section) => (
            <div key={section.titleKey} className="mt-4">
              {!collapsed && (
                <div className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase mb-1 px-3">
                  {safeT(section.titleKey, section.fallbackTitle)}
                </div>
              )}
              <div className="space-y-1">{section.items.map((item) => renderNavRow(item))}</div>
            </div>
          ))}

          {/* Hairline divider + Recent pages (hidden when collapsed) */}
          {!collapsed && (
            <>
              <div className="border-t border-border my-3 mx-3" />
              <div>
                <div className="text-[10px] tracking-wider font-semibold text-slate-400 uppercase mb-1 px-3">
                  {safeT('sectionRecent', 'SON BAKTIKLARIN')}
                </div>
                <ul className="space-y-1">
                  {displayRecentPages.map((page) => (
                    <li key={page.pathname}>
                      <Link
                        href={getLocalizedHref(page.pathname)}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-muted transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                        <span className="truncate">{page.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </nav>

        {/* Plan usage card (replaces user profile card) */}
        <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <div className="relative group flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500">{planPercent}%</span>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                {planName} — {planUsedCount}/{planTotalCount}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">{planName}</span>
                <span className="ml-auto text-xs text-slate-500">{planPercent}%</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                {safeT('planUsageThisMonth', 'Bu ay')}{' '}
                <span className="text-slate-900 font-semibold">{planUsedCount}</span>
                {' / '}
                {planTotalCount}{' '}
                {safeT('planUsageProposals', 'teklif')}
              </p>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${planPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar — clean white with bottom border */}
        <header className="shrink-0 bg-white dark:bg-slate-950 border-b border-border px-4 md:px-6 h-14 flex items-center">
          <div className="flex items-center justify-between w-full gap-3">
            {/* Title */}
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-semibold truncate text-foreground tracking-tight">
                {activePageLabel}
              </h2>
            </div>

            {/* Search trigger (desktop) */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('tp:open-palette'))}
              className="hidden md:flex items-center gap-2 flex-1 max-w-sm h-9 px-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground text-sm transition-colors"
              aria-label={safeT('searchPlaceholder', 'Ara')}
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">{safeT('searchPlaceholder', 'Ara...')}</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-white text-[10px] font-mono text-muted-foreground">
                ⌘K
              </kbd>
            </button>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              <NotificationCenter
                onNotificationClick={(n) => {
                  if (n.proposalId) {
                    router.push(getLocalizedHref(`/proposals/${n.proposalId}`))
                  }
                }}
              />
              {mounted && (
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label={safeT('toggleTheme', 'Temayı değiştir')}
                  className="p-2 rounded-lg transition-colors duration-200 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1 px-2 py-2 rounded-lg transition-colors duration-200 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Globe className="w-4 h-4" />
                  <span className="uppercase hidden sm:inline">{locale}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-border rounded-lg shadow-tp-elevated overflow-hidden z-50">
                    <button
                      onClick={() => switchLocale('tr')}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        locale === 'tr' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-secondary'
                      }`}
                    >
                      Türkçe
                    </button>
                    <button
                      onClick={() => switchLocale('en')}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        locale === 'en' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-secondary'
                      }`}
                    >
                      English
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop user menu */}
              <button
                onClick={handleLogout}
                className="hidden md:flex p-2 rounded-lg transition-colors duration-200 text-muted-foreground hover:bg-muted hover:text-foreground"
                title={safeT('signOut', 'Çıkış yap')}
                aria-label={safeT('signOut', 'Çıkış yap')}
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Initials avatar (visual only, no menu) */}
              <div className="hidden md:flex w-8 h-8 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 items-center justify-center shadow-tp-card ml-1" title={userName}>
                <span className="text-white font-semibold text-xs">{userInitials}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-[0_-4px_20px_rgba(18,38,28,0.06)]"
        aria-label={safeT('mobileNavigation', 'Mobil navigasyon')}
      >
        <div className="flex items-center justify-around px-1 py-1 safe-bottom">
          {mobilePrimaryItems.map((item) => {
            const active = isActive(item)
            const Icon = item.icon
            const label = getLabel(item)
            return (
              <Link
                key={item.href}
                href={getLocalizedHref(item.href)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg min-w-0 flex-1 transition-colors ${
                  active ? 'text-emerald-700' : 'text-slate-500 active:text-slate-700'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                  active ? 'bg-emerald-50' : item.iconBg
                }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-700' : item.iconColor}`} />
                </span>
                <span className={`text-[10px] leading-tight truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <div className="relative flex-1" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              aria-label={safeT('navMore', 'Daha fazla')}
              aria-expanded={moreMenuOpen}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg w-full transition-colors ${
                isSecondaryActive ? 'text-emerald-700' : 'text-slate-500 active:text-slate-700'
              }`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                isSecondaryActive ? 'bg-emerald-50' : 'bg-slate-100'
              }`}>
                <MoreHorizontal className={`w-4 h-4 ${isSecondaryActive ? 'text-emerald-700' : 'text-slate-600'}`} />
              </span>
              <span className={`text-[10px] leading-tight ${isSecondaryActive ? 'font-semibold' : 'font-medium'}`}>
                {safeT('navMore', 'Daha fazla')}
              </span>
            </button>

            {/* More menu popup */}
            {moreMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-border rounded-xl shadow-tp-elevated overflow-hidden z-50">
                {mobileSecondaryItems.map((item) => {
                  const active = isActive(item)
                  const Icon = item.icon
                  const label = getLabel(item)
                  return (
                    <Link
                      key={item.href}
                      href={getLocalizedHref(item.href)}
                      onClick={() => setMoreMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-secondary'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${item.iconBg}`}>
                        <Icon className={`w-4 h-4 ${item.iconColor}`} />
                      </span>
                      <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                    </Link>
                  )
                })}

                <div className="border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">{safeT('signOut', 'Çıkış yap')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Global command palette (Cmd+K or topbar search button) */}
      <GlobalSearch />
    </div>
  )
}
