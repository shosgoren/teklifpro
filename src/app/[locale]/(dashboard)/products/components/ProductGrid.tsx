'use client';

import { memo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronDown, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/utils/cn';
import type { Product } from './types';
import { PRODUCT_TYPE_COLORS, isLowStock } from './types';

// ─── Stock Level Bar ───
export const StockBar = memo(function StockBar({ product }: { product: Product }) {
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
});

// ─── Product Thumbnail ───
export const ProductThumbnail = memo(function ProductThumbnail({ product, size = 'sm' }: { product: Product; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-14 h-14';
  const textSize = size === 'sm' ? 'text-xs' : 'text-lg';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  if (product.imageUrl) {
    return (
      <div className={cn(dim, 'rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative')}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={size === 'sm' ? 36 : 56}
          height={size === 'sm' ? 36 : 56}
          className="w-full h-full object-cover"
          unoptimized={product.imageUrl.startsWith('data:')}
        />
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
});

interface ProductGridProps {
  products: Product[];
  formatPrice: (price: number) => string;
  onSelectProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export function ProductGrid({ products, formatPrice, onSelectProduct, onEditProduct, onDeleteProduct }: ProductGridProps) {
  const t = useTranslations('productsPage');

  const PRODUCT_TYPE_LABELS: Record<string, string> = {
    COMMERCIAL: t('commercial'),
    RAW_MATERIAL: t('rawMaterial'),
    SEMI_FINISHED: t('semiFinished'),
    CONSUMABLE: t('consumable'),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          onClick={() => onSelectProduct(product)}
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}>
                  <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} className="text-red-600">
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
              <span className="text-[10px] text-muted-foreground">Parasut</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
