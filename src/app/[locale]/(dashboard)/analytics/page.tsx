'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import useSWR from 'swr';
import { swrDefaultOptions } from '@/shared/utils/swrConfig';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Package,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';

// ---------- fetcher ----------
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

// ---------- constants ----------

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: '#10b981',
  SENT: '#3b82f6',
  VIEWED: '#f59e0b',
  DRAFT: '#6b7280',
  REJECTED: '#ef4444',
  REVISION_REQUESTED: '#f97316',
  REVISED: '#8b5cf6',
  EXPIRED: '#a3a3a3',
  CANCELLED: '#dc2626',
};

const CHART_COLORS = {
  sent: '#3b82f6',
  accepted: '#10b981',
  rejected: '#ef4444',
};

// MONTH_NAMES moved to useTranslations

// ---------- sub-components ----------
const KPICard = ({
  title,
  value,
  icon: Icon,
  suffix = '',
  gradient,
  shadowColor,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  suffix?: string;
  gradient: string;
  shadowColor: string;
}) => (
  <div
    className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg ${shadowColor} overflow-hidden relative`}
  >
    {/* Decorative circle */}
    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
    <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />

    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold mt-2">
          {value}
          {suffix && <span className="text-xl">{suffix}</span>}
        </p>
      </div>
      <div className="bg-white/20 rounded-xl p-2">{Icon}</div>
    </div>
  </div>
);

// ---------- main page ----------
export default function AnalyticsDashboard() {
  const t = useTranslations('analytics');
  const tStatus = useTranslations('proposals');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const { formatCurrency } = useCurrency();
  const MONTH_NAMES = t.raw('months') as string[];

  // ---- data fetching ----
  const {
    data: proposalsData,
    isLoading: proposalsLoading,
    error: proposalsError,
  } = useSWR('/api/v1/proposals?limit=100', fetcher, swrDefaultOptions);

  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
  } = useSWR('/api/v1/customers?limit=100', fetcher, swrDefaultOptions);

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useSWR('/api/v1/products?limit=100', fetcher, swrDefaultOptions);

  interface AnalyticsProposal {
    id: string;
    status: string;
    grandTotal: string | number;
    createdAt: string;
    proposalNumber: string;
    customer?: { name: string };
  }

  interface AnalyticsCustomer {
    id: string;
    name: string;
  }

  interface AnalyticsProduct {
    id: string;
    name: string;
    listPrice: string | number;
  }

  const proposals: AnalyticsProposal[] = proposalsData?.data?.proposals ?? [];
  const customers: AnalyticsCustomer[] = customersData?.data?.customers ?? [];
  const products: AnalyticsProduct[] = productsData?.data?.products ?? [];

  const isLoading = proposalsLoading || customersLoading || productsLoading;
  const hasError = proposalsError || customersError || productsError;

  // ---- computed stats ----
  const stats = useMemo(() => {
    const totalProposals = proposals.length;
    const acceptedProposals = proposals.filter((p) => p.status === 'ACCEPTED');
    const rejectedProposals = proposals.filter((p) => p.status === 'REJECTED');
    const totalRevenue = acceptedProposals.reduce(
      (sum, p) => sum + (Number(p.grandTotal) || 0),
      0,
    );
    const acceptanceRate =
      totalProposals > 0
        ? ((acceptedProposals.length / totalProposals) * 100).toFixed(1)
        : '0';
    const avgProposalAmount =
      totalProposals > 0
        ? totalRevenue / (acceptedProposals.length || 1)
        : 0;

    return {
      totalProposals,
      acceptedCount: acceptedProposals.length,
      rejectedCount: rejectedProposals.length,
      totalRevenue,
      acceptanceRate,
      avgProposalAmount,
      customerCount: customers.length,
      productCount: products.length,
    };
  }, [proposals, customers, products]);

  // ---- status distribution for pie chart ----
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    proposals.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: tStatus(`status.${status}` as Parameters<typeof tStatus>[0]),
      value,
      status,
    }));
  }, [proposals]);

  const statusColors = useMemo(
    () => statusData.map((d) => STATUS_COLORS[d.status] || '#6b7280'),
    [statusData],
  );

  // ---- top customers (by proposal count) ----
  const topCustomersData = useMemo(() => {
    const map: Record<string, number> = {};
    proposals.forEach((p) => {
      const name = p.customer?.name || t('tables.customerNotSpecified');
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, proposals: count }))
      .sort((a, b) => b.proposals - a.proposals)
      .slice(0, 10);
  }, [proposals]);

  // ---- monthly revenue (from accepted proposals, grouped by createdAt month) ----
  const monthlyRevenueData = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    proposals
      .filter((p) => p.status === 'ACCEPTED')
      .forEach((p) => {
        const d = new Date(p.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        if (!map[key]) map[key] = { revenue: 0, count: 0 };
        map[key].revenue += Number(p.grandTotal) || 0;
        map[key].count += 1;
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const monthIdx = parseInt(key.split('-')[1], 10);
        return {
          month: MONTH_NAMES[monthIdx],
          revenue: v.revenue,
          count: v.count,
        };
      });
  }, [proposals]);

  // ---- proposal trend (daily counts for last 30 days) ----
  const proposalTrendData = useMemo(() => {
    const now = new Date();
    const days = 30;
    const buckets: Record<string, { sent: number; accepted: number; rejected: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { sent: 0, accepted: 0, rejected: 0 };
    }

    proposals.forEach((p) => {
      const key = new Date(p.createdAt).toISOString().slice(0, 10);
      if (!buckets[key]) return;
      if (p.status === 'SENT' || p.status === 'VIEWED') buckets[key].sent += 1;
      else if (p.status === 'ACCEPTED') buckets[key].accepted += 1;
      else if (p.status === 'REJECTED') buckets[key].rejected += 1;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr]) => {
        const d = new Date(dateStr);
        return {
          date: d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' }),
          sent: buckets[dateStr].sent,
          accepted: buckets[dateStr].accepted,
          rejected: buckets[dateStr].rejected,
        };
      });
  }, [proposals]);

  // ---- products table (simple list with price) ----
  const topProductsList = useMemo(() => {
    return products
      .map((p) => ({
        id: p.id,
        name: p.name,
        listPrice: Number(p.listPrice) || 0,
      }))
      .sort((a, b) => b.listPrice - a.listPrice)
      .slice(0, 10);
  }, [products]);

  // ---- recent proposals ----
  const recentProposals = useMemo(() => {
    return [...proposals]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 8);
  }, [proposals]);

  // ---- loading state ----
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-rose-500 to-pink-600 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl" />
            <div className="h-4 w-64 bg-white/10 animate-pulse rounded-lg mt-2" />
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-white dark:bg-gray-900 animate-pulse rounded-2xl shadow-sm" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-72 bg-white dark:bg-gray-900 animate-pulse rounded-2xl shadow-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- error state ----
  if (hasError) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-rose-500 to-pink-600 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {t('title')}
            </h1>
            <p className="text-white/70 text-sm mt-1">{t('subtitle')}</p>
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:pb-16 flex items-center justify-center">
            <div className="max-w-md w-full rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="flex flex-col items-center gap-4 p-8">
                <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="font-bold text-xl text-gray-900 dark:text-white">{t('errorLoad')}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center leading-relaxed">
                  {proposalsError?.message || customersError?.message || productsError?.message}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-red-500/25 transition-all"
                >
                  {t('retry')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- empty state ----
  const isEmpty = proposals.length === 0 && customers.length === 0 && products.length === 0;

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
      {/* Gradient Hero */}
      <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 pb-6 px-4 md:px-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto">
          <p className="text-white/70 text-sm">{t('subtitle')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {isEmpty && (
          <div className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="py-16 text-center px-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {t('emptyState')}
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <KPICard
            title={t('kpi.totalProposals')}
            value={stats.totalProposals}
            icon={<FileText className="w-5 h-5 text-white" />}
            gradient="from-blue-500 to-blue-700"
            shadowColor="shadow-blue-500/20"
          />
          <KPICard
            title={t('kpi.acceptanceRate')}
            value={`${stats.acceptanceRate}%`}
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            gradient="from-emerald-500 to-emerald-700"
            shadowColor="shadow-emerald-500/20"
          />
          <KPICard
            title={t('kpi.totalRevenue')}
            value={formatCurrency(stats.totalRevenue)}
            icon={<DollarSign className="w-5 h-5 text-white" />}
            gradient="from-violet-500 to-violet-700"
            shadowColor="shadow-violet-500/20"
          />
          <KPICard
            title={t('kpi.avgAcceptedAmount')}
            value={formatCurrency(stats.avgProposalAmount)}
            icon={<DollarSign className="w-5 h-5 text-white" />}
            gradient="from-amber-500 to-amber-700"
            shadowColor="shadow-amber-500/20"
          />
          <KPICard
            title={t('kpi.customerCount')}
            value={stats.customerCount}
            icon={<Users className="w-5 h-5 text-white" />}
            gradient="from-rose-500 to-rose-700"
            shadowColor="shadow-rose-500/20"
          />
          <KPICard
            title={t('kpi.productCount')}
            value={stats.productCount}
            icon={<Package className="w-5 h-5 text-white" />}
            gradient="from-cyan-500 to-cyan-700"
            shadowColor="shadow-cyan-500/20"
          />
        </div>

        {/* Charts Grid */}
        {proposals.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Proposal Trend Chart */}
            <div className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('charts.proposalTrend')}
                </h3>
                <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-2" />
                <p className="text-sm text-gray-500 mt-2">{t('charts.proposalTrendDesc')}</p>
              </div>
              <div className="p-6 pt-2">
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={proposalTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.sent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.sent} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.accepted} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.accepted} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.rejected} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.rejected} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="sent" stroke={CHART_COLORS.sent} fillOpacity={1} fill="url(#colorSent)" name={t('charts.sent')} />
                      <Area type="monotone" dataKey="accepted" stroke={CHART_COLORS.accepted} fillOpacity={1} fill="url(#colorAccepted)" name={t('charts.accepted')} />
                      <Area type="monotone" dataKey="rejected" stroke={CHART_COLORS.rejected} fillOpacity={1} fill="url(#colorRejected)" name={t('charts.rejected')} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Status Distribution Chart */}
            <div className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('charts.statusDistribution')}</h3>
                <div className="h-1 w-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full mt-2" />
                <p className="text-sm text-gray-500 mt-2">{t('charts.statusDistributionDesc')}</p>
              </div>
              <div className="p-6 pt-2 flex flex-col items-center">
                {statusData.length > 0 ? (
                  <>
                    <div className="w-full h-80 flex justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={130}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={statusColors[index]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => {
                              const total = proposals.length;
                              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                              return `${value} (%${pct})`;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 w-full text-sm">
                      {statusData.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusColors[index] }}
                          />
                          <span className="text-gray-600 dark:text-gray-300 truncate">
                            {item.name}: <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 py-12">{t('tables.noProposals')}</p>
                )}
              </div>
            </div>

            {/* Top Customers Chart */}
            {topCustomersData.length > 0 && (
              <div className="lg:col-span-2 rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('charts.topCustomers')}
                  </h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mt-2" />
                  <p className="text-sm text-gray-500 mt-2">{t('charts.topCustomersDesc')}</p>
                </div>
                <div className="p-6 pt-2">
                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topCustomersData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={145} fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value: number) => `${value} ${t('charts.proposals')}`}
                        />
                        <Bar dataKey="proposals" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Revenue Chart */}
            {monthlyRevenueData.length > 0 && (
              <div className="lg:col-span-2 rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('charts.monthlyRevenue')}</h3>
                  <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-2" />
                  <p className="text-sm text-gray-500 mt-2">{t('charts.monthlyRevenueDesc')}</p>
                </div>
                <div className="p-6 pt-2">
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value: number) => [formatCurrency(value), t('charts.revenue')]}
                          labelFormatter={(label) => `${t('charts.month')} ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" name={t('charts.revenue')} radius={[8, 8, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products Table */}
          <div className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('tables.productsByPrice')}</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mt-2" />
              <p className="text-sm text-gray-500 mt-2">{t('tables.highestPriced')}</p>
            </div>
            <div className="p-6 pt-3">
              {topProductsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          #
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          {t('tables.product')}
                        </th>
                        <th className="text-right py-3 px-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          {t('tables.listPrice')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProductsList.map((product, index) => (
                        <tr
                          key={product.id}
                          className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                          <td className="py-3.5 px-3 text-gray-400 font-medium">{index + 1}</td>
                          <td className="py-3.5 px-3 font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </td>
                          <td className="text-right py-3.5 px-3 font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(product.listPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">{t('tables.noProducts')}</p>
              )}
            </div>
          </div>

          {/* Recent Proposals */}
          <div className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('tables.recentProposals')}</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full mt-2" />
              <p className="text-sm text-gray-500 mt-2">{t('tables.recentProposalsDesc')}</p>
            </div>
            <div className="p-6 pt-3">
              {recentProposals.length > 0 ? (
                <div className="space-y-3">
                  {recentProposals.map((proposal) => {
                    const statusLabel = tStatus(`status.${proposal.status}` as Parameters<typeof tStatus>[0]);
                    const statusColor = STATUS_COLORS[proposal.status] || '#6b7280';
                    const isAccepted = proposal.status === 'ACCEPTED';
                    const isRejected = proposal.status === 'REJECTED';

                    return (
                      <div
                        key={proposal.id}
                        className="flex gap-4 p-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors"
                        style={{ borderLeft: `4px solid ${statusColor}` }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                          style={{ backgroundColor: statusColor }}
                        >
                          {isAccepted ? '\u2713' : isRejected ? '\u2715' : '\u2192'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {proposal.customer?.name || t('tables.customerNotSpecified')}
                          </p>
                          <p className="text-sm text-gray-500">{proposal.proposalNumber}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(proposal.createdAt).toLocaleDateString(dateLocale)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {formatCurrency(Number(proposal.grandTotal) || 0)}
                          </p>
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg mt-1 inline-block"
                            style={{
                              backgroundColor: `${statusColor}15`,
                              color: statusColor,
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 py-8 text-center">{t('tables.noProposals')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-gray-400 py-4">
          {t('lastUpdate')}{' '}
          {new Date().toLocaleDateString(dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
