'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Pin } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getIconByType, getBadgeVariant, t } from './timeline-utils';
import type { TimelineItemProps } from './types';

export function TimelineItem({
  event,
  isPinned,
  isSubmitting,
  onEdit,
  onDelete,
}: TimelineItemProps) {
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
                  {event.type === 'note' ? 'Not' : event.type.toUpperCase()}
                </Badge>
                {isPinned && (
                  <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>

              {/* Timestamp and user */}
              <p className="text-sm text-gray-500 mb-2">
                {event.user} •{' '}
                <time title={format(new Date(event.timestamp), 'PPpp', { locale: tr })}>
                  {formatDistanceToNow(new Date(event.timestamp), {
                    locale: tr,
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
                  {event.attachmentsCount} ek dosya
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
              >
                {t('timeline.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(event.id)}
                disabled={isSubmitting}
              >
                {t('timeline.delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
