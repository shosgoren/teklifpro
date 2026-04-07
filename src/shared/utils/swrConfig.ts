import type { SWRConfiguration } from 'swr';

/**
 * Default SWR options for standard data fetching (lists, detail pages).
 * Revalidates on focus and reconnect; deduplicates requests within 5s.
 */
export const swrDefaultOptions: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

/**
 * SWR options for static / rarely-changing data (product meta, categories, settings).
 * Longer deduping interval, no revalidation on focus to reduce unnecessary requests.
 */
export const swrStaticOptions: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30000,
};

/**
 * SWR options for real-time / frequently-updated data (proposal detail with live status).
 * Keeps existing refreshInterval; adds standard revalidation.
 */
export const swrRealtimeOptions = (refreshInterval: number): SWRConfiguration => ({
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  refreshInterval,
});
