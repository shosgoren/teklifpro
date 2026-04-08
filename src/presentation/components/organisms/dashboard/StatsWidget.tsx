'use client';

import React from 'react';
import { TrendingUp, BarChart3, Zap, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { StatCardProps } from './types';
import { MOCK_STATS } from './mock-data';

const StatCard: React.FC<StatCardProps & { periodLabel: string }> = ({
  title,
  value,
  change,
  icon,
  unit,
  periodLabel,
}) => {
  const isPositive = change >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
            {unit && <span className="text-lg text-slate-500">{unit}</span>}
          </p>
          <p
            className={`mt-1 text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}{change}% {periodLabel}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
          {icon}
        </div>
      </div>
    </div>
  );
};

export const StatsWidget: React.FC<{ settings?: Record<string, any> }> = () => {
  const t = useTranslations('statsWidget');
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={t('totalProposals')}
        value={MOCK_STATS.totalProposals}
        change={MOCK_STATS.proposalChange}
        icon={<BarChart3 className="h-6 w-6" />}
        periodLabel={t('previousPeriod')}
      />
      <StatCard
        title={t('acceptanceRate')}
        value={MOCK_STATS.acceptanceRate.toFixed(1)}
        change={MOCK_STATS.acceptanceChange}
        icon={<TrendingUp className="h-6 w-6" />}
        unit="%"
        periodLabel={t('previousPeriod')}
      />
      <StatCard
        title={t('totalRevenue')}
        value={`₺${(MOCK_STATS.totalRevenue / 1000).toFixed(0)}K`}
        change={MOCK_STATS.revenueChange}
        icon={<Zap className="h-6 w-6" />}
        periodLabel={t('previousPeriod')}
      />
      <StatCard
        title={t('pendingProposals')}
        value={MOCK_STATS.pendingProposals}
        change={MOCK_STATS.pendingChange}
        icon={<Clock className="h-6 w-6" />}
        periodLabel={t('previousPeriod')}
      />
    </div>
  );
};
