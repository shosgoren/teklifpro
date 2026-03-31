'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { useToast } from '@/shared/components/ui/use-toast';
import { cn } from '@/shared/utils/cn';

interface Product {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  unit: string;
  listPrice: number;
  vatRate: number;
  isActive: boolean;
  description: string | null;
  syncedFromParasut: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

type FilterCategory = 'all' | string;

const fetcher = (url: string) => fetch(url).then(res => res.json());

const CATEGORIES = ['T\u00fcm\u00fc', 'Yaz\u0131l\u0131m', 'Hizmet', 'Donan\u0131m'];

export default function ProductsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(filterCategory !== 'all' && { category: filterCategory }),
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
        toast({
          title: 'Senkronizasyon Ba\u015far\u0131l\u0131',
          description: `${data.data.syncedCount} \u00fcr\u00fcn senkronize edildi`,
        });
        mutate();
      } else {
        toast({
          title: 'Senkronizasyon Hata',
          description: data.error || 'Bir hata olu\u015ftu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Senkronizasyon s\u0131ras\u0131nda hata olu\u015ftu',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast, mutate]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    if (!confirm('Bu \u00fcr\u00fcn\u00fc silmek istedi\u011finize emin misiniz?')) return;
    try {
      await fetch(`/api/v1/products/${productId}`, { method: 'DELETE' });
      toast({
        title: '\u00dcr\u00fcn Silindi',
        description: '\u00dcr\u00fcn ba\u015far\u0131yla silindi',
      });
      mutate();
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Silme i\u015flemi s\u0131ras\u0131nda hata olu\u015ftu',
        variant: 'destructive',
      });
    }
  }, [toast, mutate]);

  const handleAddProduct = useCallback(() => {
    toast({
      title: 'Manuel Ekleme',
      description: 'Yeni \u00fcr\u00fcn ekleme sayfas\u0131na y\u00f6nlendirileceksiniz',
    });
  }, [toast]);

  const formatPrice = (price: number) => {
    return (price || 0).toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">\u00dcr\u00fcnler</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">\u00dcr\u00fcnler</h1>
        <div className="text-center py-12 text-red-600">
          Veriler y\u00fcklenirken hata olu\u015ftu. L\u00fctfen sayfay\u0131 yenileyin.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">\u00dcr\u00fcnler</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="\u00dcr\u00fcn ara..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterCategory === 'all' ? 'T\u00fcm\u00fc' : filterCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                  checked={filterCategory === 'all'}
                  onCheckedChange={() => {
                    setFilterCategory('all');
                    setCurrentPage(1);
                  }}
                >
                  T\u00fcm\u00fc
                </DropdownMenuCheckboxItem>
                {['Yaz\u0131l\u0131m', 'Hizmet', 'Donan\u0131m'].map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filterCategory === category}
                    onCheckedChange={() => {
                      setFilterCategory(category);
                      setCurrentPage(1);
                    }}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isSyncing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
              Para\u015f\u00fct'ten Senkronize Et
            </Button>
            <Button onClick={handleAddProduct} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Manuel Ekle
            </Button>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">\u00dcr\u00fcn bulunamad\u0131</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Arama kriterlerinizi de\u011fi\u015ftirin veya yeni \u00fcr\u00fcn ekleyin
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">\u00dcr\u00fcn Kodu</TableHead>
                  <TableHead className="whitespace-nowrap">\u00dcr\u00fcn Ad\u0131</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">Birim</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Liste Fiyat\u0131</TableHead>
                  <TableHead className="hidden lg:table-cell text-center whitespace-nowrap">KDV %</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Durum</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProduct(product)}
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
                    <TableCell className="hidden text-sm md:table-cell">{product.category ?? '-'}</TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{product.unit}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatPrice(product.listPrice)}</TableCell>
                    <TableCell className="hidden text-center text-sm lg:table-cell">%{product.vatRate}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
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
                            D\u00fczenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
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
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {pagination.total} \u00fcr\u00fcn \u2022 Sayfa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              \u00d6nceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>{selectedProduct.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Temel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">\u00dcr\u00fcn Kodu</p>
                      <p className="font-medium">{selectedProduct.code ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kategori</p>
                      <p className="font-medium">{selectedProduct.category ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Birim</p>
                      <p className="font-medium">{selectedProduct.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Durum</p>
                      <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                        {selectedProduct.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">A\u00e7\u0131klama</h3>
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="font-semibold">Fiyatland\u0131rma</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Liste Fiyat\u0131</p>
                      <p className="font-medium text-lg">{formatPrice(selectedProduct.listPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KDV Oran\u0131</p>
                      <p className="font-medium">%{selectedProduct.vatRate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KDV Dahil Fiyat</p>
                      <p className="font-medium">
                        {formatPrice(selectedProduct.listPrice * (1 + selectedProduct.vatRate / 100))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Senkronizasyon</h3>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          selectedProduct.syncedFromParasut ? 'bg-green-500' : 'bg-gray-400'
                        )}
                      />
                      <span className="text-sm font-medium">
                        {selectedProduct.syncedFromParasut ? 'Para\u015f\u00fct\'ten senkronize' : 'Manuel eklenmi\u015f'}
                      </span>
                    </div>
                    {selectedProduct.lastSyncAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Son senkronizasyon: {new Date(selectedProduct.lastSyncAt).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
