'use client';

import { useTranslations } from 'next-intl';
import {
  Clock, Eye, CheckCircle, XCircle, AlertCircle, FileText, Mail,
} from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import type { ProposalActivity } from './types';
import { ACTIVITY_ICON_COLORS, ACTIVITY_KEY_MAP } from './types';

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'CREATED':
      return <FileText className="h-4 w-4" />;
    case 'SENT':
      return <Mail className="h-4 w-4" />;
    case 'VIEWED':
      return <Eye className="h-4 w-4" />;
    case 'ACCEPTED':
      return <CheckCircle className="h-4 w-4" />;
    case 'REJECTED':
      return <XCircle className="h-4 w-4" />;
    case 'REVISION_REQUESTED':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

interface ActivityTimelineProps {
  activities: ProposalActivity[];
  formatDateTime: (dateStr: string) => string;
}

export function ActivityTimeline({ activities, formatDateTime }: ActivityTimelineProps) {
  const t = useTranslations('proposals');

  const getActivityLabel = (type: string) => {
    const key = ACTIVITY_KEY_MAP[type];
    return key ? t(key as Parameters<typeof t>[0]) : type;
  };

  return (
    <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-5">
        <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">{t('activityHistory')}</h3>
        <div className="space-y-0">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{t('noActivity')}</p>
          ) : (
            activities.map((activity: ProposalActivity, idx: number) => (
              <div key={activity.id} className="flex gap-3">
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${ACTIVITY_ICON_COLORS[activity.type] || 'from-gray-400 to-gray-500'} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  {idx < activities.length - 1 && (
                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4 pt-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{getActivityLabel(activity.type)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(activity.createdAt)}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activity.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
