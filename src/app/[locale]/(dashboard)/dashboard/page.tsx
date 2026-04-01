'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import {
  LineChart,
  Line,
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
  CheckCircle,
  TrendingUp,
  Plus,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Package,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/shared/utils/cn';

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

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: 'Taslak', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  SENT: { label: 'Gönderildi', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', dot: 'bg-blue-500' },
  VIEWED: { label: 'Görüntülendi', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', dot: 'bg-amber-500' },
  ACCEPTED: { label: 'Kabul Edildi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500' },
  REVISION_REQUESTED: { label: 'Revize', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', dot: 'bg-orange-500' },
  EXPIRED: { label: 'Süresi Doldu', color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400' },
};

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('dashboardPage');
  const tStatus = useTranslations('proposals');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: proposalsData, isLoading: proposalsLoading } = useSWR('/api/v1/proposals?limit=10', fetcher);
  const { data: customersData, isLoading: customersLoading } = useSWR('/api/v1/customers?limit=1', fetcher);
  const { data: alertsData } = useSWR('/api/v1/stock/alerts', fetcher);

  const proposals = proposalsData?.data?.proposals ?? [];
  const proposalTotal = proposalsData?.data?.pagination?.total ?? 0;
  const customerTotal = customersData?.data?.pagination?.total ?? 0;
  const alerts = alertsData?.data?.alerts ?? alertsData?.data ?? [];

  const isLoading = proposalsLoading || customersLoading;

  const acceptedCount = proposals.filter((p: any) => p.status === 'ACCEPTED').length;
  const acceptRate = proposals.length > 0 ? ((acceptedCount / proposals.length) * 100).toFixed(0) : '0';
  const totalRevenue = proposals
    .filter((p: any) => p.status === 'ACCEPTED')
    .reduce((sum: number, p: any) => sum + (Number(p.grandTotal) || 0), 0);
  const pendingCount = proposals.filter((p: any) => ['SENT', 'VIEWED'].includes(p.status)).length;
  const revisionCount = proposals.filter((p: any) => p.status === 'REVISION_REQUESTED').length;

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

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const chartData = proposals
    .map((p: any) => ({
      date: new Date(p.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      total: Number(p.grandTotal) || 0,
    }))
    .reverse();

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ─── Welcome Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t('welcome')} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('currentStatus')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncParasut}
            variant="outline"
            size="sm"
            disabled={isSyncing}
            className="rounded-xl"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
            {t('sync')}
          </Button>
          <Button
            onClick={() => router.push(`/${locale}/proposals/new`)}
            size="sm"
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('newProposal')}
          </Button>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 md:p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" />
              {t('totalRevenue')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2 tracking-tight">
              {formatAmount(totalRevenue)}
            </p>
            <p className="text-xs text-blue-200 mt-1">{acceptedCount} {t('acceptedProposals')}</p>
          </div>
        </div>

        {/* Total Proposals */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-4 md:p-5 text-white shadow-lg shadow-purple-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 text-purple-100 text-xs font-medium">
              <FileText className="h-3.5 w-3.5" />
              {t('proposals')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2">{proposalTotal}</p>
            <p className="text-xs text-purple-200 mt-1">
              {pendingCount} {t('pending')}{revisionCount > 0 ? ` · ${revisionCount} ${t('revision')}` : ''}
            </p>
          </div>
        </div>

        {/* Accept Rate */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-4 md:p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('acceptanceRate')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2">{acceptRate}%</p>
            <div className="mt-1 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${Math.min(Number(acceptRate), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Customers */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 md:p-5 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="relative">
            <div className="flex items-center gap-2 text-amber-100 text-xs font-medium">
              <Users className="h-3.5 w-3.5" />
              {t('customers')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2">{customerTotal}</p>
            <p className="text-xs text-amber-200 mt-1">{t('totalCustomers')}</p>
          </div>
        </div>
      </div>

      {/* ─── Revision Requested Proposals ─── */}
      {revisionCount > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/50 p-4">
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
              .filter((p: any) => p.status === 'REVISION_REQUESTED')
              .map((proposal: any) => (
                <button
                  key={proposal.id}
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
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ─── Stock Alerts ─── */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-950/50 p-4">
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
            {alerts.slice(0, 5).map((alert: any) => (
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
        </div>
      )}

      {/* ─── Chart + Quick Actions Row ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-4 md:p-5">
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
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border bg-card p-4 md:p-5 flex flex-col">
          <h3 className="font-semibold mb-4">{t('quickActions')}</h3>
          <div className="flex flex-col gap-3 flex-1">
            <button
              onClick={() => router.push(`/${locale}/proposals/new`)}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 p-3 hover:shadow-md transition-all group"
            >
              <div className="p-2 rounded-lg bg-blue-500 text-white group-hover:scale-110 transition-transform">
                <Plus className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t('newProposal')}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">{t('createQuickProposal')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => router.push(`/${locale}/customers`)}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border border-emerald-200 dark:border-emerald-800 p-3 hover:shadow-md transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500 text-white group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{t('customers')}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{customerTotal} {t('customerCount')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => router.push(`/${locale}/products`)}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 p-3 hover:shadow-md transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-500 text-white group-hover:scale-110 transition-transform">
                <Package className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t('products')}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{t('stockAndProductMgmt')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleSyncParasut}
              disabled={isSyncing}
              className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950 border border-slate-200 dark:border-slate-800 p-3 hover:shadow-md transition-all group"
            >
              <div className="p-2 rounded-lg bg-slate-500 text-white group-hover:scale-110 transition-transform">
                <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('parasutSync')}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('updateData')}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Recent Proposals ─── */}
      <div className="rounded-2xl border bg-card">
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
            {proposals.map((proposal: any) => {
              const status = statusConfig[proposal.status] ?? statusConfig.DRAFT;
              const amount = Number(proposal.grandTotal) || 0;
              return (
                <button
                  key={proposal.id}
                  onClick={() => router.push(`/${locale}/proposals/${proposal.id}`)}
                  className="flex items-center gap-4 p-4 md:px-5 w-full text-left hover:bg-muted/50 transition-colors"
                >
                  {/* Status dot */}
                  <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', status.dot)} />

                  {/* Info */}
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

                  {/* Amount + Status */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold">{formatAmount(amount)}</p>
                    <Badge className={cn('text-[10px] mt-1 font-medium', status.color)}>
                      {tStatus(`status.${proposal.status}` as any)}
                    </Badge>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block w-16 text-right">
                    {formatDate(proposal.createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
