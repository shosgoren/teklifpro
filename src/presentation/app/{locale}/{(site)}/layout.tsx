'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Özellikler', href: '#features' },
    { name: 'Fiyatlandırma', href: '#pricing' },
    { name: 'SSS', href: '#faq' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-700/20 shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow duration-300">
                <span className="text-white font-bold text-lg">TP</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">TeklifPro</h1>
                <p className="text-xs text-slate-400 -mt-1">Parasut Entegrasyonu</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-slate-300 hover:text-white transition-colors duration-200 font-medium text-sm relative group"
                  >
                    {link.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:w-full transition-all duration-300"></span>
                  </a>
                ))}
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3 ml-8 pl-8 border-l border-slate-700/50">
                <Link
                  href="/login"
                  className="px-4 py-2 text-slate-300 hover:text-white font-medium text-sm transition-colors duration-200"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/signup"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-sm rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 text-slate-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-slate-700/30 pt-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <Link
                  href="/login"
                  className="flex-1 px-4 py-2 text-center text-slate-300 hover:text-white font-medium text-sm transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium text-sm rounded-lg transition-all duration-200 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-16 md:pt-20">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-700/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">TP</span>
                </div>
                <h3 className="text-lg font-bold text-white">TeklifPro</h3>
              </div>
              <p className="text-slate-400 text-sm">Parasut Entegrasyonlu teklif platformu. Hızlı, güvenli, profesyonel.</p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Ürün</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors duration-200">
                    Özellikler
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors duration-200">
                    Fiyatlandırma
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Entegrasyonlar
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Şirket</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Hakkında
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    İletişim
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Yasal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Gizlilik Politikası
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Kullanım Şartları
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors duration-200">
                    Çerezler
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-700/50 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
              <p>&copy; 2024 TeklifPro. Tüm hakları saklıdır.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="hover:text-white transition-colors duration-200">
                  Twitter
                </a>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  LinkedIn
                </a>
                <a href="#" className="hover:text-white transition-colors duration-200">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
