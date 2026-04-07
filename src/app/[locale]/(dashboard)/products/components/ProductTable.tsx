'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';
import type { Product } from './types';
import { PRODUCT_TYPE_COLORS } from './types';
import { StockBar, ProductThumbnail } from './ProductGrid';

interface ProductTableProps {
  products: Product[];
  formatPrice: (price: number) => string;
  onSelectProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export function ProductTable({ products, formatPrice, onSelectProduct, onEditProduct, onDeleteProduct }: ProductTableProps) {
  const t = useTranslations('productsPage');

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    COMMERCIAL: t('commercial'),
    RAW_MATERIAL: t('rawMaterial'),
    SEMI_FINISHED: t('semiFinished'),
    CONSUMABLE: t('consumable'),
  };

  return (
    <>
      {/* ─── MOBILE CARD VIEW ─── */}
      <div className="rounded-2xl border bg-card overflow-hidden divide-y md:hidden">
        {products.map((product) => (
          <div
            key={product.id}
            className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onSelectProduct(product)}
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
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}>
                    <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} className="text-red-600">
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
                <span className="text-xs text-muted-foreground">{product.unit} &bull; KDV %{product.vatRate}</span>
              </div>
              <p className="font-semibold text-sm">{formatPrice(product.listPrice)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── DESKTOP TABLE VIEW ─── */}
      <div className="hidden md:block overflow-clip rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900">
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
                  onClick={() => onSelectProduct(product)}
                >
                  <TableCell>
                    <ProductThumbnail product={product} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{product.code ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="max-w-xs truncate">{product.name}</span>
                      {product.syncedFromParasut && (
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Parasut" />
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} className="text-red-600">
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
  );
}
