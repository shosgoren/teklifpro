'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const LandingPage = () => {
  const t = useTranslations('site');
  const [isMonthly, setIsMonthly] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('features.parasut.title'),
      desc: t('features.parasut.desc'),
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: t('features.whatsapp.title'),
      desc: t('features.whatsapp.desc'),
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: t('features.tracking.title'),
      desc: t('features.tracking.desc'),
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: t('features.fast.title'),
      desc: t('features.fast.desc'),
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: t('features.response.title'),
      desc: t('features.response.desc'),
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: t('features.analytics.title'),
      desc: t('features.analytics.desc'),
    },
  ];

  const steps = [
    { number: 1, title: 'Kayıt ol', icon: '📝' },
    { number: 2, title: 'Paraşüt bağla', icon: '🔗' },
    { number: 3, title: 'Teklif oluştur', icon: '📄' },
    { number: 4, title: "WhatsApp'tan gönder", icon: '📱' },
  ];

  const faqItems = t('faq.items') as Array<{ q: string; a: string }>;

  const starterFeatures = t('pricing.starter.features') as string[];
  const professionalFeatures = t('pricing.professional.features') as string[];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            {t('common.appName')}
          </Link>
          <div className="hidden md:flex gap-8">
            <a href="#features" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
              {t('features.title')}
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
              {t('pricing.title')}
            </a>
            <a href="#faq" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
              {t('faq.title')}
            </a>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            {t('auth.login.title')}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 sm:pt-32 sm:pb-40">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            {t('hero.title')}
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            {t('hero.subtitle')}
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              {t('hero.cta')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <button className="inline-flex items-center justify-center px-8 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-colors">
              {t('hero.ctaSecondary')}
            </button>
          </motion.div>

          <motion.p variants={itemVariants} className="text-sm text-gray-500">
            {t('hero.trustedBy')}
          </motion.p>
        </motion.div>

      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('features.title')}
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Nasıl Çalışır?
            </h2>
            <p className="text-lg text-gray-600">
              4 basit adımda başlayın
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            variants={containerVariants}
            viewport={{ once: true }}
          >
            {steps.map((step, index) => (
              <motion.div key={index} variants={itemVariants} className="relative">
                <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  {step.number}. {step.title}
                </h3>
                <p className="text-center text-gray-600 text-sm">
                  {step.number === 1 && 'E-posta ve şirket bilgilerinizi girin'}
                  {step.number === 2 && 'Paraşüt hesabınızı bağlayın'}
                  {step.number === 3 && 'Müşteri ve ürün seçerek teklif oluşturun'}
                  {step.number === 4 && 'Tek tuşla WhatsApp\'tan gönderin'}
                </p>

                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-8 left-full w-full items-center justify-center -ml-4">
                    <ArrowRight className="w-6 h-6 text-blue-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              {t('pricing.subtitle')}
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={cn('text-sm font-medium', isMonthly ? 'text-gray-900' : 'text-gray-600')}>
                {t('pricing.monthly')}
              </span>
              <button
                onClick={() => setIsMonthly(!isMonthly)}
                className={cn(
                  'relative inline-flex h-8 w-14 items-center rounded-full transition-colors',
                  isMonthly ? 'bg-gray-300' : 'bg-blue-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-6 w-6 transform rounded-full bg-white transition-transform',
                    isMonthly ? 'translate-x-1' : 'translate-x-7'
                  )}
                />
              </button>
              <span className={cn('text-sm font-medium', !isMonthly ? 'text-gray-900' : 'text-gray-600')}>
                {t('pricing.yearly')}
              </span>
              {!isMonthly && (
                <span className="ml-2 inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {t('pricing.yearlyDiscount')}
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Starter Plan */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('pricing.starter.name')}
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                {t('pricing.starter.desc')}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {isMonthly ? t('pricing.starter.price') : t('pricing.starter.priceYearly')}
                </span>
                <span className="text-gray-600 ml-2">
                  {t('pricing.starter.period')}
                </span>
              </div>

              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-colors mb-8"
              >
                {t('pricing.starter.cta')}
              </Link>

              <ul className="space-y-4">
                {starterFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Professional Plan */}
            <motion.div
              variants={itemVariants}
              className="bg-blue-600 rounded-2xl p-8 text-white shadow-2xl border border-blue-700 relative lg:scale-105"
            >
              <div className="absolute top-6 right-6 bg-amber-400 text-blue-900 text-xs font-bold px-4 py-1 rounded-full">
                {t('pricing.professional.popular')}
              </div>

              <h3 className="text-2xl font-bold mb-2">
                {t('pricing.professional.name')}
              </h3>
              <p className="text-blue-100 text-sm mb-6">
                {t('pricing.professional.desc')}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {isMonthly ? t('pricing.professional.price') : t('pricing.professional.priceYearly')}
                </span>
                <span className="text-blue-100 ml-2">
                  {t('pricing.professional.period')}
                </span>
              </div>

              <Link
                href="/register"
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors mb-8"
              >
                {t('pricing.professional.cta')}
              </Link>

              <ul className="space-y-4">
                {professionalFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-blue-50">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 sm:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('faq.title')}
            </h2>
          </motion.div>

          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <span className="text-left font-semibold text-gray-900">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-600 transition-transform duration-300',
                      expandedFAQ === index && 'rotate-180'
                    )}
                  />
                </button>

                {expandedFAQ === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 py-4 bg-white border-t border-gray-200"
                  >
                    <p className="text-gray-700 leading-relaxed">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-r from-blue-600 to-blue-800">
        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl text-lg"
          >
            {t('cta.button')}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('footer.product')}
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="#features" className="hover:text-white transition-colors">
                    {t('footer.features')}
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-white transition-colors">
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.integrations')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('footer.company')}
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.about')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.blog')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.contact')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('footer.legal')}
              </h3>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.terms')}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {t('footer.kvkk')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('common.appName')}
              </h3>
              <p className="text-sm text-gray-400">
                Paraşüt entegrasyonlu teklif yönetim platformu
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm text-gray-400">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
