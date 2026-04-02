'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  Search,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Factory,
  Loader2,
  Package,
  XCircle,
  Wallet,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Label } from '@/presentation/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

// ── Types ──────────────────────────────────────────────

interface StockProduct {
  id: string;
  code: string | null;
  name: string;
  productType: string;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  costPrice: number;
  trackStock: boolean;
}

interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minLevel: number;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
  };
}

type ProductTypeFilter = 'all' | 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'COMMERCIAL';
type MovementDialogType = 'IN' | 'OUT' | null;

// ── Constants ──────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data.success) throw new Error(data.error || 'API error');
      return data;
    });

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  RAW_MATERIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SEMI_FINISHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CONSUMABLE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const isLowStock = (p: StockProduct) =>
  p.trackStock && p.minStockLevel > 0 && p.stockQuantity < p.minStockLevel;

const isOutOfStock = (p: StockProduct) =>
  p.trackStock && p.stockQuantity <= 0;

// ── Component ──────────────────────────────────────────

export default function StockPage() {
  const t = useTranslations('stockPage');

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    COMMERCIAL: t('commercial'),
    RAW_MATERIAL: t('rawMaterial'),
    SEMI_FINISHED: t('semiFinished'),
    CONSUMABLE: t('consumable'),
  };

  const PRODUCT_TYPE_OPTIONS: { value: ProductTypeFilter; label: string }[] = [
    { value: 'all', label: t('all') },
    { value: 'RAW_MATERIAL', label: t('rawMaterial') },
    { value: 'SEMI_FINISHED', label: t('semiFinished') },
    { value: 'CONSUMABLE', label: t('consumable') },
    { value: 'COMMERCIAL', label: t('commercial') },
  ];

  const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    IN: { label: t('movement.in'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    OUT: { label: t('movement.out'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    ADJUSTMENT: { label: t('movement.adjustment'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    PRODUCTION_IN: { label: t('movement.productionIn'), color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    PRODUCTION_OUT: { label: t('movement.productionOut'), color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ProductTypeFilter>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // UI state
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [movementDialogType, setMovementDialogType] = useState<MovementDialogType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Movement form
  const [movementForm, setMovementForm] = useState({
    productId: '',
    productSearch: '',
    quantity: '',
    unitPrice: '',
    reference: '',
    notes: '',
  });

  // ── Data fetching ──

  const stockParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(filterType !== 'all' && { type: filterType }),
    ...(lowStockOnly && { lowStock: 'true' }),
  });

  const { data: stockData, error: stockError, isLoading: stockLoading, mutate: mutateStock } = useSWR(
    `/api/v1/stock?${stockParams.toString()}`,
    fetcher
  );

  const { data: alertsData } = useSWR('/api/v1/stock/alerts', fetcher);

  const { data: movementsData } = useSWR(
    selectedProduct ? `/api/v1/stock/movements?productId=${selectedProduct.id}&limit=10` : null,
    fetcher
  );

  // Product search for movement dialog
  const { data: productSearchData } = useSWR(
    movementDialogType && movementForm.productSearch.length >= 2
      ? `/api/v1/stock?search=${encodeURIComponent(movementForm.productSearch)}&limit=10`
      : null,
    fetcher
  );

  const products: StockProduct[] = stockData?.data?.products ?? stockData?.data?.items ?? [];
  const pagination = stockData?.data?.pagination ?? { total: 0, pages: 1, page: 1 };
  const totalPages = pagination.pages;
  const alerts: StockAlert[] = alertsData?.data?.alerts ?? alertsData?.data ?? [];
  const movements: StockMovement[] = movementsData?.data?.movements ?? movementsData?.data ?? [];
  const searchProducts: StockProduct[] = productSearchData?.data?.products ?? productSearchData?.data?.items ?? [];

  // ── KPI computations ──

  const kpiData = useMemo(() => {
    const totalProducts = pagination.total || products.length;
    const lowStockCount = alerts.length;
    const outOfStockCount = products.filter(isOutOfStock).length;
    const totalValue = products.reduce((sum, p) => sum + p.stockQuantity * p.costPrice, 0);
    return { totalProducts, lowStockCount, outOfStockCount, totalValue };
  }, [pagination.total, products, alerts]);

  // ── Handlers ──

  const resetMovementForm = useCallback(() => {
    setMovementForm({
      productId: '',
      productSearch: '',
      quantity: '',
      unitPrice: '',
      reference: '',
      notes: '',
    });
  }, []);

  const openMovementDialog = useCallback(
    (type: 'IN' | 'OUT') => {
      resetMovementForm();
      setMovementDialogType(type);
    },
    [resetMovementForm]
  );

  const handleMovementSubmit = useCallback(async () => {
    if (!movementForm.productId) {
      toast.error(t('productRequired'));
      return;
    }
    if (!movementForm.quantity || Number(movementForm.quantity) <= 0) {
      toast.error(t('quantityRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: movementForm.productId,
          type: movementDialogType,
          quantity: Number(movementForm.quantity),
          ...(movementForm.unitPrice && { unitPrice: Number(movementForm.unitPrice) }),
          ...(movementForm.reference && { reference: movementForm.reference }),
          ...(movementForm.notes && { notes: movementForm.notes }),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('movementSuccess'));
        setMovementDialogType(null);
        resetMovementForm();
        mutateStock();
      } else {
        toast.error(data.error || t('movementError'));
      }
    } catch {
      toast.error(t('movementError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [movementForm, movementDialogType, resetMovementForm, mutateStock]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setCurrentPage(1);
    },
    []
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));

  const getStockLevel = (product: StockProduct) => {
    if (isOutOfStock(product)) return 'critical';
    if (isLowStock(product)) return 'low';
    return 'ok';
  };

  const stockLevelBorder: Record<string, string> = {
    ok: 'border-l-emerald-500',
    low: 'border-l-amber-500',
    critical: 'border-l-red-500',
  };

  // ── Loading skeleton ──

  if (stockLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
        {/* KPI card skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        {/* Search bar skeleton */}
        <div className="h-11 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/60" />
        {/* Table skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/40" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('kpi.trackedProducts')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => openMovementDialog('IN')}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25"
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            {t('stockIn')}
          </Button>
          <Button
            onClick={() => openMovementDialog('OUT')}
            className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/25"
          >
            <PackageMinus className="mr-2 h-4 w-4" />
            {t('stockOut')}
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total products */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 md:p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
          <div className="relative">
            <div className="flex items-center gap-2 text-blue-100 text-xs font-medium">
              <Package className="h-3.5 w-3.5" />
              {t('kpi.totalProducts')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2 tracking-tight">
              {kpiData.totalProducts}
            </p>
            <p className="text-xs text-blue-200 mt-1">{t('kpi.trackedProducts')}</p>
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-4 md:p-5 text-white shadow-lg shadow-orange-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
          <div className="relative">
            <div className="flex items-center gap-2 text-orange-100 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('kpi.lowStockAlerts')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2 tracking-tight">
              {kpiData.lowStockCount}
            </p>
            <p className="text-xs text-orange-200 mt-1">{t('kpi.productsBelowMin')}</p>
          </div>
        </div>

        {/* Total stock value */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 md:p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" />
              {t('kpi.totalStockValue')}
            </div>
            <p className="text-lg md:text-xl font-bold mt-2 tracking-tight">
              {formatCurrency(kpiData.totalValue)}
            </p>
            <p className="text-xs text-emerald-200 mt-1">{t('kpi.basedOnCost')}</p>
          </div>
        </div>

        {/* Out of stock */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 p-4 md:p-5 text-white shadow-lg shadow-rose-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
          <div className="absolute bottom-0 left-0 w-14 h-14 bg-white/5 rounded-full translate-y-4 -translate-x-4" />
          <div className="relative">
            <div className="flex items-center gap-2 text-rose-100 text-xs font-medium">
              <XCircle className="h-3.5 w-3.5" />
              {t('kpi.outOfStock')}
            </div>
            <p className="text-xl md:text-2xl font-bold mt-2 tracking-tight">
              {kpiData.outOfStockCount}
            </p>
            <p className="text-xs text-rose-200 mt-1">{t('kpi.needsRestock')}</p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500/20"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between rounded-xl">
              {PRODUCT_TYPE_OPTIONS.find((o) => o.value === filterType)?.label ?? t('all')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PRODUCT_TYPE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => {
                  setFilterType(opt.value);
                  setCurrentPage(1);
                }}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          onClick={() => {
            setLowStockOnly(!lowStockOnly);
            setCurrentPage(1);
          }}
          className={cn(
            'rounded-xl',
            lowStockOnly && 'bg-orange-600 hover:bg-orange-700 text-white'
          )}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          {t('lowStockOnly')}
        </Button>
      </div>

      {/* ── Error ── */}
      {stockError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {t('movementError')}
        </div>
      )}

      {/* ── Empty State ── */}
      {!stockLoading && !stockError && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/40">
              <Package className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('noProducts')}
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
            {t('noProductsFiltered')}
          </p>
          <Button
            onClick={() => openMovementDialog('IN')}
            className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25"
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            {t('stockIn')}
          </Button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      {!stockLoading && !stockError && products.length > 0 && (
        <div className="hidden md:block rounded-2xl border dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-900/50">
                <TableHead>{t('table.product')}</TableHead>
                <TableHead>{t('table.product')}</TableHead>
                <TableHead>{t('table.type')}</TableHead>
                <TableHead>{t('detail.unit')}</TableHead>
                <TableHead className="text-right">{t('table.stock')}</TableHead>
                <TableHead className="text-right">{t('table.minLevel')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead className="text-right">{t('table.costPrice')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const level = getStockLevel(product);
                return (
                  <TableRow
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/30',
                      level === 'critical' && 'bg-red-50/40 dark:bg-red-950/20',
                      level === 'low' && 'bg-amber-50/40 dark:bg-amber-950/20'
                    )}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{product.name}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">{product.code ?? '-'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', PRODUCT_TYPE_COLORS[product.productType])}>
                        {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{product.unit}</TableCell>
                    <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">{product.stockQuantity}</TableCell>
                    <TableCell className="text-right text-gray-500 dark:text-gray-400">{product.minStockLevel}</TableCell>
                    <TableCell>
                      {level === 'critical' ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <XCircle className="mr-1 h-3 w-3" />
                          {t('table.outOfStock')}
                        </Badge>
                      ) : level === 'low' ? (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {t('table.low')}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t('table.ok')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">{formatCurrency(product.costPrice)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Mobile Cards ── */}
      {!stockLoading && !stockError && products.length > 0 && (
        <div className="flex flex-col gap-3 md:hidden">
          {products.map((product) => {
            const level = getStockLevel(product);
            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={cn(
                  'cursor-pointer rounded-2xl bg-white dark:bg-gray-900 shadow-md p-4 transition-all hover:shadow-lg border-l-4',
                  stockLevelBorder[level]
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {product.code ?? '-'}
                    </p>
                  </div>
                  {level === 'critical' ? (
                    <Badge className="ml-2 shrink-0 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <XCircle className="mr-1 h-3 w-3" />
                      {t('table.outOfStock')}
                    </Badge>
                  ) : level === 'low' ? (
                    <Badge className="ml-2 shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {t('table.low')}
                    </Badge>
                  ) : (
                    <Badge className="ml-2 shrink-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {t('table.ok')}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('table.stock')}</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {product.stockQuantity} {product.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('table.minLevel')}</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{product.minStockLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('table.costPrice')}</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(product.costPrice)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge className={cn('text-xs', PRODUCT_TYPE_COLORS[product.productType])}>
                    {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('total')} {pagination.total} {t('productCount')}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-xl"
            >
              {t('previous')}
            </Button>
            <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-xl"
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Stock Movement Dialog ── */}
      <Dialog
        open={movementDialogType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMovementDialogType(null);
            resetMovementForm();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {movementDialogType === 'IN' ? t('movement.stockInTitle') : t('movement.stockOutTitle')}
            </DialogTitle>
            <DialogDescription>
              {movementDialogType === 'IN'
                ? t('movement.stockInDesc')
                : t('movement.stockOutDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Product selector */}
            <div className="flex flex-col gap-2">
              <Label>{t('selectProduct')}</Label>
              <div className="relative">
                <Input
                  placeholder={t('movement.searchProduct')}
                  value={movementForm.productSearch}
                  onChange={(e) =>
                    setMovementForm((f) => ({
                      ...f,
                      productSearch: e.target.value,
                      productId: '',
                    }))
                  }
                  className="rounded-xl bg-gray-50 dark:bg-gray-900"
                />
                {movementForm.productSearch.length >= 2 &&
                  !movementForm.productId &&
                  searchProducts.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
                      {searchProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          onClick={() =>
                            setMovementForm((f) => ({
                              ...f,
                              productId: p.id,
                              productSearch: `${p.name}${p.code ? ` (${p.code})` : ''}`,
                            }))
                          }
                        >
                          <span className="text-gray-900 dark:text-gray-100">{p.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{p.code ?? ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <Label>{t('movement.quantity')}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))}
                className="rounded-xl bg-gray-50 dark:bg-gray-900"
              />
            </div>

            {/* Unit price */}
            <div className="flex flex-col gap-2">
              <Label>{t('movement.unitPrice')}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={t('movement.notesPlaceholder')}
                value={movementForm.unitPrice}
                onChange={(e) => setMovementForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="rounded-xl bg-gray-50 dark:bg-gray-900"
              />
            </div>

            {/* Reference */}
            <div className="flex flex-col gap-2">
              <Label>{t('movement.reference')}</Label>
              <Input
                placeholder={t('movement.referencePlaceholder')}
                value={movementForm.reference}
                onChange={(e) => setMovementForm((f) => ({ ...f, reference: e.target.value }))}
                className="rounded-xl bg-gray-50 dark:bg-gray-900"
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <Label>{t('movement.notes')}</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={t('movement.notesPlaceholder')}
                value={movementForm.notes}
                onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setMovementDialogType(null);
                resetMovementForm();
              }}
            >
              {t('movement.cancel')}
            </Button>
            <Button
              onClick={handleMovementSubmit}
              disabled={isSubmitting || !movementForm.productId || !movementForm.quantity}
              className={cn(
                'rounded-xl',
                movementDialogType === 'IN'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white'
              )}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t('movement.submitting') : movementDialogType === 'IN' ? t('movement.submitIn') : t('movement.submitOut')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Product Detail Sheet ── */}
      <Sheet
        open={selectedProduct !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedProduct.name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-6">
                {/* Product Info */}
                <div className="rounded-2xl border p-4 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('table.product')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('table.product')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedProduct.code ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('table.type')}</p>
                      <Badge className={cn('text-xs', PRODUCT_TYPE_COLORS[selectedProduct.productType])}>
                        {PRODUCT_TYPE_LABELS[selectedProduct.productType] ?? selectedProduct.productType}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('detail.unit')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{selectedProduct.unit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('detail.costPrice')}</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(selectedProduct.costPrice)}</p>
                    </div>
                  </div>
                </div>

                {/* Stock Info */}
                <div
                  className={cn(
                    'rounded-2xl border p-4',
                    isOutOfStock(selectedProduct)
                      ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30'
                      : isLowStock(selectedProduct)
                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30'
                        : 'border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50'
                  )}
                >
                  <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('table.status')}
                  </h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('detail.currentStock')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {selectedProduct.stockQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('detail.minLevel')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedProduct.minStockLevel}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">{t('table.status')}</p>
                      {isOutOfStock(selectedProduct) ? (
                        <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <XCircle className="mr-1 h-3 w-3" />
                          {t('table.outOfStock')}
                        </Badge>
                      ) : isLowStock(selectedProduct) ? (
                        <Badge className="mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {t('table.low')}
                        </Badge>
                      ) : (
                        <Badge className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t('table.ok')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Movements */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('detail.movements')}
                  </h3>
                  {movements.length === 0 ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        <RotateCcw className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {t('detail.noMovements')}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {movements.map((mov) => {
                        const config = MOVEMENT_TYPE_CONFIG[mov.type] ?? {
                          label: mov.type,
                          color: 'bg-gray-100 text-gray-800',
                        };
                        const isPositive = ['IN', 'PRODUCTION_IN', 'ADJUSTMENT'].includes(mov.type);
                        return (
                          <div
                            key={mov.id}
                            className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {mov.type === 'IN' && <ArrowDownCircle className="h-4 w-4 shrink-0 text-green-500" />}
                              {mov.type === 'OUT' && <ArrowUpCircle className="h-4 w-4 shrink-0 text-red-500" />}
                              {mov.type === 'ADJUSTMENT' && <RotateCcw className="h-4 w-4 shrink-0 text-blue-500" />}
                              {mov.type === 'PRODUCTION_IN' && <Factory className="h-4 w-4 shrink-0 text-emerald-500" />}
                              {mov.type === 'PRODUCTION_OUT' && <Factory className="h-4 w-4 shrink-0 text-orange-500" />}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge className={cn('text-xs', config.color)}>
                                    {config.label}
                                  </Badge>
                                  {mov.reference && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {mov.reference}
                                    </span>
                                  )}
                                </div>
                                {mov.notes && (
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {mov.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="ml-3 shrink-0 text-right">
                              <p
                                className={cn(
                                  'font-medium',
                                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                )}
                              >
                                {isPositive ? '+' : '-'}{mov.quantity}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(mov.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
