'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { MOCK_AI_INSIGHTS } from './mock-data';

export const AIInsightsWidget: React.FC = () => {
  return (
    <div className="space-y-3">
      {MOCK_AI_INSIGHTS.map((insight, index) => (
        <div
          key={index}
          className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-slate-900 dark:text-white">{insight}</p>
        </div>
      ))}
    </div>
  );
};
