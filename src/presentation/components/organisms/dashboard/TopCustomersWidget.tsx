'use client';

import React from 'react';
import { MOCK_TOP_CUSTOMERS } from './mock-data';

export const TopCustomersWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_TOP_CUSTOMERS.map((customer, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {customer.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customer.proposals} teklif
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900 dark:text-white">
              ₺{(customer.revenue / 1000).toFixed(0)}K
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
