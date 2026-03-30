'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Users,
  Package,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Arama sonucu veri yapısı
 */
interface SearchResult {
  id: string;
  type: 'proposal' | 'customer' | 'product';
  title: string;
  subtitle: string;
  highlight: string;
  url: string;
  metadata: Record<string, any>;
}

/**
 * Arama yanıt veri yapısı
 */
interface SearchResponse {
  success: boolean;
  data?: {
    query: string;
    total: number;
    results: SearchResult[];
    facets: {
      proposals: number;
      customers: number;
      products: number;
    };
  };
  error?: string;
}

/**
 * Son aramaları depolamak için yerel depolama anahtarı
 */
const RECENT_SEARCHES_KEY = 'teklifpro:recent-searches';

/**
 * Tür simgesi ve rengini döndür
 */
function getTypeIcon(type: 'proposal' | 'customer' | 'product') {
  switch (type) {
    case 'proposal':
      return <FileText className="w-4 h-4 text-blue-500" />;
    case 'customer':
      return <Users className="w-4 h-4 text-green-500" />;
    case 'product':
      return <Package className="w-4 h-4 text-orange-500" />;
    default:
      return null;
  }
}

/**
 * Tür etiket rengini döndür
 */
function getTypeBadgeVariant(type: 'proposal' | 'customer' | 'product') {
  switch (type) {
    case 'proposal':
      return 'default';
    case 'customer':
      return 'secondary';
    case 'product':
      return 'outline';
    default:
      return 'default';
  }
}

/**
 * Tür etiket metnini döndür (Türkçe)
 */
function getTypeLabel(type: 'proposal' | 'customer' | 'product') {
  switch (type) {
    case 'proposal':
      return 'Teklif';
    case 'customer':
      return 'Müşteri';
    case 'product':
      return 'Ürün';
    default:
      return '';
  }
}

/**
 * Yükleme iskeletonu bileşeni
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-12 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-md animate-pulse"
        />
      ))}
    </div>
  );
}

/**
 * Boş durum bileşeni
 */
function EmptyState({ query }: { query?: string }) {
  if (query) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mb-3" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Sonuç bulunamadı
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          "{query}" için eşleşen öğe yok
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Arama yapmaya başlayın...
      </p>
    </div>
  );
}

/**
 * Son aramalar bileşeni
 */
function RecentSearches({
  searches,
  onSelect,
}: {
  searches: string[];
  onSelect: (query: string) => void;
}) {
  if (searches.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
        Son Aramalar
      </p>
      <div className="space-y-1">
        {searches.map((search, index) => (
          <button
            key={index}
            onClick={() => onSelect(search)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="truncate">{search}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Sonuçlar grubunu gösteren bileşen
 */
function ResultGroup({
  title,
  results,
  highlighted,
  onSelect,
}: {
  title: string;
  results: SearchResult[];
  highlighted: number;
  onSelect: (result: SearchResult) => void;
}) {
  if (results.length === 0) return null;

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 py-3">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide px-4 mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {results.map((result, index) => (
          <button
            key={result.id}
            onClick={() => onSelect(result)}
            className={cn(
              'w-full flex items-start gap-3 px-4 py-2 text-left text-sm rounded-md transition-colors',
              highlighted === index + 1
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'hover:bg-slate-50 dark:hover:bg-slate-900'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getTypeIcon(result.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {result.title}
                </span>
                <Badge variant={getTypeBadgeVariant(result.type)} className="text-xs flex-shrink-0">
                  {getTypeLabel(result.type)}
                </Badge>
              </div>
              {result.subtitle && (
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {result.subtitle}
                </p>
              )}
              {result.highlight && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 line-clamp-2">
                  {result.highlight}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * GlobalSearch - Genel Arama Komponenti
 *
 * Özellikler:
 * - Cmd+K / Ctrl+K kısayolu ile açılır
 * - Debounced arama (300ms)
 * - Türe göre gruplandırılmış sonuçlar
 * - Klavye navigasyonu (ok tuşları + enter)
 * - Son 5 aramayı depolar
 * - Yükleme durumu ve boş durum gösterileri
 * - Responsive ve dark mode desteği
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Son aramaları yükle
   */
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch {
        // Yerel depolama okuması başarısız oldu
      }
    }
  }, []);

  /**
   * Arama işlemini gerçekleştir
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHighlightedIndex(-1);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Arama başarısız');
      }

      const data: SearchResponse = await response.json();
      if (data.success && data.data) {
        setResults(data.data.results);
        setHighlightedIndex(-1);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sorgu değiştiğinde debounced aramaları tetikle
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setHighlightedIndex(-1);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  /**
   * Klavye kısayollarını işle
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K veya Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  /**
   * Dialog açıldığında input'a odaklan
   */
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  /**
   * Sonuç navigasyonu ile uğraş
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allResults = results;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > -1 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allResults.length) {
          selectResult(allResults[highlightedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;

      default:
        break;
    }
  };

  /**
   * Sonuç seç ve yönlendir
   */
  const selectResult = (result: SearchResult) => {
    // Son aramaları güncelle
    const updated = [
      query,
      ...recentSearches.filter((s) => s !== query),
    ].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));

    // Sonucu seç ve yönlendir
    router.push(result.url);
    setOpen(false);
    setQuery('');
  };

  /**
   * Son arama seç
   */
  const selectRecentSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery);
  };

  /**
   * Sonuçları türe göre grupla
   */
  const proposalResults = results.filter((r) => r.type === 'proposal');
  const customerResults = results.filter((r) => r.type === 'customer');
  const productResults = results.filter((r) => r.type === 'product');

  const totalResultCount =
    proposalResults.length + customerResults.length + productResults.length;
  let currentIndex = 0;

  return (
    <>
      {/* Arama tetikleyici butonu */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
        title="Cmd+K veya Ctrl+K ile aç"
      >
        <span className="hidden sm:inline">Ara...</span>
        <kbd className="hidden sm:inline px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded">
          ⌘K
        </kbd>
      </button>

      {/* Arama dialog'u */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] sm:w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Genel Arama</DialogTitle>
          </DialogHeader>

          {/* Arama input'u */}
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Teklif, müşteri veya ürün ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-base"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Sonuçlar ve durumlar */}
          <div className="mt-4 max-h-[400px] overflow-y-auto">
            {loading && !results.length ? (
              <LoadingSkeleton />
            ) : totalResultCount === 0 && query.trim().length >= 2 ? (
              <EmptyState query={query} />
            ) : totalResultCount === 0 && query.trim().length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {proposalResults.length > 0 && (
                  <ResultGroup
                    title="Teklifler"
                    results={proposalResults}
                    highlighted={
                      highlightedIndex >= 0 && highlightedIndex < proposalResults.length
                        ? highlightedIndex + 1
                        : -1
                    }
                    onSelect={selectResult}
                  />
                )}

                {customerResults.length > 0 && (
                  <ResultGroup
                    title="Müşteriler"
                    results={customerResults}
                    highlighted={
                      highlightedIndex >= proposalResults.length &&
                      highlightedIndex <
                        proposalResults.length + customerResults.length
                        ? highlightedIndex - proposalResults.length + 1
                        : -1
                    }
                    onSelect={selectResult}
                  />
                )}

                {productResults.length > 0 && (
                  <ResultGroup
                    title="Ürünler"
                    results={productResults}
                    highlighted={
                      highlightedIndex >=
                        proposalResults.length + customerResults.length
                        ? highlightedIndex -
                          proposalResults.length -
                          customerResults.length +
                          1
                        : -1
                    }
                    onSelect={selectResult}
                  />
                )}

                <RecentSearches
                  searches={recentSearches}
                  onSelect={selectRecentSearch}
                />
              </>
            )}
          </div>

          {/* Yardım metni */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              <kbd className="px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs">
                ↑↓
              </kbd>
              {' '}
              Gezin{' '}
              <kbd className="ml-2 px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs">
                ⏎
              </kbd>
              {' '}
              Seç{' '}
              <kbd className="ml-2 px-1.5 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs">
                esc
              </kbd>
              {' '}
              Kapat
            </span>
            {totalResultCount > 0 && (
              <span>
                {results.length} sonuç gösteriliyor
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default GlobalSearch;
