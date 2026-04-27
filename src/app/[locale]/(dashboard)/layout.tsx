'use client'

import React, { useState, useEffect, useRef, type ComponentType } from 'react'
import { ConfirmProvider, useConfirm } from '@/shared/components/confirm-dialog'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
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
} from 'lucide-react'
import { NotificationCenter } from '@/presentation/components/organisms/NotificationCenter'
import useSWR from 'swr'

const tenantFetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : null)

interface NavItem {
  nameKey: string
  href: string
  icon: ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

const navigationItems: NavItem[] = [
  {
    nameKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    nameKey: 'proposals',
    href: '/proposals',
    icon: FileText,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    nameKey: 'customers',
    href: '/customers',
    icon: Users,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    nameKey: 'products',
    href: '/products',
    icon: Package,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    nameKey: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    nameKey: 'settings',
    href: '/settings',
    icon: Settings,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
]

const MOBILE_PRIMARY_COUNT = 5
const SIDEBAR_COLLAPSED_KEY = 'teklifpro-sidebar-collapsed'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ConfirmProvider>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const confirm = useConfirm()
  const [collapsed, setCollapsed] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const t = useTranslations('layout')

  const labels: Record<string, string> = {
    dashboard: t('navDashboard'),
    proposals: t('navProposals'),
    customers: t('navCustomers'),
    products: t('navProducts'),
    analytics: t('navAnalytics'),
    settings: t('navSettings'),
    more: t('navMore'),
  }

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
  const userName = user?.name || t('user')
  const userEmail = user?.email || ''
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const getLocalizedHref = (href: string) => `/${locale}${href}`

  const isActive = (href: string) => {
    const localizedHref = getLocalizedHref(href)
    if (href === '/dashboard') {
      return pathname === localizedHref || pathname === `/${locale}`
    }
    return pathname.startsWith(localizedHref)
  }

  const switchLocale = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/'
    router.push(`/${newLocale}${pathWithoutLocale}`)
    setLangMenuOpen(false)
  }

  const isDark = theme === 'dark'
  const activeNavItem = navigationItems.find(item => isActive(item.href))
  const activePageKey = activeNavItem?.nameKey || 'dashboard'

  const mobilePrimaryItems = navigationItems.slice(0, MOBILE_PRIMARY_COUNT)
  const mobileSecondaryItems = navigationItems.slice(MOBILE_PRIMARY_COUNT)
  const isSecondaryActive = mobileSecondaryItems.some(item => isActive(item.href))

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('logoutTitle'),
      message: t('logoutMessage'),
      confirmText: t('logoutConfirm'),
      cancelText: t('logoutCancel'),
      variant: 'warning',
    })
    if (ok) {
      signOut({ callbackUrl: `/${locale}/login` })
    }
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
                    {t('quotePlatform')}
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
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`} role="navigation" aria-label={t('mainNavigation')}>
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const label = labels[item.nameKey] || item.nameKey
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={getLocalizedHref(item.href)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center rounded-lg transition-all duration-150 ${
                    collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-2.5 py-2'
                  } ${
                    active
                      ? 'bg-mint-50 text-mint-700 font-semibold'
                      : 'text-slate-600 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className={`flex items-center justify-center rounded-lg flex-shrink-0 ${
                    collapsed ? 'w-7 h-7' : 'w-8 h-8'
                  } ${item.iconBg}`}>
                    <Icon className={`w-4 h-4 ${item.iconColor}`} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="text-sm flex-1 truncate">{label}</span>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-mint-500" />}
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
          })}
        </nav>

        {/* User Profile */}
        <div className={`border-t border-border ${collapsed ? 'p-2' : 'p-3'}`}>
          {collapsed ? (
            <div className="relative group flex justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-tp-card cursor-default">
                <span className="text-white font-semibold text-sm">{userInitials}</span>
              </div>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                {userName}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-tp-card flex-shrink-0">
                  <span className="text-white font-semibold text-xs">{userInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md transition-colors duration-200 border border-border"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('signOut')}</span>
              </button>
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
                {labels[activePageKey] || 'Dashboard'}
              </h2>
            </div>

            {/* Search trigger (desktop) */}
            <button
              type="button"
              className="hidden md:flex items-center gap-2 flex-1 max-w-sm h-9 px-3 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground text-sm transition-colors"
              aria-label={t('searchPlaceholder') ?? 'Search'}
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">{t('searchPlaceholder') ?? 'Ara...'}</span>
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
                  aria-label={t('toggleTheme')}
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
                        locale === 'tr' ? 'bg-mint-50 text-mint-700 font-semibold' : 'text-slate-700 hover:bg-secondary'
                      }`}
                    >
                      Türkçe
                    </button>
                    <button
                      onClick={() => switchLocale('en')}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        locale === 'en' ? 'bg-mint-50 text-mint-700 font-semibold' : 'text-slate-700 hover:bg-secondary'
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
                title={t('signOut')}
                aria-label={t('signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-[0_-4px_20px_rgba(18,38,28,0.06)]" aria-label={t('mobileNavigation')}>
        <div className="flex items-center justify-around px-1 py-1 safe-bottom">
          {mobilePrimaryItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const label = labels[item.nameKey] || item.nameKey
            return (
              <Link
                key={item.href}
                href={getLocalizedHref(item.href)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg min-w-0 flex-1 transition-colors ${
                  active ? 'text-mint-700' : 'text-slate-500 active:text-slate-700'
                }`}
              >
                <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                  active ? 'bg-mint-50' : item.iconBg
                }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-mint-700' : item.iconColor}`} />
                </span>
                <span className={`text-[10px] leading-tight truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <div className="relative flex-1" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg w-full transition-colors ${
                isSecondaryActive ? 'text-mint-700' : 'text-slate-500 active:text-slate-700'
              }`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${
                isSecondaryActive ? 'bg-mint-50' : 'bg-slate-100'
              }`}>
                <MoreHorizontal className={`w-4 h-4 ${isSecondaryActive ? 'text-mint-700' : 'text-slate-600'}`} />
              </span>
              <span className={`text-[10px] leading-tight ${isSecondaryActive ? 'font-semibold' : 'font-medium'}`}>{labels.more}</span>
            </button>

            {/* More menu popup */}
            {moreMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-56 bg-white border border-border rounded-xl shadow-tp-elevated overflow-hidden z-50">
                {mobileSecondaryItems.map((item) => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  const label = labels[item.nameKey] || item.nameKey
                  return (
                    <Link
                      key={item.href}
                      href={getLocalizedHref(item.href)}
                      onClick={() => setMoreMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        active ? 'bg-mint-50 text-mint-700' : 'text-slate-700 hover:bg-secondary'
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
                    <span className="text-sm font-medium">{t('signOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
