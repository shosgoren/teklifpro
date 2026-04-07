'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
  FileText,
  Send,
  BarChart3,
  CheckCircle,
  MessageCircle,
  Zap,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Bell,
  Home,
} from 'lucide-react';

// Demo steps data - translation keys resolved in component
const DEMO_STEPS_CONFIG = [
  {
    id: 'dashboard',
    titleKey: 'stepDashboardTitle',
    subtitleKey: 'stepDashboardSubtitle',
    descriptionKey: 'stepDashboardDescription',
    color: 'from-blue-500 to-indigo-600',
    icon: Home,
  },
  {
    id: 'products',
    titleKey: 'stepProductsTitle',
    subtitleKey: 'stepProductsSubtitle',
    descriptionKey: 'stepProductsDescription',
    color: 'from-emerald-500 to-teal-600',
    icon: Package,
  },
  {
    id: 'customers',
    titleKey: 'stepCustomersTitle',
    subtitleKey: 'stepCustomersSubtitle',
    descriptionKey: 'stepCustomersDescription',
    color: 'from-violet-500 to-purple-600',
    icon: Users,
  },
  {
    id: 'create-proposal',
    titleKey: 'stepCreateProposalTitle',
    subtitleKey: 'stepCreateProposalSubtitle',
    descriptionKey: 'stepCreateProposalDescription',
    color: 'from-amber-500 to-orange-600',
    icon: FileText,
  },
  {
    id: 'send-whatsapp',
    titleKey: 'stepWhatsappTitle',
    subtitleKey: 'stepWhatsappSubtitle',
    descriptionKey: 'stepWhatsappDescription',
    color: 'from-green-500 to-emerald-600',
    icon: MessageCircle,
  },
  {
    id: 'analytics',
    titleKey: 'stepAnalyticsTitle',
    subtitleKey: 'stepAnalyticsSubtitle',
    descriptionKey: 'stepAnalyticsDescription',
    color: 'from-pink-500 to-rose-600',
    icon: BarChart3,
  },
];

// Phone mockup screen content for each step
function PhoneScreen({ stepId, isActive }: { stepId: string; isActive: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={stepId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 flex flex-col"
        >
          {stepId === 'dashboard' && <DashboardScreen />}
          {stepId === 'products' && <ProductsScreen />}
          {stepId === 'customers' && <CustomersScreen />}
          {stepId === 'create-proposal' && <CreateProposalScreen />}
          {stepId === 'send-whatsapp' && <WhatsAppScreen />}
          {stepId === 'analytics' && <AnalyticsScreen />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DashboardScreen() {
  const t = useTranslations('demoPage');
  return (
    <div className="flex flex-col h-full bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-gray-500">{t('welcomeLabel')}</p>
          <p className="text-xs font-bold text-gray-900">Sercan H.</p>
        </div>
        <Bell className="w-4 h-4 text-gray-400" />
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: t('revenue'), value: '₺284K', color: 'from-blue-500 to-indigo-500', icon: TrendingUp },
          { label: t('proposals'), value: '47', color: 'from-violet-500 to-purple-500', icon: FileText },
          { label: t('acceptance'), value: '%72', color: 'from-emerald-500 to-teal-500', icon: CheckCircle },
          { label: t('customerLabel'), value: '128', color: 'from-amber-500 to-orange-500', icon: Users },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className={`bg-gradient-to-br ${kpi.color} rounded-xl p-2.5 text-white`}
          >
            <kpi.icon className="w-3.5 h-3.5 mb-1 opacity-80" />
            <p className="text-sm font-extrabold">{kpi.value}</p>
            <p className="text-[9px] opacity-80">{kpi.label}</p>
          </motion.div>
        ))}
      </div>
      {/* Mini chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl p-3 flex-1"
      >
        <p className="text-[10px] font-semibold text-gray-700 mb-2">{t('monthlyRevenue')}</p>
        <div className="flex items-end gap-1.5 h-16">
          {[40, 55, 35, 70, 60, 85, 75, 90, 65, 80, 95, 88].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
              className="flex-1 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-sm"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function ProductsScreen() {
  const t = useTranslations('demoPage');
  const products = [
    { name: 'Paslanmaz Çelik Boru', code: 'PCB-001', price: '₺245', stock: 128, color: 'bg-blue-500' },
    { name: 'Alüminyum Profil', code: 'ALP-003', price: '₺180', stock: 64, color: 'bg-emerald-500' },
    { name: 'Bakır Levha', code: 'BKL-012', price: '₺520', stock: 15, color: 'bg-amber-500' },
    { name: 'Galvaniz Sac', code: 'GLS-007', price: '₺310', stock: 89, color: 'bg-violet-500' },
  ];
  return (
    <div className="flex flex-col h-full bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-900">{t('productsLabel')}</p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="w-6 h-6 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
        </motion.div>
      </div>
      <div className="bg-white rounded-xl px-2.5 py-2 mb-3 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[10px] text-gray-400">{t('searchProduct')}</p>
      </div>
      <div className="space-y-2 flex-1">
        {products.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-white rounded-xl p-2.5 flex items-center gap-2.5"
          >
            <div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center text-white text-[9px] font-bold`}>
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-900 truncate">{p.name}</p>
              <p className="text-[9px] text-gray-400">{p.code}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-900">{p.price}</p>
              <p className="text-[9px] text-gray-400">{t('stock', { count: p.stock })}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CustomersScreen() {
  const t = useTranslations('demoPage');
  const customers = [
    { name: 'Yılmaz Mühendislik', contact: 'Ahmet Yılmaz', balance: '+₺45.200', synced: true },
    { name: 'Demir İnşaat', contact: 'Mehmet Demir', balance: '-₺12.800', synced: true },
    { name: 'Atlas Ticaret', contact: 'Ayşe Kaya', balance: '+₺8.500', synced: false },
    { name: 'Baran Makine', contact: 'Ali Baran', balance: '+₺23.100', synced: true },
  ];
  return (
    <div className="flex flex-col h-full bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-900">{t('customersLabel')}</p>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100">
          <Zap className="w-2.5 h-2.5 text-emerald-600" />
          <p className="text-[8px] font-semibold text-emerald-700">{t('parasutConnected')}</p>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {customers.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-white rounded-xl p-2.5 flex items-center gap-2.5"
          >
            <div className={`w-8 h-8 rounded-full ${c.synced ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gray-300'} flex items-center justify-center text-white text-[10px] font-bold`}>
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-900 truncate">{c.name}</p>
              <p className="text-[9px] text-gray-400">{c.contact}</p>
            </div>
            <p className={`text-[10px] font-bold ${c.balance.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
              {c.balance}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CreateProposalScreen() {
  const t = useTranslations('demoPage');
  return (
    <div className="flex flex-col h-full bg-gray-50 p-3">
      <p className="text-xs font-bold text-gray-900 mb-3">{t('newProposal')}</p>
      {/* Customer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-2.5 mb-2"
      >
        <p className="text-[9px] text-gray-400 mb-1">{t('customerField')}</p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[8px] font-bold">Y</div>
          <p className="text-[10px] font-semibold text-gray-900">Yılmaz Mühendislik</p>
        </div>
      </motion.div>
      {/* Items */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-2.5 mb-2 flex-1"
      >
        <p className="text-[9px] text-gray-400 mb-2">{t('items')}</p>
        {[
          { name: 'Paslanmaz Çelik Boru', qty: 50, price: '₺12.250' },
          { name: 'Alüminyum Profil', qty: 100, price: '₺18.000' },
          { name: 'Bakır Levha', qty: 25, price: '₺13.000' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
          >
            <div>
              <p className="text-[10px] font-medium text-gray-900">{item.name}</p>
              <p className="text-[8px] text-gray-400">{t('unitAdet', { count: item.qty })}</p>
            </div>
            <p className="text-[10px] font-bold text-gray-900">{item.price}</p>
          </motion.div>
        ))}
      </motion.div>
      {/* Total */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-3 text-white text-center"
      >
        <p className="text-[9px] opacity-80">{t('totalWithVat')}</p>
        <p className="text-sm font-extrabold">₺51.035,00</p>
      </motion.div>
    </div>
  );
}

function WhatsAppScreen() {
  const t = useTranslations('demoPage');
  return (
    <div className="flex flex-col h-full bg-[#ece5dd]">
      {/* WhatsApp header */}
      <div className="bg-[#075e54] px-3 py-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[9px] font-bold">Y</div>
        <div>
          <p className="text-[10px] font-semibold text-white">Yılmaz Mühendislik</p>
          <p className="text-[8px] text-green-200">{t('online')}</p>
        </div>
      </div>
      <div className="flex-1 p-3 flex flex-col justify-end gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="self-end bg-[#dcf8c6] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm"
        >
          <p className="text-[10px] text-gray-800 font-medium mb-1">📋 {t('proposalMessage')}</p>
          <p className="text-[9px] text-gray-600">{t('proposalFor')}</p>
          <div className="mt-1.5 p-2 bg-white/60 rounded-lg">
            <p className="text-[9px] text-gray-700">{t('proposalSummary')}</p>
            <p className="text-[9px] text-gray-500">{t('validity')}</p>
          </div>
          <p className="text-[8px] text-gray-400 text-right mt-1">21:42 ✓✓</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="self-end bg-[#dcf8c6] rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] shadow-sm"
        >
          <p className="text-[9px] text-blue-600 font-medium">🔗 {t('viewAndApprove')}</p>
          <p className="text-[8px] text-gray-400 text-right mt-1">21:42 ✓✓</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="self-start bg-white rounded-xl rounded-tl-sm px-3 py-2 max-w-[75%] shadow-sm"
        >
          <p className="text-[10px] text-gray-800">{t('reviewedApproved')}</p>
          <p className="text-[8px] text-gray-400 text-right mt-1">21:45</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, type: 'spring' }}
          className="self-center"
        >
          <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[9px] font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('proposalApproved')}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AnalyticsScreen() {
  const t = useTranslations('demoPage');
  return (
    <div className="flex flex-col h-full bg-gray-50 p-3">
      <p className="text-xs font-bold text-gray-900 mb-3">{t('analyticsLabel')}</p>
      {/* Revenue chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-3 mb-2"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-700">{t('revenueTrend')}</p>
          <p className="text-[10px] font-bold text-emerald-600">+24%↑</p>
        </div>
        <div className="flex items-end gap-1 h-12">
          {[30, 45, 35, 55, 48, 65, 58, 75, 68, 82, 78, 92].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
              className={`flex-1 rounded-sm ${i >= 10 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-gradient-to-t from-blue-500 to-indigo-400'}`}
            />
          ))}
        </div>
      </motion.div>
      {/* Top products */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl p-3 mb-2"
      >
        <p className="text-[10px] font-semibold text-gray-700 mb-2">{t('bestSelling')}</p>
        {[
          { name: 'Çelik Boru', pct: 85, color: 'bg-blue-500' },
          { name: 'Alüminyum Profil', pct: 65, color: 'bg-violet-500' },
          { name: 'Bakır Levha', pct: 45, color: 'bg-amber-500' },
        ].map((p, i) => (
          <div key={i} className="mb-1.5 last:mb-0">
            <div className="flex justify-between mb-0.5">
              <p className="text-[9px] text-gray-600">{p.name}</p>
              <p className="text-[9px] font-bold text-gray-900">{p.pct}%</p>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.pct}%` }}
                transition={{ delay: 0.8 + i * 0.15, duration: 0.5 }}
                className={`h-full ${p.color} rounded-full`}
              />
            </div>
          </div>
        ))}
      </motion.div>
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="grid grid-cols-2 gap-2 flex-1"
      >
        <div className="bg-white rounded-xl p-2.5 flex flex-col items-center justify-center">
          <Clock className="w-4 h-4 text-blue-500 mb-1" />
          <p className="text-sm font-extrabold text-gray-900">2.4dk</p>
          <p className="text-[8px] text-gray-400">{t('avgProposalTime')}</p>
        </div>
        <div className="bg-white rounded-xl p-2.5 flex flex-col items-center justify-center">
          <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
          <p className="text-sm font-extrabold text-gray-900">%72</p>
          <p className="text-[8px] text-gray-400">{t('conversionRate')}</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function DemoPage() {
  const locale = useLocale();
  const t = useTranslations('demoPage');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);

  const DEMO_STEPS = useMemo(() => DEMO_STEPS_CONFIG.map(s => ({
    ...s,
    title: t(s.titleKey),
    subtitle: t(s.subtitleKey),
    description: t(s.descriptionKey),
  })), [t]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setAnimationKey((k) => k + 1);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      goToStep((currentStep + 1) % DEMO_STEPS.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying, goToStep]);

  const step = DEMO_STEPS[currentStep];

  return (
    <div className="min-h-dvh bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TeklifPro
            </span>
          </Link>
          <Link
            href={`/${locale}/register`}
            className="inline-flex items-center px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
          >
            {t('startFree')}
            <ArrowRight className="ml-1.5 w-4 h-4" />
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-10 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
            <Play className="w-4 h-4" />
            {t('interactiveDemo')}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-3">
            {t('heroTitle')}{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('heroTitleHighlight')}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            {t('heroDescription')}
          </p>
        </motion.div>

        {/* Main demo area */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Phone mockup */}
          <div className="relative flex-shrink-0 order-1 lg:order-2">
            {/* Glow effect behind phone */}
            <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-[3rem] blur-3xl opacity-20 scale-110`} />

            {/* Phone frame */}
            <div className="relative w-[260px] sm:w-[280px] h-[520px] sm:h-[560px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-20" />
              {/* Screen */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-white relative">
                {/* Status bar */}
                <div className="absolute top-0 left-0 right-0 h-7 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-between px-6 pt-1">
                  <span className="text-[9px] font-semibold text-gray-900">00:58</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-2 border border-gray-900 rounded-sm relative">
                      <div className="absolute inset-0.5 bg-gray-900 rounded-[1px]" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
                <div className="pt-7 h-full">
                  <PhoneScreen key={animationKey} stepId={step.id} isActive={true} />
                </div>
              </div>
            </div>
          </div>

          {/* Step info & controls */}
          <div className="flex-1 order-2 lg:order-1 max-w-lg">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              {DEMO_STEPS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className="relative flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 cursor-pointer"
                >
                  {i === currentStep && (
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${s.color} rounded-full`}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: isPlaying ? 5 : 0.3 }}
                    />
                  )}
                  {i < currentStep && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${s.color} rounded-full opacity-60`} />
                  )}
                </button>
              ))}
            </div>

            {/* Play/Pause + step count */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4 text-gray-600 dark:text-gray-300" /> : <Play className="w-4 h-4 text-gray-600 dark:text-gray-300" />}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToStep((currentStep - 1 + DEMO_STEPS.length) % DEMO_STEPS.length)}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tabular-nums min-w-[3rem] text-center">
                  {currentStep + 1} / {DEMO_STEPS.length}
                </span>
                <button
                  onClick={() => goToStep((currentStep + 1) % DEMO_STEPS.length)}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${step.color} text-white text-xs font-semibold mb-4`}>
                  <step.icon className="w-3.5 h-3.5" />
                  {t('step', { number: currentStep + 1 })}
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h2>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-3">
                  {step.subtitle}
                </p>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/${locale}/register`}
                className="group inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5"
              >
                {t('tryFree14')}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href={`/${locale}#pricing`}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              >
                {t('seePricing')}
              </Link>
            </div>
          </div>
        </div>

        {/* Feature grid below */}
        <motion.div
          className="mt-16 sm:mt-24 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          {DEMO_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`p-4 rounded-2xl border-2 transition-all text-center ${
                i === currentStep
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mx-auto mb-2`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className={`text-xs font-semibold ${i === currentStep ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {s.title}
              </p>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
