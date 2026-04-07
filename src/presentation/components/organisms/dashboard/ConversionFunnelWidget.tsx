'use client';

import React from 'react';
import { MOCK_FUNNEL_DATA } from './mock-data';

export const ConversionFunnelWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_FUNNEL_DATA.map((stage, index) => (
        <div key={index}>
          <div className="mb-1 flex items-center justify-between">
            <p className="font-medium text-slate-900 dark:text-white">
              {stage.stage}
            </p>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              {stage.count} ({stage.percentage}%)
            </span>
          </div>
          <div className="h-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
            <div
              className={`flex h-full items-center justify-center text-xs font-semibold text-white ${
                index === 3
                  ? 'bg-green-500'
                  : index === 2
                    ? 'bg-yellow-500'
                    : index === 1
                      ? 'bg-blue-500'
                      : 'bg-slate-400'
              }`}
              style={{ width: `${stage.percentage}%` }}
            >
              {stage.percentage > 15 && `${stage.percentage}%`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
