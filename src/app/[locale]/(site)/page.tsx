'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Mic,
  MessageCircle,
  Truck,
  Wrench,
  Calendar,
  Zap,
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Globe,
  Shield,
  Clock,
  TrendingUp,
  Users,
  ChevronDown,
  Star,
  Quote,
  PlayCircle,
  AudioLines,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

// ────────────────────────────────────────────────────────────
// Static waveform — deterministic pseudo-random bars (mirrors prototype)
// ────────────────────────────────────────────────────────────
function Waveform({ bars = 28, height = 22, className }: { bars?: number; height?: number; className?: string }) {
  const arr = React.useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const v = Math.sin(i * 1.7) * Math.cos(i * 0.6) * 0.5 + 0.5;
        return 0.25 + v * 0.75;
      }),
    [bars],
  );
  return (
    <div className={cn('flex items-end gap-[3px]', className)} style={{ height }} aria-hidden="true">
      {arr.map((v, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm bg-mint-600/70"
          style={{ height: `${v * 100}%` }}
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// VoiceBubble — sesli not bloğu (prototip hero kartı solu)
// ────────────────────────────────────────────────────────────
function VoiceBubble({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-mint-50/60 p-4">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint-600 text-white shadow-glow-mint"
        aria-hidden="true"
      >
        <Mic className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <Waveform bars={24} height={22} />
        <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{text}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// MiniPhoneChat — WhatsApp telefon mockup
// ────────────────────────────────────────────────────────────
function MiniPhoneChat() {
  return (
    <div
      className="mx-auto h-[480px] w-[260px] overflow-hidden rounded-[38px] bg-slate-900 p-2 shadow-2xl ring-1 ring-black/10"
      aria-hidden="true"
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-[30px] bg-[#efeae2]">
        {/* WhatsApp header */}
        <div className="flex items-center gap-2.5 bg-[#075e54] px-3.5 pb-2.5 pt-4 text-white">
          <ChevronLeft className="h-4 w-4" />
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-mint-500 to-mint-700 text-xs font-bold">
            t
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Teknik İklim</div>
            <div className="text-[10px] opacity-80">çevrimiçi</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-[2px] bg-[#e7fbe9] px-2.5 py-2 text-xs leading-snug">
            Merhaba Mehmet Bey, konuştuğumuz teklif hazır:
          </div>

          <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-[2px] bg-white p-2.5 text-xs shadow-sm">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-mint-50">
                <FileText className="h-4 w-4 text-mint-700" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">TP-2026-0042</div>
                <div className="font-mono text-[10px] text-slate-500">₺ 24.500 · 3 kalem</div>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5 text-center text-xs font-semibold text-[#1fa855]">
              Teklifi aç →
            </div>
          </div>

          <div className="mr-auto max-w-[75%] rounded-xl rounded-tl-[2px] bg-white px-2.5 py-2 text-xs">
            Teşekkürler, şimdi bakıyorum 👀
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Landing Page
// ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const t = useTranslations('site');
  const pathname = usePathname();
  const locale = useLocale();
  const [isMonthly, setIsMonthly] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);

  const faqItems = t.raw('faq.items') as Array<{ q: string; a: string }>;
  const starterFeatures = t.raw('pricing.starter.features') as string[];
  const professionalFeatures = t.raw('pricing.professional.features') as string[];

  // 3 plans — prototype expects Starter / Professional / Scale, codebase has Starter / Professional.
  // We add a third plan inline since translation keys for "scale" don't exist yet.
  const scaleFeatures = [
    'Sınırsız her şey',
    'Çok şubeli yönetim',
    'Gelişmiş analitik & API',
    'Özel entegrasyon',
    'SLA destek',
    'Sınırsız kullanıcı',
  ];

  // 6 feature grid (prototip'te birebir aynı)
  const features = [
    {
      icon: <Mic className="h-5 w-5" />,
      title: 'Sesli teklif',
      desc: 'Notunuzu söyleyin, AI ürünleri, adetleri ve indirimleri otomatik doldursun.',
    },
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: 'WhatsApp gönderim',
      desc: 'Chat ekranında önizle, tek tıkla müşteriye ulaştır. Onay / revize yanıtı aynı linkten.',
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: 'Teslimat haritası',
      desc: 'Kurye rotası, teslimat durumu ve fotoğraflı teslim alındı belgesi.',
    },
    {
      icon: <Wrench className="h-5 w-5" />,
      title: 'Kurulum takibi',
      desc: 'Teknisyene iş emri, check-in, müşteri imzası ve fotoğraf arşivi.',
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: 'Randevu sistemi',
      desc: 'Müşteri teklif linkinden uygun saati seçer, takviminize düşer.',
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: 'Paraşüt senkron',
      desc: 'Teklif onaylanınca fatura taslağı otomatik hazır, stoktan düşer.',
    },
  ];

  // Sorun → Çözüm → Sonuç (yeni eklenen, kullanıcının istediği)
  const psr = [
    {
      tag: 'Sorun',
      tone: 'rose',
      title: 'Word/Excel\'de teklif',
      desc: 'Saatler süren biçimleme, kayıp dosyalar, müşteri "açtım mı?" diye soruyor.',
    },
    {
      tag: 'Çözüm',
      tone: 'amber',
      title: 'Sesli not → otomatik teklif',
      desc: 'Konuş, AI doldursun. WhatsApp\'tan gönder. Açıldığında anında bildirim al.',
    },
    {
      tag: 'Sonuç',
      tone: 'mint',
      title: '%60 daha hızlı kapanan satış',
      desc: 'Ortalama yanıt süresi 15 dakikaya düşer. Onay oranı 2 katına çıkar.',
    },
  ] as const;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ─────────────── Top Nav ─────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={`/${locale}`} className="flex items-center gap-2.5" aria-label="TeklifPro home">
            <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-mint-500 to-mint-700 shadow-md shadow-mint-500/30">
              <span className="text-[17px] font-bold leading-none tracking-tight text-white">t</span>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-slate-900">TeklifPro</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Özellikler
            </a>
            <a href="#pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Fiyatlandırma
            </a>
            <a href="#customers" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Müşteriler
            </a>
            <a href="#faq" className="text-sm text-slate-600 transition-colors hover:text-slate-900">
              Destek
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={pathname.replace(`/${locale}`, `/${locale === 'tr' ? 'en' : 'tr'}`)}
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4" />
              {locale === 'tr' ? 'EN' : 'TR'}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="hidden h-9 items-center justify-center rounded-xl px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
            >
              {t('nav.login')}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-mint-600 px-4 text-sm font-semibold text-white shadow-md shadow-mint-500/30 transition-all hover:bg-mint-700"
            >
              Ücretsiz dene
            </Link>
          </div>
        </div>
      </nav>

      {/* ─────────────── Hero ─────────────── */}
      <section className="relative overflow-hidden">
        {/* soft mint gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-mint-50/70 via-white to-white" aria-hidden="true" />
        <div
          className="absolute inset-x-0 top-0 -z-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(54,156,112,0.10),transparent_60%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-mint-200 bg-mint-50 px-3 py-1.5 text-[13px] font-medium text-mint-700">
            <Sparkles className="h-3.5 w-3.5" />
            Yeni: Sesli not → tek tıkla teklif
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-[64px]">
            Söyle yeter.
            <br />
            <span className="text-mint-700">Teklif, WhatsApp&apos;ta müşteride</span>
            <span className="text-slate-900"> — 3 adımda.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            TeklifPro; sesli notunuzdan teklifi hazırlar, WhatsApp&apos;tan gönderir, teslimat ve kurulum
            randevularını tek ekrandan takip eder.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-mint-600 px-5 text-[15px] font-semibold text-white shadow-lg shadow-mint-500/30 transition-all hover:bg-mint-700"
            >
              {t('hero.cta')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-mint-300 hover:bg-mint-50"
            >
              <PlayCircle className="h-4 w-4 text-mint-700" />
              Canlı demo izle · 2 dk
            </Link>
            <span className="text-[13px] text-slate-500">Kredi kartı gerekmez.</span>
          </div>

          {/* Hero product still — voice bubble + phone mock */}
          <div className="relative mt-12 sm:mt-16">
            <div className="grid items-center gap-7 rounded-3xl border border-border bg-white p-5 shadow-tp-elevated sm:p-7 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-mint-200 bg-mint-50 px-2.5 py-1 text-xs font-medium text-mint-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint-600" />
                    Canlı
                  </span>
                  <span className="text-xs text-slate-500">Mehmet Usta · Klima montajı</span>
                </div>

                <VoiceBubble text={'"Mehmet Bey\'e 1 adet 18.000 BTU inverter klima, montaj dahil. Yarın saat 14\'te kurulum. Peşin %5 indirim."'} />

                <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
                  <div className="h-px flex-1 bg-slate-200" />
                  <Sparkles className="h-3.5 w-3.5 text-mint-700" />
                  <span>TeklifPro 8 sn&apos;de hazırladı</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="rounded-2xl border border-border bg-mint-50/50 p-4">
                  <div className="mb-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600">TP-2026-0042 · Mehmet Kaya</span>
                    <span className="font-mono text-sm font-semibold text-slate-900">₺ 24.500</span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                    {[
                      ['Inverter klima 18.000 BTU', '1 × 19.900'],
                      ['Standart montaj', '1 × 3.500'],
                      ['Bakır boru (3m)', '1 × 1.100'],
                    ].map(([n, p]) => (
                      <div key={n} className="flex justify-between">
                        <span>{n}</span>
                        <span className="font-mono">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <MiniPhoneChat />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Trust Strip ─────────────── */}
      <section className="border-y border-border/60 bg-white/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 sm:px-6 lg:px-8">
          <span>3.200+ işletme tarafından kullanılıyor</span>
          <span className="hidden sm:inline">•</span>
          <span>Paraşüt · Logo · Mikrogen entegrasyonları</span>
          <span className="hidden sm:inline">•</span>
          <span>KVKK uyumlu</span>
        </div>
      </section>

      {/* ─────────────── Sorun → Çözüm → Sonuç ─────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-mint-700">
              Neden değişmeli?
            </div>
            <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Sorun → Çözüm → Sonuç
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {psr.map((item) => {
              const tones: Record<string, string> = {
                rose: 'border-rose-200 bg-rose-50 text-rose-700',
                amber: 'border-amber-200 bg-amber-50 text-amber-700',
                mint: 'border-mint-200 bg-mint-50 text-mint-700',
              };
              return (
                <div
                  key={item.tag}
                  className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-tp-card transition-shadow hover:shadow-tp-elevated"
                >
                  <span
                    className={cn(
                      'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                      tones[item.tone],
                    )}
                  >
                    {item.tag}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── Features ─────────────── */}
      <section id="features" className="bg-mint-50/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-mint-700">
              Son kullanıcı için tasarlandı
            </div>
            <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[38px]">
              Her iş için en fazla 3-4 tık.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-slate-600">
              {t('featuresSubtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-white p-6 shadow-tp-card transition-all hover:-translate-y-0.5 hover:shadow-tp-elevated"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-mint-50 text-mint-700">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold tracking-tight text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Voice Demo Bar ─────────────── */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-gradient-to-br from-mint-50 via-white to-mint-50 p-6 shadow-tp-card sm:p-10">
            <div className="grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-mint-600 text-white shadow-glow-mint">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-mint-700">
                  Sesli teklif demo
                </div>
                <p className="mt-1 text-[15px] font-medium text-slate-900">
                  Konuş — TeklifPro yazsın. Ortalama 8 saniye.
                </p>
                <div className="mt-3">
                  <Waveform bars={48} height={32} />
                </div>
              </div>
              <Link
                href={`/${locale}/demo`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <AudioLines className="h-4 w-4" />
                Demo&apos;yu dinle
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Pricing ─────────────── */}
      <section id="pricing" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-mint-200 bg-mint-50 px-3 py-1 text-xs font-medium text-mint-700">
              <Shield className="h-3.5 w-3.5" />
              {t('pricingBadge')}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[38px]">
              Basit fiyatlandırma. 14 gün ücretsiz.
            </h2>
            <p className="mt-2 text-[15px] text-slate-600">İstediğin an iptal et. Kullandığın kadar öde.</p>

            <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-border bg-white p-1 shadow-tp-card">
              <button
                type="button"
                onClick={() => setIsMonthly(true)}
                aria-pressed={isMonthly}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  isMonthly ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {t('pricing.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setIsMonthly(false)}
                aria-pressed={!isMonthly}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
                  !isMonthly ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {t('pricing.yearly')}
                <span className="rounded-full bg-mint-100 px-2 py-0.5 text-[11px] font-bold text-mint-700">
                  {t('pricing.yearlyDiscount')}
                </span>
              </button>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3">
            {/* Starter */}
            <div className="relative flex flex-col rounded-3xl border border-border bg-white p-7 shadow-tp-card transition-shadow hover:shadow-tp-elevated">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t('pricing.starter.name')}
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-[40px] font-semibold tracking-tight text-slate-900">
                  ₺{isMonthly ? t('pricing.starter.price') : t('pricing.starter.priceYearly')}
                </span>
                <span className="text-sm text-slate-500">{t('pricing.starter.period')}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{t('pricing.starter.desc')}</p>
              <Link
                href={`/${locale}/register`}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition-colors hover:border-mint-400 hover:bg-mint-50"
              >
                {t('pricing.starter.cta')}
              </Link>
              <div className="my-6 h-px bg-border" />
              <ul className="flex flex-col gap-2.5">
                {starterFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-mint-100">
                      <Check className="h-3 w-3 text-mint-700" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional (featured) */}
            <div className="relative flex flex-col rounded-3xl border-2 border-mint-600 bg-white p-7 shadow-tp-elevated lg:scale-[1.02]">
              <span className="absolute -top-3 left-6 rounded-full bg-mint-700 px-3 py-1 text-[11px] font-semibold text-white">
                {t('pricing.professional.popular')}
              </span>
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mint-700">
                {t('pricing.professional.name')}
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-[40px] font-semibold tracking-tight text-slate-900">
                  ₺{isMonthly ? t('pricing.professional.price') : t('pricing.professional.priceYearly')}
                </span>
                <span className="text-sm text-slate-500">{t('pricing.professional.period')}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{t('pricing.professional.desc')}</p>
              <Link
                href={`/${locale}/register`}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-mint-600 text-sm font-semibold text-white shadow-md shadow-mint-500/30 transition-colors hover:bg-mint-700"
              >
                Ücretsiz başla
              </Link>
              <div className="my-6 h-px bg-border" />
              <ul className="flex flex-col gap-2.5">
                {professionalFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-mint-100">
                      <Check className="h-3 w-3 text-mint-700" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Scale (third tier — inline TR) */}
            <div className="relative flex flex-col rounded-3xl border border-border bg-white p-7 shadow-tp-card transition-shadow hover:shadow-tp-elevated">
              <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">Scale</div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="font-mono text-[40px] font-semibold tracking-tight text-slate-900">
                  ₺{isMonthly ? '1.299' : '1.039'}
                </span>
                <span className="text-sm text-slate-500">/ay</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">Birden fazla şube, özel API ve SLA.</p>
              <Link
                href={`/${locale}/register`}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition-colors hover:border-mint-400 hover:bg-mint-50"
              >
                Planı seç
              </Link>
              <div className="my-6 h-px bg-border" />
              <ul className="flex flex-col gap-2.5">
                {scaleFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-mint-100">
                      <Check className="h-3 w-3 text-mint-700" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Stats / Social proof ─────────────── */}
      <section id="customers" className="bg-mint-50/40 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { icon: <Users className="h-5 w-5" />, value: '500+', label: t('stats.activeFirms') },
              { icon: <FileText className="h-5 w-5" />, value: '25K+', label: t('stats.proposalsSent') },
              { icon: <Star className="h-5 w-5" />, value: '%94', label: t('stats.satisfaction') },
              { icon: <TrendingUp className="h-5 w-5" />, value: '%60', label: t('stats.timeSaved') },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-tp-card"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint-50 text-mint-700">
                  {s.icon}
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold tracking-tight text-slate-900">
                    {s.value}
                  </div>
                  <div className="text-xs text-slate-600">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[
              {
                q: 'Eskiden 40 dakikada teklif yazıyorduk. Şimdi konuşuyorum, müşteriye 1 dakikada gidiyor. Onay oranımız %38 arttı.',
                name: 'Mehmet Kaya',
                role: 'Teknik İklim · Kurucu',
              },
              {
                q: 'Paraşüt + WhatsApp + sesli teklif kombinasyonu işimizi katladı. Ekipte herkes ilk gün kullanmaya başladı.',
                name: 'Aylin Demir',
                role: 'Mavi Zemin A.Ş. · Operasyon',
              },
            ].map((tt, i) => (
              <figure
                key={i}
                className="rounded-3xl border border-border bg-white p-6 shadow-tp-card sm:p-8"
              >
                <Quote className="h-6 w-6 text-mint-400" aria-hidden="true" />
                <blockquote className="mt-3 text-[15px] leading-relaxed text-slate-800">
                  "{tt.q}"
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-mint-100 font-semibold text-mint-700">
                    {tt.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{tt.name}</div>
                    <div className="text-xs text-slate-500">{tt.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section id="faq" className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {t('faq.title')}
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqItems.map((item, index) => {
              const open = expandedFAQ === index;
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-white transition-colors hover:border-mint-300"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFAQ(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[15px] font-semibold text-slate-900">{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300',
                        open && 'rotate-180 text-mint-700',
                      )}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-5">
                      <p className="text-sm leading-relaxed text-slate-600">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────── Final CTA ─────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-mint-600 via-mint-700 to-mint-800" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center text-white sm:px-6 sm:py-24 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-mint-100 sm:text-lg">
            {t('cta.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/${locale}/register`}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-mint-700 shadow-2xl shadow-black/20 transition-all hover:bg-mint-50"
            >
              {t('cta.button')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`/${locale}/demo`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <PlayCircle className="h-4 w-4" />
              Demo izle
            </Link>
          </div>
          <p className="mt-5 inline-flex items-center justify-center gap-1.5 text-sm text-mint-100">
            <Shield className="h-4 w-4" />
            {t('ctaTrialNote')}
          </p>
        </div>
      </section>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="border-t border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href={`/${locale}`} className="inline-flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-mint-500 to-mint-700 shadow-md shadow-mint-500/30">
                  <span className="text-[15px] font-bold leading-none text-white">t</span>
                </div>
                <span className="text-[16px] font-semibold tracking-tight text-slate-900">TeklifPro</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-slate-600">{t('footerDesc')}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-900">
                {t('footer.product')}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="#features" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.features')}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.pricing')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.integrations')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-900">
                {t('footer.company')}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.about')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.blog')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.contact')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-900">
                {t('footer.legal')}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 transition-colors hover:text-slate-900">
                    {t('footer.terms')}
                  </a>
                </li>
                <li>
                  <Link
                    href={`/${locale}/kvkk`}
                    className="text-slate-600 transition-colors hover:text-slate-900"
                  >
                    {t('footer.kvkk')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
            <span>{t('footer.copyright')}</span>
            <span className="font-mono inline-flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              v 2.4 · status: operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
