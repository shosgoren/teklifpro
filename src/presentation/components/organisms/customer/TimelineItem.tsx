'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Pin } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { format, formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { getIconByType, getBadgeVariant } from './timeline-utils';
import type { TimelineItemProps } from './types';

const DATE_LOCALES: Record<string, typeof tr> = { tr, en: enUS };

export function TimelineItem({
  event,
  isPinned,
  isSubmitting,
  onEdit,
  onDelete,
}: TimelineItemProps) {
  const t = useTranslations('customerTimeline');
  const locale = useLocale();
  const dateLoc = DATE_LOCALES[locale] || tr;

  const TYPE_LABELS: Record<string, string> = {
    note: t('typeNote'),
    call: t('typeCall'),
    meeting: t('typeMeeting'),
    email: t('typeEmail'),
    task: t('typeTask'),
    proposal: t('filterProposal'),
    status: t('filterStatus'),
  };

  return (
    <div
      className={cn(
        'group relative',
        isPinned && 'rounded-lg bg-yellow-50 p-4 border-l-4 border-yellow-400'
      )}
    >
      {/* Timeline dot and line */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-4 ring-white">
            {getIconByType(event.type)}
          </div>
          {/* Line to next element */}
          <div className="h-8 w-0.5 bg-gray-200" />
        </div>

        {/* Content */}
        <div className="flex-1 pb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex gap-2 items-center mb-2">
                <Badge className={getBadgeVariant(event.type)}>
                  {TYPE_LABELS[event.type] || event.type.toUpperCase()}
                </Badge>
                {isPinned && (
                  <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>

              {/* Timestamp and user */}
              <p className="text-sm text-gray-500 mb-2">
                {event.user} •{' '}
                <time title={format(new Date(event.timestamp), 'PPpp', { locale: dateLoc })}>
                  {formatDistanceToNow(new Date(event.timestamp), {
                    locale: dateLoc,
                    addSuffix: true,
                  })}
                </time>
              </p>

              {/* Content */}
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.content}
              </p>

              {/* Attachment count */}
              {event.attachmentsCount ? (
                <p className="text-xs text-gray-500 mt-2">
                  {t('attachmentCount', { count: event.attachmentsCount })}
                </p>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(event)}
                disabled={isSubmitting}
                aria-label={t('edit')}
              >
                {t('edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(event.id)}
                disabled={isSubmitting}
                aria-label={t('delete')}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
