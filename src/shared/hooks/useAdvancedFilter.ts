'use client';

import { useState, useCallback, useMemo } from 'react';

export interface FilterConfig<T extends Record<string, string>> {
  defaultFilters: T;
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  defaultLimit?: number;
}

export interface AdvancedFilterReturn<T extends Record<string, string>> {
  /** Current filter values */
  filters: T;
  /** Update a single filter value (resets page to 1) */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Current search text */
  search: string;
  /** Update search text (resets page to 1) */
  setSearch: (value: string) => void;
  /** Current page number (1-based) */
  page: number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Items per page */
  limit: number;
  /** Set items per page (resets page to 1) */
  setLimit: (limit: number) => void;
  /** Current sort configuration */
  sort: { field: string; order: 'asc' | 'desc' };
  /** Update sort (resets page to 1) */
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  /** Toggle sort order for a field; if switching fields, defaults to 'asc' */
  toggleSort: (field: string) => void;
  /** Reset all filters, search, sort, and page to defaults */
  resetFilters: () => void;
  /** True when any filter or search differs from defaults */
  hasActiveFilters: boolean;
  /** Build a URLSearchParams query string from current state */
  buildQueryString: () => string;
}

/**
 * Generic hook for managing filter, search, pagination, and sort state.
 *
 * Designed to work with list pages like products and customers.
 * Handles automatic page reset when filters change.
 *
 * @example
 * ```tsx
 * const {
 *   filters, setFilter, search, setSearch,
 *   page, setPage, sort, toggleSort,
 *   resetFilters, hasActiveFilters, buildQueryString,
 * } = useAdvancedFilter({
 *   defaultFilters: { status: 'all', productType: 'all' },
 *   defaultSort: { field: 'createdAt', order: 'desc' },
 *   defaultLimit: 10,
 * });
 *
 * // Use in SWR
 * const { data } = useSWR(`/api/v1/products?${buildQueryString()}`, fetcher);
 * ```
 */
export function useAdvancedFilter<T extends Record<string, string>>(
  config: FilterConfig<T>
): AdvancedFilterReturn<T> {
  const {
    defaultFilters,
    defaultSort = { field: 'createdAt', order: 'desc' as const },
    defaultLimit = 10,
  } = config;

  const [filters, setFilters] = useState<T>({ ...defaultFilters });
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(defaultLimit);
  const [sort, setSortState] = useState<{ field: string; order: 'asc' | 'desc' }>({
    ...defaultSort,
  });

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  const setSort = useCallback((field: string, order?: 'asc' | 'desc') => {
    setSortState({ field, order: order ?? 'asc' });
    setPage(1);
  }, []);

  const toggleSort = useCallback((field: string) => {
    setSortState(prev => {
      if (prev.field === field) {
        return { field, order: prev.order === 'asc' ? 'desc' : 'asc' };
      }
      return { field, order: 'asc' };
    });
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setSearchState('');
    setPage(1);
    setSortState({ ...defaultSort });
  }, [defaultFilters, defaultSort]);

  const hasActiveFilters = useMemo(() => {
    if (search.trim() !== '') return true;
    for (const key of Object.keys(defaultFilters) as (keyof T)[]) {
      if (filters[key] !== defaultFilters[key]) return true;
    }
    return false;
  }, [filters, search, defaultFilters]);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: sort.field,
      sortOrder: sort.order,
    });

    if (search.trim()) {
      params.set('search', search.trim());
    }

    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    }

    return params.toString();
  }, [page, limit, sort, search, filters]);

  return {
    filters,
    setFilter,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    sort,
    setSort,
    toggleSort,
    resetFilters,
    hasActiveFilters,
    buildQueryString,
  };
}
