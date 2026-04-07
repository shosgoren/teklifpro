'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MOCK_REVENUE_DATA } from './mock-data';

export const RevenueChartWidget: React.FC = () => {
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={MOCK_REVENUE_DATA}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#64748b" />
        <YAxis
          stroke="#64748b"
          tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
          }}
          formatter={(value) =>
            `₺${(value as number).toLocaleString(dateLocale)}`
          }
          labelStyle={{ color: '#f1f5f9' }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3b82f6"
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
