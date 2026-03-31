'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { signOut, useSession } from 'next-auth/react'
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
} from 'lucide-react'

interface NavItem {
  nameKey: string
  href: string
  icon: React.ReactNode
}

const navigationItems: NavItem[] = [
  { nameKey: 'dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { nameKey: 'proposals', href: '/proposals', icon: <FileText className="w-5 h-5" /> },
  { nameKey: 'customers', href: '/customers', icon: <Users className="w-5 h-5" /> },
  { nameKey: 'products', href: '/products', icon: <Package className="w-5 h-5" /> },
  { nameKey: 'analytics', href: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { nameKey: 'settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
]

const navLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  proposals: 'Teklifler',
  customers: 'Müşteriler',
  products: 'Ürünler',
  analytics: 'Analitik',
  settings: 'Ayarlar',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const locale = useLocale()
  const { data: session } = useSession()

  const user = session?.user
  const userName = user?.name || 'Kullanıcı'
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-r border-slate-700/50 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="px-6 py-8 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">TP</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">TeklifPro</h1>
                <p className="text-xs text-slate-400">Teklif Platformu</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={getLocalizedHref(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <span
                    className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium text-sm">{navLabels[item.nameKey] || item.nameKey}</span>
                  {active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-lg"></div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="bg-slate-800/30 rounded-lg p-4 backdrop-blur-sm border border-slate-700/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-sm">{userInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-400 truncate">{userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900/50 hover:bg-slate-900 rounded-md transition-colors duration-200 border border-slate-700/30 hover:border-slate-600/50"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gradient-to-r from-slate-900/80 to-slate-950/80 backdrop-blur-lg border-b border-slate-700/50 px-4 md:px-8 py-4 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-300 hover:text-white"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Breadcrumb / Title (could be expanded) */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-lg font-semibold text-white">
                {navLabels[navigationItems.find(item => isActive(item.href))?.nameKey || 'dashboard'] || 'Dashboard'}
              </h2>
            </div>

            {/* User Menu (future expansion) */}
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-300 hover:text-white">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
