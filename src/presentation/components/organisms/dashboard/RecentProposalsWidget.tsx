'use client';

import React from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { MOCK_RECENT_PROPOSALS } from './mock-data';

export const RecentProposalsWidget: React.FC = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Kabul Edilen':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Gönderilen':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Görüntülenen':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Taslak':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-3">
      {MOCK_RECENT_PROPOSALS.map((proposal) => (
        <div
          key={proposal.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {proposal.clientName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {proposal.date}
            </p>
          </div>
          <div className="mr-3 text-right">
            <p className="font-semibold text-slate-900 dark:text-white">
              ₺{proposal.amount.toLocaleString('tr-TR')}
            </p>
          </div>
          <Badge className={getStatusColor(proposal.status)}>
            {proposal.status}
          </Badge>
        </div>
      ))}
    </div>
  );
};
