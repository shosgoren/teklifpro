'use client';

import React from 'react';
import { Plus, TrendingUp, Zap, Clock, AlertCircle } from 'lucide-react';
import { MOCK_ACTIVITY } from './mock-data';

export const ActivityFeedWidget: React.FC = () => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'proposal':
        return <Plus className="h-4 w-4" />;
      case 'view':
        return <AlertCircle className="h-4 w-4" />;
      case 'accept':
        return <TrendingUp className="h-4 w-4" />;
      case 'send':
        return <Zap className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'proposal':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      case 'view':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400';
      case 'accept':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400';
      case 'send':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {MOCK_ACTIVITY.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${getActivityColor(
                activity.type
              )}`}
            >
              {getActivityIcon(activity.type)}
            </div>
            {index < MOCK_ACTIVITY.length - 1 && (
              <div className="my-1 h-6 w-0.5 bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium text-slate-900 dark:text-white">
              {activity.message}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activity.client}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {activity.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
