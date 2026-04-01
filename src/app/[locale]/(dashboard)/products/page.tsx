'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useConfirm } from '@/shared/components/confirm-dialog';
import useSWR from 'swr';
import { Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
}

type FilterProductType = 'all' | string;

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

const isLowStock = (product: Product) =>
  product.trackStock && product.minStockLevel > 0 && product.stockQuantity < product.minStockLevel;

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState({
    code: '',
    name: '',
    category: '',
    productType: 'COMMERCIAL',
    unit: 'Adet',
    listPrice: 0,
    costPrice: 0,
    minStockLevel: 0,
    vatRate: 18,
    description: '',
  });
  const itemsPerPage = 10;

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error(t('addError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [newProduct, mutate, t]);

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12 text-red-600">
          {t('errorLoad')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>

        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm" className="rounded-xl">
            <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
            {t('sync')}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm"
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25">
            <Plus className="mr-2 h-4 w-4" />
            {t('newProduct')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} className="pl-10 rounded-xl" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[140px] justify-between">
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
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('noProducts')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('noProductsHint')}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="rounded-2xl border bg-card overflow-hidden divide-y md:hidden">
            {products.map((product) => (
              <div
                key={product.id}
                className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/${locale}/products/${product.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          product.syncedFromParasut ? 'bg-green-500' : 'bg-gray-300'
                        )}
                      />
                      <p className="font-medium truncate">{product.name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{product.code ?? t('noCode')}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/${locale}/products/${product.id}`);
                        }}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('editBtn')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product.id);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('deleteBtn')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.productType && (
                      <Badge className={cn('text-xs border-0', PRODUCT_TYPE_COLORS[product.productType] || 'bg-gray-100 text-gray-800')}>
                        {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                      </Badge>
                    )}
                    {product.trackStock && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {t('stock')} {product.stockQuantity}
                        {isLowStock(product) && (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{product.unit} • KDV %{product.vatRate}</span>
                  </div>
                  <p className="font-semibold text-sm">{formatPrice(product.listPrice)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">{t('productCode')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('productName')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('type')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('unit')}</TableHead>
                    <TableHead className="text-center whitespace-nowrap">{t('stockHeader')}</TableHead>
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
                      <TableCell className="font-medium text-sm">{product.code ?? '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-2.5 w-2.5 rounded-full',
                              product.syncedFromParasut ? 'bg-green-500' : 'bg-gray-300'
                            )}
                          />
                          <span className="max-w-xs truncate">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.productType ? (
                          <Badge className={cn('text-xs border-0', PRODUCT_TYPE_COLORS[product.productType] || 'bg-gray-100 text-gray-800')}>
                            {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{product.unit}</TableCell>
                      <TableCell className="text-center text-sm">
                        {product.trackStock ? (
                          <span className={cn('flex items-center justify-center gap-1', isLowStock(product) && 'text-orange-600 font-medium')}>
                            {product.stockQuantity}
                            {isLowStock(product) && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('editBtn')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('deleteBtn')}
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

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-code">{t('productCodeLabel')}</Label>
              <Input
                id="product-code"
                placeholder={t('productCodePlaceholder')}
                value={newProduct.code}
                onChange={(e) => setNewProduct((p) => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-name">{t('productNameLabel')}</Label>
              <Input
                id="product-name"
                placeholder={t('productNamePlaceholder')}
                value={newProduct.name}
                onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-type">{t('productTypeLabel')}</Label>
              <select
                id="product-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.productType}
                onChange={(e) => setNewProduct((p) => ({ ...p, productType: e.target.value }))}
              >
                <option value="COMMERCIAL">{t('commercial')}</option>
                <option value="RAW_MATERIAL">{t('rawMaterial')}</option>
                <option value="SEMI_FINISHED">{t('semiFinished')}</option>
                <option value="CONSUMABLE">{t('consumable')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-category">{t('category')}</Label>
              <select
                id="product-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.category}
                onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">{t('selectCategory')}</option>
                <option value="Yazılım">{t('software')}</option>
                <option value="Hizmet">{t('service')}</option>
                <option value="Donanım">{t('hardware')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-unit">{t('unitLabel')}</Label>
              <select
                id="product-unit"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.unit}
                onChange={(e) => setNewProduct((p) => ({ ...p, unit: e.target.value }))}
              >
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
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newProduct.listPrice || ''}
                  onChange={(e) => setNewProduct((p) => ({ ...p, listPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-vat">{t('vatRateLabel')}</Label>
                <select
                  id="product-vat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newProduct.vatRate}
                  onChange={(e) => setNewProduct((p) => ({ ...p, vatRate: parseInt(e.target.value) }))}
                >
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
              <Label htmlFor="product-description">{t('description')}</Label>
              <textarea
                id="product-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('descriptionPlaceholder')}
                value={newProduct.description}
                onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddProduct} disabled={isSubmitting}>
              {isSubmitting ? t('adding') : t('addProduct')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
