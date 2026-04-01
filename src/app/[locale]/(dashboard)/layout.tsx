'use client'

import React, { useState, useEffect, useRef, type ComponentType } from 'react'
import { ConfirmProvider, useConfirm } from '@/shared/components/confirm-dialog'
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
  Menu,
  X,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
} from 'lucide-react'

interface NavItem {
  nameKey: string
  href: string
  icon: ComponentType<{ className?: string }>
  iconColor: string
  iconColorDark: string
}

const navigationItems: NavItem[] = [
  {
    nameKey: 'dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    iconColor: 'text-blue-500',
    iconColorDark: 'dark:text-blue-400',
  },
  {
    nameKey: 'proposals',
    href: '/proposals',
    icon: FileText,
    iconColor: 'text-purple-500',
    iconColorDark: 'dark:text-purple-400',
  },
  {
    nameKey: 'customers',
    href: '/customers',
    icon: Users,
    iconColor: 'text-emerald-500',
    iconColorDark: 'dark:text-emerald-400',
  },
  {
    nameKey: 'products',
    href: '/products',
    icon: Package,
    iconColor: 'text-amber-500',
    iconColorDark: 'dark:text-amber-400',
  },
  {
    nameKey: 'analytics',
    href: '/analytics',
    icon: BarChart3,
    iconColor: 'text-rose-500',
    iconColorDark: 'dark:text-rose-400',
  },
  {
    nameKey: 'settings',
    href: '/settings',
    icon: Settings,
    iconColor: 'text-slate-500',
    iconColorDark: 'dark:text-slate-400',
  },
]

// First 4 items shown in bottom tab bar, rest in "more" menu
const MOBILE_PRIMARY_COUNT = 5

const navLabels: Record<string, Record<string, string>> = {
  tr: {
    dashboard: 'Dashboard',
    proposals: 'Teklifler',
    customers: 'Müşteriler',
    products: 'Ürünler',
    analytics: 'Analitik',
    settings: 'Ayarlar',
    more: 'Diğer',
  },
  en: {
    dashboard: 'Dashboard',
    proposals: 'Proposals',
    customers: 'Customers',
    products: 'Products',
    analytics: 'Analytics',
    settings: 'Settings',
    more: 'More',
  },
}

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

  const labels = navLabels[locale] || navLabels.tr

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

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
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 border-r border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Logo + Collapse Toggle */}
        <div className={`border-b border-slate-200 dark:border-slate-700/50 ${collapsed ? 'px-3 py-5' : 'px-6 py-8'}`}>
          <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
            <div className={`rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <span className="text-white font-bold text-lg">TP</span>
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">TeklifPro</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('quotePlatform')}
                  </p>
                </div>
                <button
                  onClick={toggleCollapsed}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
            {collapsed && (
              <button
                onClick={toggleCollapsed}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-4'}`}>
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const label = labels[item.nameKey] || item.nameKey
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={getLocalizedHref(item.href)}
                  className={`flex items-center rounded-lg transition-all duration-200 group/link ${
                    collapsed ? 'justify-center w-11 h-11 mx-auto' : 'gap-3 px-4 py-3'
                  } ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`transition-transform duration-200 flex-shrink-0 ${active ? 'scale-110' : 'group-hover/link:scale-110'}`}>
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : `${item.iconColor} ${item.iconColorDark}`}`} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="font-medium text-sm">{label}</span>
                      {active && <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-lg" />}
                    </>
                  )}
                </Link>
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {label}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className={`border-t border-slate-200 dark:border-slate-700/50 ${collapsed ? 'p-2' : 'p-4'}`}>
          {collapsed ? (
            <div className="relative group flex justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg cursor-default">
                <span className="text-white font-semibold text-sm">{userInitials}</span>
              </div>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                {userName}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700" />
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">{userInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors duration-200 border border-slate-200 dark:border-slate-700/30"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar */}
        <header className="bg-white/80 dark:bg-gradient-to-r dark:from-slate-900/80 dark:to-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/50 px-4 md:px-8 py-3 shadow-sm dark:shadow-lg">
          <div className="flex items-center justify-between">
            {/* Title */}
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {labels[navigationItems.find(item => isActive(item.href))?.nameKey || 'dashboard'] || 'Dashboard'}
            </h2>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {mounted && (
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-600 dark:text-slate-300"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              )}

              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1 px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-600 dark:text-slate-300 text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  <span className="uppercase hidden sm:inline">{locale}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => switchLocale('tr')}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        locale === 'tr' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      Türkçe
                    </button>
                    <button
                      onClick={() => switchLocale('en')}
                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        locale === 'en' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
                className="hidden md:flex p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-600 dark:text-slate-300"
                title={t('signOut')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content - add bottom padding on mobile for tab bar */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around px-1 py-1 safe-bottom">
          {mobilePrimaryItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const label = labels[item.nameKey] || item.nameKey
            return (
              <Link
                key={item.href}
                href={getLocalizedHref(item.href)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg min-w-0 flex-1 transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 active:text-slate-700 dark:active:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : `${item.iconColor} ${item.iconColorDark}`}`} />
                <span className={`text-[10px] leading-tight truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />}
              </Link>
            )
          })}

          {/* More button */}
          <div className="relative flex-1" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg w-full transition-colors ${
                isSecondaryActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-700'
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className={`text-[10px] leading-tight ${isSecondaryActive ? 'font-semibold' : 'font-medium'}`}>{labels.more}</span>
              {isSecondaryActive && <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5" />}
            </button>

            {/* More menu popup */}
            {moreMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
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
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : `${item.iconColor} ${item.iconColorDark}`}`} />
                      <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                    </Link>
                  )
                })}

                {/* Sign out in more menu */}
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
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
