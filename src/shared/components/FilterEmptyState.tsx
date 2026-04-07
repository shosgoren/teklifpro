'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';

interface FilterEmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
}

export function FilterEmptyState({ title, description, onClearFilters }: FilterEmptyStateProps) {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {title ?? t('noFilterResults')}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {description ?? t('noFilterResultsDesc')}
      </p>
      {onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="mt-4 rounded-xl"
        >
          {t('clearFilters')}
        </Button>
      )}
    </div>
  );
}
