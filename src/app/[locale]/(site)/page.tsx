'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ChevronDown,
  Zap,
  MessageCircle,
  Eye,
  Clock,
  CheckCircle,
  BarChart3,
  ArrowRight,
  Check,
  Shield,
  Sparkles,
  FileText,
  Users,
  TrendingUp,
  Package,
  Star,
  Globe,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/utils/cn';

// Animated counter component
function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, value, { duration: 2, ease: 'easeOut' });
      return controls.stop;
    }
  }, [isInView, motionVal, value]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v.toLocaleString('tr-TR')}${suffix}`;
    });
    return unsubscribe;
  }, [rounded, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

const LandingPage = () => {
  const t = useTranslations('site');
  const pathname = usePathname();
  const locale = useLocale();
  const [isMonthly, setIsMonthly] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] } },
  };

  const heroTitleVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1] } },
  };

  const gradientTextVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1], delay: 0.4 } },
  };

  const features = [
    { icon: <Zap className="w-6 h-6" />, title: t('features.parasut.title'), desc: t('features.parasut.desc'), gradient: 'from-amber-500 to-orange-600' },
    { icon: <MessageCircle className="w-6 h-6" />, title: t('features.whatsapp.title'), desc: t('features.whatsapp.desc'), gradient: 'from-green-500 to-emerald-600' },
    { icon: <Eye className="w-6 h-6" />, title: t('features.tracking.title'), desc: t('features.tracking.desc'), gradient: 'from-blue-500 to-indigo-600' },
    { icon: <Clock className="w-6 h-6" />, title: t('features.fast.title'), desc: t('features.fast.desc'), gradient: 'from-violet-500 to-purple-600' },
    { icon: <CheckCircle className="w-6 h-6" />, title: t('features.response.title'), desc: t('features.response.desc'), gradient: 'from-pink-500 to-rose-600' },
    { icon: <BarChart3 className="w-6 h-6" />, title: t('features.analytics.title'), desc: t('features.analytics.desc'), gradient: 'from-cyan-500 to-teal-600' },
  ];

  const steps = [
    { number: 1, title: t('steps.1.title'), desc: t('steps.1.desc'), icon: <FileText className="w-6 h-6" />, color: 'from-blue-500 to-indigo-600' },
    { number: 2, title: t('steps.2.title'), desc: t('steps.2.desc'), icon: <Zap className="w-6 h-6" />, color: 'from-amber-500 to-orange-600' },
    { number: 3, title: t('steps.3.title'), desc: t('steps.3.desc'), icon: <Package className="w-6 h-6" />, color: 'from-emerald-500 to-teal-600' },
    { number: 4, title: t('steps.4.title'), desc: t('steps.4.desc'), icon: <MessageCircle className="w-6 h-6" />, color: 'from-green-500 to-green-600' },
  ];

  const stats = [
    { numValue: 500, suffix: '+', prefix: '', label: t('stats.activeFirms'), icon: <Users className="w-5 h-5" /> },
    { numValue: 25, suffix: 'K+', prefix: '', label: t('stats.proposalsSent'), icon: <FileText className="w-5 h-5" /> },
    { numValue: 94, suffix: '', prefix: '%', label: t('stats.satisfaction'), icon: <Star className="w-5 h-5" /> },
    { numValue: 60, suffix: '', prefix: '%', label: t('stats.timeSaved'), icon: <TrendingUp className="w-5 h-5" /> },
  ];

  const faqItems = t.raw('faq.items') as Array<{ q: string; a: string }>;
  const starterFeatures = t.raw('pricing.starter.features') as string[];
  const professionalFeatures = t.raw('pricing.professional.features') as string[];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              TeklifPro
            </span>
          </Link>
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
              {t('features.title')}
            </a>
            <a href="#pricing" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
              {t('pricing.title')}
            </a>
            <a href="#faq" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors">
              {t('faq.title')}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={pathname.replace(`/${locale}`, `/${locale === 'tr' ? 'en' : 'tr'}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {locale === 'tr' ? 'EN' : 'TR'}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center justify-center px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 dark:from-gray-950 dark:via-blue-950/30 dark:to-indigo-950/20" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Floating orbs with smooth movement */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-40 right-10 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -25, 20, 0], y: [0, 20, -30, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 left-1/3 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-15"
          animate={{ x: [0, 20, -15, 0], y: [0, -20, 25, 0], scale: [1, 1.05, 0.9, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-36">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              {t('heroBadge')}
            </motion.div>

            <motion.h1
              variants={heroTitleVariants}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              <span className="text-gray-900 dark:text-white">{t('heroTitle1')} </span>
              <motion.span
                variants={gradientTextVariants}
                className="inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent bg-[size:200%_100%] animate-[shimmer_3s_ease-in-out_infinite]"
              >
                {t('heroTitle2')}
              </motion.span>
              <br />
              <span className="text-gray-900 dark:text-white">{t('heroTitle3')}</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                href={`/${locale}/register`}
                className="group inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
              >
                {t('hero.cta')}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={`/${locale}/demo`}
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:-translate-y-0.5"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 + i * 0.15, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-gray-900 shadow-md mb-2 text-blue-600 dark:text-blue-400">
                    {stat.icon}
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                    <AnimatedCounter value={stat.numValue} suffix={stat.suffix} prefix={stat.prefix} />
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 sm:py-32 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              {t('featuresBadge')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('featuresSubtitle')}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              >
                {/* Hover gradient border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30" />
                <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform', feature.gradient)}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('howItWorks')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('howItWorksSubtitle')}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            variants={containerVariants}
            viewport={{ once: true }}
          >
            {steps.map((step, index) => (
              <motion.div key={index} variants={itemVariants} className="relative text-center">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-blue-300 to-transparent dark:from-blue-700" />
                )}
                <div className={cn(
                  'relative w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mx-auto mb-5 shadow-xl',
                  step.color
                )}>
                  {step.icon}
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="py-20 sm:py-32 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              {t('pricingBadge')}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              {t('pricing.subtitle')}
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <button
                onClick={() => setIsMonthly(true)}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-semibold transition-all',
                  isMonthly ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {t('pricing.monthly')}
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                  !isMonthly ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {t('pricing.yearly')}
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                  {t('pricing.yearlyDiscount')}
                </span>
              </button>
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Starter */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-xl"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('pricing.starter.name')}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{t('pricing.starter.desc')}</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                  {isMonthly ? t('pricing.starter.price') : t('pricing.starter.priceYearly')}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">{t('pricing.starter.period')}</span>
              </div>
              <Link
                href={`/${locale}/register`}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all mb-8"
              >
                {t('pricing.starter.cta')}
              </Link>
              <ul className="space-y-3.5">
                {starterFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Professional */}
            <motion.div
              variants={itemVariants}
              className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/30 md:scale-105"
            >
              <div className="absolute top-6 right-6 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">
                {t('pricing.professional.popular')}
              </div>
              <h3 className="text-2xl font-bold mb-1">{t('pricing.professional.name')}</h3>
              <p className="text-blue-200 text-sm mb-6">{t('pricing.professional.desc')}</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold">
                  {isMonthly ? t('pricing.professional.price') : t('pricing.professional.priceYearly')}
                </span>
                <span className="text-blue-200 ml-2">{t('pricing.professional.period')}</span>
              </div>
              <Link
                href={`/${locale}/register`}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-all shadow-lg mb-8"
              >
                {t('pricing.professional.cta')}
              </Link>
              <ul className="space-y-3.5">
                {professionalFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-blue-50 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section id="faq" className="py-20 sm:py-32 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              {t('faq.title')}
            </h2>
          </motion.div>

          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between"
                >
                  <span className="text-left font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-400 transition-transform duration-300 shrink-0 ml-4',
                      expandedFAQ === index && 'rotate-180 text-blue-500'
                    )}
                  />
                </button>
                {expandedFAQ === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-5"
                  >
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Floating circles */}
        <div className="absolute top-10 left-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full" />

        <motion.div
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('cta.subtitle')}
          </p>
          <Link
            href={`/${locale}/register`}
            className="group inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all shadow-2xl shadow-black/20 hover:shadow-black/30 hover:-translate-y-0.5 text-lg"
          >
            {t('cta.button')}
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-sm text-blue-200 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            {t('ctaTrialNote')}
          </p>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 text-gray-400 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">TeklifPro</span>
              </div>
              <p className="text-sm text-gray-500">
                {t('footerDesc')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t('footer.product')}</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">{t('footer.features')}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t('footer.pricing')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.integrations')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t('footer.company')}</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.blog')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t('footer.legal')}</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.terms')}</a></li>
                <li><Link href={`/${locale}/kvkk`} className="hover:text-white transition-colors">{t('footer.kvkk')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm text-gray-500">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
