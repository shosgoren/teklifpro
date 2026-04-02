'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useConfirm } from '@/shared/components/confirm-dialog';
import useSWR from 'swr';
import {
  Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown, AlertTriangle,
  LayoutGrid, List, Package, TrendingUp, TrendingDown, Percent,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/shared/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/presentation/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

interface Product {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  productType: string;
  unit: string;
  listPrice: number;
  costPrice: number;
  laborCost: number;
  overheadRate: number;
  vatRate: number;
  isActive: boolean;
  description: string | null;
  trackStock: boolean;
  stockQuantity: number;
  minStockLevel: number;
  syncedFromParasut: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  imageUrl: string | null;
}

type FilterProductType = 'all' | string;
type ViewMode = 'table' | 'grid';

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  RAW_MATERIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SEMI_FINISHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CONSUMABLE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const VIEW_MODE_KEY = 'teklifpro-products-view';

const isLowStock = (product: Product) =>
  product.trackStock && product.minStockLevel > 0 && product.stockQuantity < product.minStockLevel;

// ─── Stock Level Bar ───
function StockBar({ product }: { product: Product }) {
  if (!product.trackStock || product.minStockLevel <= 0) return null;

  const ratio = product.minStockLevel > 0 ? product.stockQuantity / product.minStockLevel : 1;
  const percentage = Math.min(ratio * 100, 100);
  const color = ratio >= 1.5
    ? 'bg-emerald-500'
    : ratio >= 1
      ? 'bg-emerald-400'
      : ratio >= 0.5
        ? 'bg-amber-400'
        : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn(
        'text-xs font-medium tabular-nums',
        ratio < 0.5 ? 'text-red-600 dark:text-red-400' : ratio < 1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
      )}>
        {product.stockQuantity}
      </span>
      {isLowStock(product) && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
    </div>
  );
}

// ─── Product Thumbnail ───
function ProductThumbnail({ product, size = 'sm' }: { product: Product; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-14 h-14';
  const textSize = size === 'sm' ? 'text-xs' : 'text-lg';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  if (product.imageUrl) {
    return (
      <div className={cn(dim, 'rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0')}>
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const colors: Record<string, string> = {
    COMMERCIAL: 'from-blue-400 to-blue-600',
    RAW_MATERIAL: 'from-amber-400 to-amber-600',
    SEMI_FINISHED: 'from-purple-400 to-purple-600',
    CONSUMABLE: 'from-slate-400 to-slate-600',
  };

  return (
    <div className={cn(dim, 'rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', colors[product.productType] || colors.COMMERCIAL)}>
      <Package className={cn(iconSize, 'text-white/80')} />
    </div>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('productsPage');
  const confirm = useConfirm();

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

  const [searchQuery, setSearchQuery] = useState('');
  const [filterProductType, setFilterProductType] = useState<FilterProductType>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'table';
    }
    return 'table';
  });
  const [bulkPrice, setBulkPrice] = useState({ percentage: 10, field: 'listPrice' as const, category: '', productType: '' });
  const [newProduct, setNewProduct] = useState({
    code: '', name: '', category: '', productType: 'COMMERCIAL', unit: 'Adet',
    listPrice: 0, costPrice: 0, minStockLevel: 0, vatRate: 18, description: '',
  });
  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(filterProductType !== 'all' && { productType: filterProductType }),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/products?${queryParams.toString()}`,
    fetcher
  );

  const products: Product[] = data?.data?.products ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, pages: 1, page: 1 };
  const totalPages = pagination.pages;

  const toggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    setCurrentPage(1);
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['products'] }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('syncSuccess', { count: data.data.syncedCount }));
        mutate();
      } else {
        toast.error(data.error || t('genericError'));
      }
    } catch {
      toast.error(t('syncError'));
    } finally {
      setIsSyncing(false);
    }
  }, [mutate, t]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    const ok = await confirm({ message: t('deleteConfirm'), confirmText: t('deleteBtn'), variant: 'danger' });
    if (!ok) return;
    try {
      await fetch(`/api/v1/products/${productId}`, { method: 'DELETE' });
      toast.success(t('deleteSuccess'));
      mutate();
    } catch {
      toast.error(t('deleteError'));
    }
  }, [mutate, confirm, t]);

  const handleAddProduct = useCallback(async () => {
    if (!newProduct.code || !newProduct.name || !newProduct.unit) {
      toast.error(t('requiredFields'));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          listPrice: Number(newProduct.listPrice),
          costPrice: Number(newProduct.costPrice),
          minStockLevel: Number(newProduct.minStockLevel),
          vatRate: Number(newProduct.vatRate),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('addSuccess', { name: newProduct.name }));
        setNewProduct({ code: '', name: '', category: '', productType: 'COMMERCIAL', unit: 'Adet', listPrice: 0, costPrice: 0, minStockLevel: 0, vatRate: 18, description: '' });
        setIsAddDialogOpen(false);
        mutate();
      } else {
        toast.error(data.error || t('addError'));
      }
    } catch {
      toast.error(t('addError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [newProduct, mutate, t]);

  const handleBulkPriceUpdate = useCallback(async () => {
    const direction = bulkPrice.percentage >= 0 ? t('bulkIncrease') : t('bulkDecrease');
    const ok = await confirm({
      title: t('bulkPriceTitle'),
      message: t('bulkPriceConfirm', { direction, percentage: Math.abs(bulkPrice.percentage) }),
      confirmText: t('bulkPriceApply'),
      variant: 'warning',
    });
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const body: any = { percentage: bulkPrice.percentage, field: bulkPrice.field };
      if (bulkPrice.category) body.category = bulkPrice.category;
      if (bulkPrice.productType) body.productType = bulkPrice.productType;

      const res = await fetch('/api/v1/products/bulk-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('bulkPriceSuccess', { count: data.data.updatedCount }));
        setIsBulkPriceOpen(false);
        mutate();
      } else {
        toast.error(data.error || t('genericError'));
      }
    } catch {
      toast.error(t('genericError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [bulkPrice, mutate, confirm, t]);

  const formatPrice = (price: number) =>
    (price || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-16 pb-8 px-4 md:px-8 md:pt-[72px]">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl" />
            <div className="h-4 w-64 bg-white/10 animate-pulse rounded-lg mt-2" />
            <div className="h-11 bg-white/10 animate-pulse rounded-xl mt-4" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-gray-900 animate-pulse rounded-xl shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-16 pb-8 px-4 md:px-8 md:pt-[72px]">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
            <p className="text-white/70 text-sm mt-1">Ürün kataloğunu yönet</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-4">
          <div className="text-center py-12 text-red-600 bg-white dark:bg-gray-900 rounded-xl shadow-sm">{t('errorLoad')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-24 md:pb-6">
      {/* Gradient Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 pt-16 pb-8 px-4 md:px-8 md:pt-[72px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto space-y-4">
          {/* Subtitle + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-white/70 text-sm">Ürün kataloğunu yönet</p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setIsBulkPriceOpen(true)} size="sm"
                className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <Percent className="mr-2 h-4 w-4" />
                {t('bulkPrice')}
              </Button>
              <Button onClick={handleSync} disabled={isSyncing} size="sm"
                className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
                {t('sync')}
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm"
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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
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
                    onCheckedChange={() => { setFilterProductType(opt.value); setCurrentPage(1); }}>
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Toggle */}
            <div className="hidden md:flex items-center border border-white/20 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleViewMode('table')}
                className={cn('p-2.5 transition-colors', viewMode === 'table' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleViewMode('grid')}
                className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-4 space-y-6">

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('noProducts')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('noProductsHint')}</p>
        </div>
      ) : (
        <>
          {/* ─── GRID VIEW ─── */}
          {(viewMode === 'grid' || typeof window !== 'undefined' && window.innerWidth < 768) && viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => router.push(`/${locale}/products/${product.id}`)}
                  className="rounded-2xl border bg-card p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group relative overflow-hidden"
                >
                  {/* Actions dropdown */}
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-sm">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/products/${product.id}`); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Thumbnail */}
                  <div className="flex justify-center mb-3">
                    <ProductThumbnail product={product} size="md" />
                  </div>

                  {/* Info */}
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.code ?? t('noCode')}</p>
                  </div>

                  {/* Price + Badge */}
                  <div className="mt-3 flex items-center justify-between">
                    <Badge className={cn('text-[10px] border-0', PRODUCT_TYPE_COLORS[product.productType] || 'bg-gray-100 text-gray-800')}>
                      {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                    </Badge>
                    <p className="font-bold text-sm">{formatPrice(product.listPrice)}</p>
                  </div>

                  {/* Stock bar */}
                  {product.trackStock && product.minStockLevel > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{t('stock')}</span>
                        <span>{product.stockQuantity} / {product.minStockLevel}</span>
                      </div>
                      <StockBar product={product} />
                    </div>
                  )}

                  {/* Status indicators */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className={cn('h-1.5 w-1.5 rounded-full', product.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                    {product.syncedFromParasut && (
                      <span className="text-[10px] text-muted-foreground">Paraşüt</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ─── MOBILE CARD VIEW ─── */}
              <div className="rounded-2xl border bg-card overflow-hidden divide-y md:hidden">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/${locale}/products/${product.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <ProductThumbnail product={product} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.code ?? t('noCode')}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/products/${product.id}`); }}>
                            <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-xs border-0', PRODUCT_TYPE_COLORS[product.productType] || 'bg-gray-100 text-gray-800')}>
                          {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                        </Badge>
                        {product.trackStock && product.minStockLevel > 0 && <StockBar product={product} />}
                        <span className="text-xs text-muted-foreground">{product.unit} • KDV %{product.vatRate}</span>
                      </div>
                      <p className="font-semibold text-sm">{formatPrice(product.listPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── DESKTOP TABLE VIEW ─── */}
              <div className="hidden md:block overflow-hidden rounded-2xl border bg-card">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="whitespace-nowrap">{t('productCode')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('productName')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('type')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('unit')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('stockHeader')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('cost')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('listPrice')}</TableHead>
                        <TableHead className="text-center whitespace-nowrap">{t('vatRate')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('status')}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow
                          key={product.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/${locale}/products/${product.id}`)}
                        >
                          <TableCell>
                            <ProductThumbnail product={product} size="sm" />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{product.code ?? '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="max-w-xs truncate">{product.name}</span>
                              {product.syncedFromParasut && (
                                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Paraşüt" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs border-0', PRODUCT_TYPE_COLORS[product.productType] || 'bg-gray-100 text-gray-800')}>
                              {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{product.unit}</TableCell>
                          <TableCell>
                            <StockBar product={product} />
                            {!product.trackStock && <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">{product.costPrice > 0 ? formatPrice(product.costPrice) : '-'}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatPrice(product.listPrice)}</TableCell>
                          <TableCell className="text-center text-sm">%{product.vatRate}</TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? t('active') : t('inactive')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/products/${product.id}`); }}>
                                  <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t('total')} {pagination.total} {t('productCount')} · {t('page')} {currentPage}/{totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              {t('previous')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
              {t('next')}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Add Product Dialog ─── */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-code">{t('productCodeLabel')}</Label>
              <Input id="product-code" placeholder={t('productCodePlaceholder')} value={newProduct.code}
                onChange={(e) => setNewProduct((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-name">{t('productNameLabel')}</Label>
              <Input id="product-name" placeholder={t('productNamePlaceholder')} value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-type">{t('productTypeLabel')}</Label>
              <select id="product-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.productType} onChange={(e) => setNewProduct((p) => ({ ...p, productType: e.target.value }))}>
                <option value="COMMERCIAL">{t('commercial')}</option>
                <option value="RAW_MATERIAL">{t('rawMaterial')}</option>
                <option value="SEMI_FINISHED">{t('semiFinished')}</option>
                <option value="CONSUMABLE">{t('consumable')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-category">{t('category')}</Label>
              <select id="product-category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}>
                <option value="">{t('selectCategory')}</option>
                <option value="Yazılım">{t('software')}</option>
                <option value="Hizmet">{t('service')}</option>
                <option value="Donanım">{t('hardware')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-unit">{t('unitLabel')}</Label>
              <select id="product-unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.unit} onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))}>
                <option value="Adet">{t('unitPiece')}</option>
                <option value="Saat">{t('unitHour')}</option>
                <option value="Gün">{t('unitDay')}</option>
                <option value="Ay">{t('unitMonth')}</option>
                <option value="Yıl">{t('unitYear')}</option>
                <option value="Paket">{t('unitPackage')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product-price">{t('listPriceLabel')}</Label>
                <Input id="product-price" type="number" min="0" step="0.01" placeholder="0.00"
                  value={newProduct.listPrice || ''} onChange={(e) => setNewProduct((p) => ({ ...p, listPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-vat">{t('vatRateLabel')}</Label>
                <select id="product-vat" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newProduct.vatRate} onChange={(e) => setNewProduct((p) => ({ ...p, vatRate: parseInt(e.target.value) }))}>
                  <option value={0}>%0</option>
                  <option value={1}>%1</option>
                  <option value={8}>%8</option>
                  <option value={10}>%10</option>
                  <option value={18}>%18</option>
                  <option value={20}>%20</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-description">{t('descriptionLabel')}</Label>
              <textarea id="product-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('descriptionPlaceholder')} value={newProduct.description}
                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? t('adding') : t('addProduct')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Price Dialog ─── */}
      <Dialog open={isBulkPriceOpen} onOpenChange={setIsBulkPriceOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('bulkPriceTitle')}</DialogTitle>
            <DialogDescription>{t('bulkPriceDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('bulkPriceField')}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bulkPrice.field} onChange={(e) => setBulkPrice((p) => ({ ...p, field: e.target.value as any }))}>
                <option value="listPrice">{t('listPrice')}</option>
                <option value="costPrice">{t('cost')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{t('bulkPricePercent')}</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className={cn('rounded-lg', bulkPrice.percentage > 0 && 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300')}
                  onClick={() => setBulkPrice((p) => ({ ...p, percentage: Math.abs(p.percentage) }))}>
                  <TrendingUp className="h-4 w-4 mr-1" /> {t('bulkIncrease')}
                </Button>
                <Button variant="outline" size="sm" className={cn('rounded-lg', bulkPrice.percentage < 0 && 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300')}
                  onClick={() => setBulkPrice((p) => ({ ...p, percentage: -Math.abs(p.percentage) }))}>
                  <TrendingDown className="h-4 w-4 mr-1" /> {t('bulkDecrease')}
                </Button>
              </div>
              <Input type="number" min="1" max="100" value={Math.abs(bulkPrice.percentage)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setBulkPrice((p) => ({ ...p, percentage: p.percentage >= 0 ? val : -val }));
                }}
                className="text-center text-lg font-bold" />
              <p className="text-xs text-muted-foreground text-center">
                {bulkPrice.percentage >= 0 ? '+' : ''}{bulkPrice.percentage}%
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{t('bulkPriceFilter')}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bulkPrice.productType} onChange={(e) => setBulkPrice((p) => ({ ...p, productType: e.target.value }))}>
                <option value="">{t('all')}</option>
                <option value="COMMERCIAL">{t('commercial')}</option>
                <option value="RAW_MATERIAL">{t('rawMaterial')}</option>
                <option value="SEMI_FINISHED">{t('semiFinished')}</option>
                <option value="CONSUMABLE">{t('consumable')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{t('category')}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bulkPrice.category} onChange={(e) => setBulkPrice((p) => ({ ...p, category: e.target.value }))}>
                <option value="">{t('all')}</option>
                <option value="Yazılım">{t('software')}</option>
                <option value="Hizmet">{t('service')}</option>
                <option value="Donanım">{t('hardware')}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkPriceOpen(false)} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={handleBulkPriceUpdate} disabled={isSubmitting}
              className={cn(bulkPrice.percentage >= 0
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700', 'text-white')}>
              {isSubmitting ? '...' : t('bulkPriceApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
