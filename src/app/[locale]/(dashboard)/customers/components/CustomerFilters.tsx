'use client';

import { useTranslations } from 'next-intl';
import { Plus, RefreshCw, Search, Filter } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils/cn';
import type { FilterStatus } from './types';

interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: FilterStatus;
  onFilterStatusChange: (value: FilterStatus) => void;
  isSyncing: boolean;
  onSync: () => void;
  onAddCustomer: () => void;
  onPageReset: () => void;
}

export function CustomerFilters({
  searchQuery, onSearchChange,
  filterStatus, onFilterStatusChange,
  isSyncing, onSync, onAddCustomer, onPageReset,
}: CustomerFiltersProps) {
  const t = useTranslations('customersPage');

  const filterLabels: Record<FilterStatus, string> = { all: t('all'), active: t('active'), inactive: t('inactive') };

  return (
    <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-mint-500 to-mint-600 pb-6 px-4 md:px-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto space-y-4">
        {/* Subtitle + Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/70 text-sm">Musteri bilgilerini yonet ve takip et</p>
          <div className="flex gap-2">
            <Button onClick={onSync} disabled={isSyncing} size="sm"
              className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
              <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
              {t('sync')}
            </Button>
            {/* Add Customer button - glass style */}
            <Button onClick={onAddCustomer} size="sm"
              className="rounded-xl bg-white/20 hover:bg-white/30 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20">
              <Plus className="mr-2 h-4 w-4" />
              {t('newCustomer')}
            </Button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/30"
              value={searchQuery}
              onChange={(e) => { onSearchChange(e.target.value); onPageReset(); }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl min-w-[120px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <Filter className="mr-2 h-4 w-4" />
                {filterLabels[filterStatus]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filterStatus === status}
                  onCheckedChange={() => { onFilterStatusChange(status); onPageReset(); }}
                >
                  {filterLabels[status]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
