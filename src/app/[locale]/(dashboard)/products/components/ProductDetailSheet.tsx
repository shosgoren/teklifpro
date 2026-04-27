'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Edit, ExternalLink, Tag, Layers, Package, Box } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Sheet, SheetContent } from '@/shared/components/ui/sheet';
import { cn } from '@/shared/utils/cn';
import type { Product } from './types';
import { StockBar } from './ProductGrid';

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  formatPrice: (price: number) => string;
  productTypeLabels: Record<string, string>;
}

export function ProductDetailSheet({ product, onClose, onEdit, formatPrice, productTypeLabels }: ProductDetailSheetProps) {
  const router = useRouter();
  const locale = useLocale();

  return (
    <Sheet open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-[480px] p-0 flex flex-col">
        {product && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-mint-600 to-mint-700 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">{product.name}</h3>
                  <p className="text-sm text-white/70 mt-0.5">{product.code ?? '-'}</p>
                  <Badge className="mt-2 bg-white/20 text-white border-0 hover:bg-white/30 text-xs">
                    {productTypeLabels[product.productType] || product.productType}
                  </Badge>
                </div>
                {product.imageUrl && (
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 shrink-0 relative">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized={product.imageUrl.startsWith('data:')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Pricing Card */}
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <Tag className="h-4 w-4" />
                  Fiyatlandirma
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Liste Fiyati</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatPrice(product.listPrice)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    KDV %{product.vatRate}
                  </Badge>
                </div>
                {product.costPrice > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Maliyet Fiyati</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {formatPrice(product.costPrice)}
                    </p>
                  </div>
                )}
              </div>

              {/* Stock Card */}
              {product.trackStock && (
                <div className="rounded-2xl border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Box className="h-4 w-4" />
                    Stok Durumu
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Mevcut Stok</p>
                      <p className={cn(
                        'text-xl font-bold',
                        product.minStockLevel > 0 && product.stockQuantity < product.minStockLevel
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}>
                        {product.stockQuantity} {product.unit}
                      </p>
                    </div>
                    {product.minStockLevel > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Min. Seviye</p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {product.minStockLevel} {product.unit}
                        </p>
                      </div>
                    )}
                  </div>
                  {product.minStockLevel > 0 && (
                    <StockBar product={product} />
                  )}
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Layers className="h-3.5 w-3.5" />
                    Kategori
                  </div>
                  <p className="text-sm font-medium">{product.category || '-'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-900 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Package className="h-3.5 w-3.5" />
                    Birim
                  </div>
                  <p className="text-sm font-medium">{product.unit}</p>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Aciklama</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t bg-white dark:bg-gray-950 p-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  router.push(`/${locale}/products/${product.id}`);
                  onClose();
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Tam Ekran Goruntule
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={() => {
                  onEdit(product);
                  onClose();
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Duzenle
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
