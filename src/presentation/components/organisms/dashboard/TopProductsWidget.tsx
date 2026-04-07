'use client';

import React from 'react';
import { MOCK_TOP_PRODUCTS } from './mock-data';

export const TopProductsWidget: React.FC = () => {
  const maxRevenue = Math.max(...MOCK_TOP_PRODUCTS.map((p) => p.revenue));

  return (
    <div className="space-y-4">
      {MOCK_TOP_PRODUCTS.map((product, index) => (
        <div key={index}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-slate-900 dark:text-white">
              {product.name}
            </p>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              ₺{(product.revenue / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {product.count} kullanılan
          </p>
        </div>
      ))}
    </div>
  );
};
