'use client';

import { useCallback, useState, useEffect, useMemo, memo } from 'react';
import useSWR from 'swr';
import { swrDefaultOptions } from '@/shared/utils/swrConfig';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Logger } from '@/infrastructure/logger';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  FileText,
  Users,
  TrendingUp,
  Plus,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Package,
  Wallet,
  GripVertical,
  Copy,
  Bell,
  Sparkles,
  X,
  Mic,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/utils/cn';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCountUp } from '@/shared/hooks/useCountUp';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { VoiceProposalModal } from '@/presentation/components/organisms/VoiceProposalModal';

interface DashboardProposal {
  id: string;
  title?: string;
  proposalNumber: string;
  status: string;
  grandTotal: number | string;
  createdAt: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minLevel: number;
}

const logger = new Logger('DashboardPage');

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data.success) throw new Error(data.error || 'API error');
      return data;
    });

const statusConfig: Record<string, { color: string; dot: string }> = {
  DRAFT: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  SENT: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', dot: 'bg-blue-500' },
  VIEWED: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', dot: 'bg-amber-500' },
  ACCEPTED: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', dot: 'bg-emerald-500' },
  REJECTED: { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500' },
  REVISION_REQUESTED: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', dot: 'bg-orange-500' },
  EXPIRED: { color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
};

const WIDGET_ORDER_KEY = 'teklifpro-dashboard-order';
const DEFAULT_WIDGETS = ['alerts', 'chart', 'recent'];

// ─── Animated Number ───
const AnimatedNumber = memo(function AnimatedNumber({ value, prefix = '', suffix = '', dateLocale = 'tr-TR' }: { value: number; prefix?: string; suffix?: string; dateLocale?: string }) {
  const animated = useCountUp(value, 1400);
  return <>{prefix}{animated.toLocaleString(dateLocale)}{suffix}</>;
});

// ─── Animated Currency ───
const AnimatedCurrency = memo(function AnimatedCurrency({ value }: { value: number }) {
  const animated = useCountUp(value, 1600);
  const { formatCurrency } = useCurrency();
  return <>{formatCurrency(animated)}</>;
});

// ─── Sortable Widget Wrapper ───
const SortableWidget = memo(function SortableWidget({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group/widget',
        isDragging && 'z-50 opacity-80 scale-[1.02]'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm opacity-0 group-hover/widget:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shadow-sm border border-slate-200/50 dark:border-slate-700/50"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {children}
    </div>
  );
});

// ─── FAB (Floating Action Button) ───
function FloatingActionButton({ locale, lastProposalId }: { locale: string; lastProposalId?: string }) {
  const [open, setOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('dashboardPage');

  const handleClone = async () => {
    if (!lastProposalId || cloning) return;
    setCloning(true);
    try {
      const res = await fetch(`/api/v1/proposals/${lastProposalId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.data?.id) {
        toast.success(t('cloneSuccess'));
        router.push(`/${locale}/proposals/${data.data.id}`);
      } else {
        logger.error('Clone failed', { status: res.status, data });
        toast.error(data.error?.message || data.error || t('cloneError'));
      }
    } catch (err) {
      logger.error('Clone error', err);
      toast.error(t('cloneError'));
    } finally {
      setCloning(false);
    }
  };

  const actions = useMemo(() => [
    {
      icon: Mic,
      label: t('voiceProposal'),
      color: 'from-emerald-500 to-green-600',
      onClick: () => setVoiceModalOpen(true),
    },
    {
      icon: Plus,
      label: t('newProposal'),
      color: 'from-blue-500 to-indigo-600',
      onClick: () => router.push(`/${locale}/proposals/new`),
    },
    ...(lastProposalId
      ? [{
          icon: Copy,
          label: cloning ? '...' : t('copyLastProposal'),
          color: 'from-violet-500 to-purple-600',
          onClick: handleClone,
        }]
      : []),
    {
      icon: Bell,
      label: t('todayFollowups'),
      color: 'from-amber-500 to-orange-600',
      onClick: () => router.push(`/${locale}/proposals?filter=followup`),
    },
  ], [t, router, locale, lastProposalId, cloning, handleClone]);

  return (
    <div className="fixed bottom-24 md:bottom-8 right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 items-end mb-2"
          >
            {actions.map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { action.onClick(); setOpen(false); }}
                className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform whitespace-nowrap"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
                <div className={cn('p-2 rounded-full bg-gradient-to-r text-white', action.color)}>
                  <action.icon className="h-4 w-4" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {!open && (
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-25 pointer-events-none" />
        )}
        <motion.button
          onClick={() => setOpen(!open)}
          aria-label={open ? t('closeQuickActions') : t('quickActions')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
            'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
            'dark:shadow-blue-500/30 dark:shadow-xl',
            open && 'rotate-45'
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </motion.button>
      </div>

      <VoiceProposalModal isOpen={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} locale={locale} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const t = useTranslations('dashboardPage');
  const tStatus = useTranslations('proposals');
  const [isSyncing, setIsSyncing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_WIDGETS);
  const [mounted, setMounted] = useState(false);

  const { data: proposalsData, isLoading: proposalsLoading } = useSWR('/api/v1/proposals?limit=10', fetcher, swrDefaultOptions);
  const { data: customersData, isLoading: customersLoading } = useSWR('/api/v1/customers?limit=1', fetcher, swrDefaultOptions);
  const { data: alertsData } = useSWR('/api/v1/stock/alerts', fetcher, swrDefaultOptions);

  const proposals = proposalsData?.data?.proposals ?? [];
  const proposalTotal = proposalsData?.data?.pagination?.total ?? 0;
  const customerTotal = customersData?.data?.pagination?.total ?? 0;
  const alerts = alertsData?.data?.alerts ?? alertsData?.data ?? [];

  const isLoading = proposalsLoading || customersLoading;

  const acceptedCount = proposals.filter((p: DashboardProposal) => p.status === 'ACCEPTED').length;
  const acceptRate = proposals.length > 0 ? Math.round((acceptedCount / proposals.length) * 100) : 0;
  const totalRevenue = proposals
    .filter((p: DashboardProposal) => p.status === 'ACCEPTED')
    .reduce((sum: number, p: DashboardProposal) => sum + (Number(p.grandTotal) || 0), 0);
  const pendingCount = proposals.filter((p: DashboardProposal) => ['SENT', 'VIEWED'].includes(p.status)).length;
  const revisionCount = proposals.filter((p: DashboardProposal) => p.status === 'REVISION_REQUESTED').length;
  const lastProposalId = proposals[0]?.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load widget order from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const stored = localStorage.getItem(WIDGET_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGETS.length) {
          setWidgetOrder(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [mounted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  const handleSyncParasut = useCallback(async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['customers', 'products'] }),
      });
    } catch {
      // silently handle
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const { formatCurrency: formatCurrencyFn } = useCurrency();
  const formatAmount = (amount: number) => formatCurrencyFn(amount);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return date.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  };

  const chartData = proposals
    .map((p: DashboardProposal) => ({
      date: new Date(p.createdAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }),
      total: Number(p.grandTotal) || 0,
    }))
    .reverse();

  // ─── Neon glow class helper ───
  const neonGlow = (color: string) =>
    `dark:shadow-[0_0_30px_-5px] dark:shadow-${color}`;

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl" />
            <div className="h-4 w-72 bg-white/10 animate-pulse rounded-lg mt-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white/15 backdrop-blur-sm border border-white/10 animate-pulse rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
            <div className="h-64 bg-white dark:bg-gray-900 animate-pulse rounded-2xl shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Widget definitions ───
  const widgetMap: Record<string, React.ReactNode> = {
    kpi: (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 p-4 md:p-5 text-white shadow-lg dark:shadow-[0_0_40px_-8px_rgba(59,130,246,0.5)] hover:scale-[1.02] transition-transform cursor-default"
        >
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
            <Wallet className="h-3.5 w-3.5" />
            {t('totalRevenue')}
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2 tracking-tight">
            <AnimatedCurrency value={totalRevenue} />
          </p>
          <p className="text-xs text-white/70 mt-1">
            <AnimatedNumber value={acceptedCount} dateLocale={dateLocale} /> {t('acceptedProposals')}
          </p>
        </motion.div>

        {/* Total Proposals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 p-4 md:p-5 text-white shadow-lg dark:shadow-[0_0_40px_-8px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-transform cursor-default"
        >
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
            <FileText className="h-3.5 w-3.5" />
            {t('proposals')}
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2">
            <AnimatedNumber value={proposalTotal} dateLocale={dateLocale} />
          </p>
          <p className="text-xs text-white/70 mt-1">
            <AnimatedNumber value={pendingCount} dateLocale={dateLocale} /> {t('pending')}{revisionCount > 0 ? ` · ${revisionCount} ${t('revision')}` : ''}
          </p>
        </motion.div>

        {/* Accept Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 p-4 md:p-5 text-white shadow-lg dark:shadow-[0_0_40px_-8px_rgba(16,185,129,0.5)] hover:scale-[1.02] transition-transform cursor-default"
        >
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            {t('acceptanceRate')}
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2">
            <AnimatedNumber value={acceptRate} suffix="%" dateLocale={dateLocale} />
          </p>
          <div className="mt-1 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(acceptRate, 100)}%` }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-white/80 rounded-full"
            />
          </div>
        </motion.div>

        {/* Customers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 p-4 md:p-5 text-white shadow-lg dark:shadow-[0_0_40px_-8px_rgba(245,158,11,0.5)] hover:scale-[1.02] transition-transform cursor-default"
        >
          <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
            <Users className="h-3.5 w-3.5" />
            {t('customers')}
          </div>
          <p className="text-xl md:text-2xl font-bold mt-2">
            <AnimatedNumber value={customerTotal} dateLocale={dateLocale} />
          </p>
          <p className="text-xs text-white/70 mt-1">{t('totalCustomers')}</p>
        </motion.div>
      </div>
    ),

    alerts: (
      <>
        {/* Revision Requested */}
        {revisionCount > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/50 p-4 dark:shadow-[0_0_25px_-8px_rgba(139,92,246,0.3)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900">
                <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="font-semibold text-violet-800 dark:text-violet-200">{t('revisionPending')}</h3>
              <Badge className="bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200 text-xs ml-auto">
                {revisionCount} {t('proposal')}
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {proposals
                .filter((p: DashboardProposal) => p.status === 'REVISION_REQUESTED')
                .map((proposal: DashboardProposal, i: number) => (
                  <motion.button
                    key={proposal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => router.push(`/${locale}/proposals/${proposal.id}`)}
                    className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 px-4 py-3 hover:shadow-md transition-all group text-left"
                  >
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 truncate">
                        {proposal.title || proposal.proposalNumber}
                      </p>
                      <p className="text-xs text-violet-600 dark:text-violet-400 truncate">
                        {proposal.customer?.name ?? t('customerNotSpecified')} · {formatAmount(Number(proposal.grandTotal) || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-violet-500 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                      <span className="text-xs font-medium hidden sm:block">{t('edit')}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.button>
                ))}
            </div>
          </motion.div>
        )}

        {/* Stock Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-orange-200 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-950/50 p-4 dark:shadow-[0_0_25px_-8px_rgba(245,158,11,0.3)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200">{t('lowStockAlert')}</h3>
              <Badge className="bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200 text-xs ml-auto">
                {alerts.length} {t('product')}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 5).map((alert: StockAlert) => (
                <div
                  key={alert.productId}
                  className="flex items-center gap-2 rounded-xl bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 px-3 py-2 text-sm"
                >
                  <Package className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-medium text-orange-900 dark:text-orange-100">{alert.productName}</span>
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    {alert.currentStock}/{alert.minLevel}
                  </span>
                </div>
              ))}
              {alerts.length > 5 && (
                <button
                  onClick={() => router.push(`/${locale}/products`)}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium px-3 py-2"
                >
                  +{alerts.length - 5} {t('more')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </>
    ),

    chart: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-4 md:p-5 dark:shadow-[0_0_20px_-8px_rgba(59,130,246,0.2)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">{t('proposalTrend')}</h3>
              <p className="text-xs text-muted-foreground">{t('last10Amounts')}</p>
            </div>
          </div>
          <div className="w-full h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatAmount(value), t('amount')]}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#colorTotal)"
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border bg-card p-4 md:p-5 flex flex-col dark:shadow-[0_0_20px_-8px_rgba(139,92,246,0.15)]">
          <h3 className="font-semibold mb-4">{t('quickActions')}</h3>
          <div className="flex flex-col gap-3 flex-1">
            {[
              { onClick: () => router.push(`/${locale}/proposals/new`), icon: Plus, label: t('newProposal'), desc: t('createQuickProposal'), from: 'from-blue-50 dark:from-blue-950', to: 'to-indigo-50 dark:to-indigo-950', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-500', text: 'text-blue-', glow: 'dark:shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]' },
              { onClick: () => router.push(`/${locale}/customers`), icon: Users, label: t('customers'), desc: `${customerTotal} ${t('customerCount')}`, from: 'from-emerald-50 dark:from-emerald-950', to: 'to-teal-50 dark:to-teal-950', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-500', text: 'text-emerald-', glow: 'dark:shadow-[0_0_15px_-5px_rgba(16,185,129,0.4)]' },
              { onClick: () => router.push(`/${locale}/products`), icon: Package, label: t('products'), desc: t('stockAndProductMgmt'), from: 'from-amber-50 dark:from-amber-950', to: 'to-orange-50 dark:to-orange-950', border: 'border-amber-200 dark:border-amber-800', bg: 'bg-amber-500', text: 'text-amber-', glow: 'dark:shadow-[0_0_15px_-5px_rgba(245,158,11,0.4)]' },
              { onClick: handleSyncParasut, icon: RefreshCw, label: t('parasutSync'), desc: t('updateData'), from: 'from-slate-50 dark:from-slate-950', to: 'to-gray-50 dark:to-gray-950', border: 'border-slate-200 dark:border-slate-800', bg: 'bg-slate-500', text: 'text-slate-', glow: '' },
            ].map((action, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                onClick={action.onClick}
                disabled={action.icon === RefreshCw && isSyncing}
                className={cn(
                  `flex items-center gap-3 rounded-xl bg-gradient-to-r ${action.from} ${action.to} border ${action.border} p-3 hover:shadow-md transition-all group`,
                  action.glow
                )}
              >
                <div className={cn('p-2 rounded-lg text-white group-hover:scale-110 transition-transform', action.bg)}>
                  <action.icon className={cn('h-4 w-4', action.icon === RefreshCw && isSyncing && 'animate-spin')} />
                </div>
                <div className="text-left flex-1">
                  <p className={cn('text-sm font-semibold', `${action.text}900 dark:${action.text}100`)}>{action.label}</p>
                  <p className={cn('text-xs', `${action.text}600 dark:${action.text}400`)}>{action.desc}</p>
                </div>
                <ArrowRight className={cn('h-4 w-4 group-hover:translate-x-1 transition-transform', `${action.text}400`)} />
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    ),

    recent: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border bg-card dark:shadow-[0_0_20px_-8px_rgba(139,92,246,0.1)]"
      >
        <div className="flex items-center justify-between p-4 md:p-5 border-b">
          <div>
            <h3 className="font-semibold">{t('recentProposals')}</h3>
            <p className="text-xs text-muted-foreground">{t('recentProposalsDesc')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}/proposals`)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded-xl"
          >
            {t('viewAll')}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('noProposals')}</p>
            <Button
              onClick={() => router.push(`/${locale}/proposals/new`)}
              className="mt-4 rounded-xl"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirst')}
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {proposals.map((proposal: DashboardProposal, i: number) => {
              const status = statusConfig[proposal.status] ?? statusConfig.DRAFT;
              const amount = Number(proposal.grandTotal) || 0;
              return (
                <motion.button
                  key={proposal.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                  onClick={() => router.push(`/${locale}/proposals/${proposal.id}`)}
                  className="flex items-center gap-4 p-4 md:px-5 w-full text-left hover:bg-muted/50 transition-colors"
                >
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', status.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {proposal.title || proposal.proposalNumber}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {proposal.customer?.name ?? t('customerNotSpecified')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{formatAmount(amount)}</p>
                    <Badge className={cn('text-[10px] mt-1 font-medium', status.color)}>
                      {tStatus(`status.${proposal.status}` as Parameters<typeof tStatus>[0])}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block w-16 text-right">
                    {formatDate(proposal.createdAt)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    ),
  };

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
      {/* Gradient Hero */}
      <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 pb-6 px-4 md:px-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto">
          {/* ─── Welcome Header ─── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-white/70">
              {t('currentStatus')}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleSyncParasut}
                size="sm"
                disabled={isSyncing}
                className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
                {t('sync')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}/proposals/new`)}
                size="sm"
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('newProposal')}
              </Button>
            </div>
          </motion.div>

          {/* ─── KPI Cards ─── */}
          <div className="mt-6">
            {widgetMap.kpi}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
          {/* ─── Draggable Widgets ─── */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
              <div className="space-y-6">
                {widgetOrder.map((widgetId) => (
                  <SortableWidget key={widgetId} id={widgetId}>
                    {widgetMap[widgetId]}
                  </SortableWidget>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* ─── FAB ─── */}
          <FloatingActionButton locale={locale} lastProposalId={lastProposalId} />
        </div>
      </div>
    </div>
  );
}
