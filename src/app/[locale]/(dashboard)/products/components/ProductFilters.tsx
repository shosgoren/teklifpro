'use client';

import { useTranslations } from 'next-intl';
import {
  Search, Filter, ArrowUpDown, LayoutGrid, List, AlertTriangle,
  Download, Upload, Percent, RefreshCw, Plus,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/utils/cn';
import type { FilterProductType, ViewMode } from './types';

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterProductType: FilterProductType;
  onFilterProductTypeChange: (value: FilterProductType) => void;
  filterStatus: 'all' | 'active' | 'inactive';
  onFilterStatusChange: (value: 'all' | 'active' | 'inactive') => void;
  filterStockStatus: 'all' | 'low' | 'inStock' | 'outOfStock';
  onFilterStockStatusChange: (value: 'all' | 'low' | 'inStock' | 'outOfStock') => void;
  sortBy: 'createdAt' | 'name' | 'listPrice' | 'stockQuantity';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'createdAt' | 'name' | 'listPrice' | 'stockQuantity', sortOrder: 'asc' | 'desc') => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isSyncing: boolean;
  isImporting: boolean;
  importInputRef: React.RefObject<HTMLInputElement>;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBulkPriceOpen: () => void;
  onSync: () => void;
  onAddProduct: () => void;
  onPageReset: () => void;
}

export function ProductFilters({
  searchQuery, onSearchChange,
  filterProductType, onFilterProductTypeChange,
  filterStatus, onFilterStatusChange,
  filterStockStatus, onFilterStockStatusChange,
  sortBy, sortOrder, onSortChange,
  viewMode, onViewModeChange,
  isSyncing, isImporting, importInputRef,
  onExport, onImport, onBulkPriceOpen, onSync, onAddProduct, onPageReset,
}: ProductFiltersProps) {
  const t = useTranslations('productsPage');

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    COMMERCIAL: t('commercial'),
    RAW_MATERIAL: t('rawMaterial'),
    SEMI_FINISHED: t('semiFinished'),
    CONSUMABLE: t('consumable'),
  };

  const PRODUCT_TYPE_OPTIONS = [
    { value: 'all', label: t('all') },
    { value: 'COMMERCIAL', label: t('commercial') },
    { value: 'RAW_MATERIAL', label: t('rawMaterial') },
    { value: 'SEMI_FINISHED', label: t('semiFinished') },
    { value: 'CONSUMABLE', label: t('consumable') },
  ];

  return (
    <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 pb-6 px-4 md:px-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto space-y-4">
        {/* Subtitle + Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/70 text-sm">Urun katalogunu yonet</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={onExport} size="sm"
              className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
              <Download className="mr-2 h-4 w-4" />
              {t('export')}
            </Button>
            <label className={cn(
              'inline-flex items-center gap-2 px-3 h-8 rounded-xl text-sm font-medium cursor-pointer transition-colors',
              'bg-white/10 border border-white/20 text-white hover:bg-white/20',
              isImporting && 'opacity-50 pointer-events-none'
            )}>
              <Upload className="h-4 w-4" />
              {isImporting ? t('importing') : t('import')}
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={onImport}
                className="hidden"
                disabled={isImporting}
              />
            </label>
            <Button onClick={onBulkPriceOpen} size="sm"
              className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
              <Percent className="mr-2 h-4 w-4" />
              {t('bulkPrice')}
            </Button>
            <Button onClick={onSync} disabled={isSyncing} size="sm"
              className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
              <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
              {t('sync')}
            </Button>
            <Button onClick={onAddProduct} size="sm"
              className="rounded-xl bg-white/20 hover:bg-white/30 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20">
              <Plus className="mr-2 h-4 w-4" />
              {t('newProduct')}
            </Button>
          </div>
        </div>

        {/* Search + Filter + View Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input placeholder={t('searchPlaceholder')}
              className="pl-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/30"
              value={searchQuery}
              onChange={(e) => { onSearchChange(e.target.value); onPageReset(); }} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl min-w-[140px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <Filter className="mr-2 h-4 w-4" />
                {filterProductType === 'all' ? t('all') : (PRODUCT_TYPE_LABELS[filterProductType] || filterProductType)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PRODUCT_TYPE_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem key={opt.value} checked={filterProductType === opt.value}
                  onCheckedChange={() => { onFilterProductTypeChange(opt.value); onPageReset(); }}>
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl min-w-[110px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20">
                {filterStatus === 'all' ? t('all') : filterStatus === 'active' ? t('active') : t('inactive')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={filterStatus === 'all'}
                onCheckedChange={() => { onFilterStatusChange('all'); onPageReset(); }}>
                {t('all')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterStatus === 'active'}
                onCheckedChange={() => { onFilterStatusChange('active'); onPageReset(); }}>
                {t('active')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterStatus === 'inactive'}
                onCheckedChange={() => { onFilterStatusChange('inactive'); onPageReset(); }}>
                {t('inactive')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stock Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl min-w-[110px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {filterStockStatus === 'all' ? t('all') : filterStockStatus === 'low' ? t('lowStock') : filterStockStatus === 'inStock' ? t('inStock') : t('outOfStock')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={filterStockStatus === 'all'}
                onCheckedChange={() => { onFilterStockStatusChange('all'); onPageReset(); }}>
                {t('all')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterStockStatus === 'low'}
                onCheckedChange={() => { onFilterStockStatusChange('low'); onPageReset(); }}>
                {t('lowStock')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterStockStatus === 'inStock'}
                onCheckedChange={() => { onFilterStockStatusChange('inStock'); onPageReset(); }}>
                {t('inStock')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={filterStockStatus === 'outOfStock'}
                onCheckedChange={() => { onFilterStockStatusChange('outOfStock'); onPageReset(); }}>
                {t('outOfStock')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {t('sort')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={sortBy === 'createdAt'}
                onCheckedChange={() => { onSortChange('createdAt', 'desc'); onPageReset(); }}>
                {t('sortByDate')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === 'name'}
                onCheckedChange={() => { onSortChange('name', 'asc'); onPageReset(); }}>
                {t('sortByName')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === 'listPrice'}
                onCheckedChange={() => { onSortChange('listPrice', sortOrder === 'desc' ? 'asc' : 'desc'); onPageReset(); }}>
                {t('sortByPrice')} {sortBy === 'listPrice' ? (sortOrder === 'asc' ? '\u2191' : '\u2193') : ''}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={sortBy === 'stockQuantity'}
                onCheckedChange={() => { onSortChange('stockQuantity', sortOrder === 'desc' ? 'asc' : 'desc'); onPageReset(); }}>
                {t('sortByStock')} {sortBy === 'stockQuantity' ? (sortOrder === 'asc' ? '\u2191' : '\u2193') : ''}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle */}
          <div className="hidden md:flex items-center border border-white/20 rounded-xl overflow-hidden">
            <button
              onClick={() => onViewModeChange('table')}
              className={cn('p-2.5 transition-colors', viewMode === 'table' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
