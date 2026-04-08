'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import type { FilterType, TimelineFiltersProps } from './types';

const FILTER_KEYS: Record<FilterType, string> = {
  all: 'filterAll',
  note: 'typeNote',
  call: 'typeCall',
  meeting: 'typeMeeting',
  email: 'typeEmail',
  task: 'typeTask',
  proposal: 'filterProposal',
  status: 'filterStatus',
};

export function TimelineFilters({
  filter,
  isLoading,
  onFilterChange,
}: TimelineFiltersProps) {
  const t = useTranslations('customerTimeline');

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm font-medium text-gray-700">
        {t('filters')}:
      </span>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'note', 'call', 'meeting', 'email', 'task', 'proposal', 'status'] as FilterType[]).map(
          (f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(f)}
              disabled={isLoading}
              aria-pressed={filter === f}
            >
              {t(FILTER_KEYS[f])}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
