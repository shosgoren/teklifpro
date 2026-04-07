'use client';

import { Button } from '@/shared/components/ui/button';
import { t } from './timeline-utils';
import type { FilterType, TimelineFiltersProps } from './types';

export function TimelineFilters({
  filter,
  isLoading,
  onFilterChange,
}: TimelineFiltersProps) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm font-medium text-gray-700">
        {t('timeline.filters')}:
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
            >
              {f === 'all'
                ? 'Tümü'
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
