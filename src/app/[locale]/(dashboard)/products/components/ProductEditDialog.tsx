'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/utils/cn';
import type { Product } from './types';

interface ProductFormState {
  code: string;
  name: string;
  category: string;
  productType: string;
  unit: string;
  listPrice: number;
  costPrice: number;
  minStockLevel: number;
  vatRate: number;
  description: string;
}

interface BulkPriceState {
  percentage: number;
  field: 'listPrice' | 'costPrice';
  category: string;
  productType: string;
}

interface ProductEditDialogProps {
  // Add dialog
  isAddDialogOpen: boolean;
  onAddDialogChange: (open: boolean) => void;
  newProduct: ProductFormState;
  onNewProductChange: (updater: (prev: ProductFormState) => ProductFormState) => void;
  onAddProduct: () => void;
  // Edit dialog
  isEditDialogOpen: boolean;
  onEditDialogChange: (open: boolean) => void;
  editingProduct: Product | null;
  editProduct: ProductFormState;
  onEditProductChange: (updater: (prev: ProductFormState) => ProductFormState) => void;
  onUpdateProduct: () => void;
  onEditingProductClear: () => void;
  // Bulk price dialog
  isBulkPriceOpen: boolean;
  onBulkPriceChange: (open: boolean) => void;
  bulkPrice: BulkPriceState;
  onBulkPriceUpdate: (updater: (prev: BulkPriceState) => BulkPriceState) => void;
  onBulkPriceApply: () => void;
  // Shared
  isSubmitting: boolean;
  dynamicCategories: string[];
  dynamicUnits: string[];
}

export function ProductEditDialog({
  isAddDialogOpen, onAddDialogChange, newProduct, onNewProductChange, onAddProduct,
  isEditDialogOpen, onEditDialogChange, editingProduct, editProduct, onEditProductChange, onUpdateProduct, onEditingProductClear,
  isBulkPriceOpen, onBulkPriceChange, bulkPrice, onBulkPriceUpdate, onBulkPriceApply,
  isSubmitting, dynamicCategories,
}: ProductEditDialogProps) {
  const t = useTranslations('productsPage');

  return (
    <>
      {/* ─── Add Product Dialog ─── */}
      <Dialog open={isAddDialogOpen} onOpenChange={onAddDialogChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-code">{t('productCodeLabel')}</Label>
              <Input id="product-code" placeholder={t('productCodePlaceholder')} value={newProduct.code}
                onChange={(e) => onNewProductChange((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-name">{t('productNameLabel')}</Label>
              <Input id="product-name" placeholder={t('productNamePlaceholder')} value={newProduct.name}
                onChange={(e) => onNewProductChange((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-type">{t('productTypeLabel')}</Label>
              <select id="product-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.productType} onChange={(e) => onNewProductChange((p) => ({ ...p, productType: e.target.value }))}>
                <option value="COMMERCIAL">{t('commercial')}</option>
                <option value="RAW_MATERIAL">{t('rawMaterial')}</option>
                <option value="SEMI_FINISHED">{t('semiFinished')}</option>
                <option value="CONSUMABLE">{t('consumable')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-category">{t('category')}</Label>
              <Input id="product-category" list="category-options"
                placeholder={t('selectCategory')}
                value={newProduct.category}
                onChange={(e) => onNewProductChange((p) => ({ ...p, category: e.target.value }))} />
              <datalist id="category-options">
                {dynamicCategories.length > 0
                  ? dynamicCategories.map((cat) => <option key={cat} value={cat} />)
                  : <>
                      <option value="Yazilim" />
                      <option value="Hizmet" />
                      <option value="Donanim" />
                    </>
                }
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-unit">{t('unitLabel')}</Label>
              <select id="product-unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={newProduct.unit} onChange={(e) => onNewProductChange((p) => ({ ...p, unit: e.target.value }))}>
                <option value="Adet">{t('unitPiece')}</option>
                <option value="Saat">{t('unitHour')}</option>
                <option value="Gun">{t('unitDay')}</option>
                <option value="Ay">{t('unitMonth')}</option>
                <option value="Yil">{t('unitYear')}</option>
                <option value="Paket">{t('unitPackage')}</option>
                <option value="kg">kg</option>
                <option value="m">m</option>
                <option value="m2">m2</option>
                <option value="lt">lt</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="product-price">{t('listPriceLabel')}</Label>
                <Input id="product-price" type="number" min="0" step="0.01" placeholder="0.00"
                  value={newProduct.listPrice || ''} onChange={(e) => onNewProductChange((p) => ({ ...p, listPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product-vat">{t('vatRateLabel')}</Label>
                <select id="product-vat" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newProduct.vatRate} onChange={(e) => onNewProductChange((p) => ({ ...p, vatRate: parseInt(e.target.value) }))}>
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
                onChange={(e) => onNewProductChange((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onAddDialogChange(false)} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={onAddProduct} disabled={isSubmitting}>
              {isSubmitting ? t('adding') : t('addProduct')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Product Dialog ─── */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { onEditDialogChange(open); if (!open) onEditingProductClear(); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
            <DialogDescription>{t('editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-product-code">{t('productCodeLabel')}</Label>
              <Input id="edit-product-code" placeholder={t('productCodePlaceholder')} value={editProduct.code}
                onChange={(e) => onEditProductChange((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-name">{t('productNameLabel')}</Label>
              <Input id="edit-product-name" placeholder={t('productNamePlaceholder')} value={editProduct.name}
                onChange={(e) => onEditProductChange((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-type">{t('productTypeLabel')}</Label>
              <select id="edit-product-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editProduct.productType} onChange={(e) => onEditProductChange((p) => ({ ...p, productType: e.target.value }))}>
                <option value="COMMERCIAL">{t('commercial')}</option>
                <option value="RAW_MATERIAL">{t('rawMaterial')}</option>
                <option value="SEMI_FINISHED">{t('semiFinished')}</option>
                <option value="CONSUMABLE">{t('consumable')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-category">{t('category')}</Label>
              <Input id="edit-product-category" list="edit-category-options"
                placeholder={t('selectCategory')}
                value={editProduct.category}
                onChange={(e) => onEditProductChange((p) => ({ ...p, category: e.target.value }))} />
              <datalist id="edit-category-options">
                <option value="Yazilim" />
                <option value="Hizmet" />
                <option value="Donanim" />
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-unit">{t('unitLabel')}</Label>
              <select id="edit-product-unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={editProduct.unit} onChange={(e) => onEditProductChange((p) => ({ ...p, unit: e.target.value }))}>
                <option value="Adet">{t('unitPiece')}</option>
                <option value="Saat">{t('unitHour')}</option>
                <option value="Gun">{t('unitDay')}</option>
                <option value="Ay">{t('unitMonth')}</option>
                <option value="Yil">{t('unitYear')}</option>
                <option value="Paket">{t('unitPackage')}</option>
                <option value="kg">kg</option>
                <option value="m">m</option>
                <option value="m2">m2</option>
                <option value="lt">lt</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-product-price">{t('listPriceLabel')}</Label>
                <Input id="edit-product-price" type="number" min="0" step="0.01" placeholder="0.00"
                  value={editProduct.listPrice || ''} onChange={(e) => onEditProductChange((p) => ({ ...p, listPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-product-vat">{t('vatRateLabel')}</Label>
                <select id="edit-product-vat" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editProduct.vatRate} onChange={(e) => onEditProductChange((p) => ({ ...p, vatRate: parseInt(e.target.value) }))}>
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
              <Label htmlFor="edit-product-description">{t('descriptionLabel')}</Label>
              <textarea id="edit-product-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('descriptionPlaceholder')} value={editProduct.description}
                onChange={(e) => onEditProductChange((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { onEditDialogChange(false); onEditingProductClear(); }} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={onUpdateProduct} disabled={isSubmitting}>
              {isSubmitting ? t('saving') : t('saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Bulk Price Dialog ─── */}
      <Dialog open={isBulkPriceOpen} onOpenChange={onBulkPriceChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('bulkPriceTitle')}</DialogTitle>
            <DialogDescription>{t('bulkPriceDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('bulkPriceField')}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bulkPrice.field} onChange={(e) => onBulkPriceUpdate((p) => ({ ...p, field: e.target.value as 'listPrice' | 'costPrice' }))}>
                <option value="listPrice">{t('listPrice')}</option>
                <option value="costPrice">{t('cost')}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{t('bulkPricePercent')}</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className={cn('rounded-lg', bulkPrice.percentage > 0 && 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300')}
                  onClick={() => onBulkPriceUpdate((p) => ({ ...p, percentage: Math.abs(p.percentage) }))}>
                  <TrendingUp className="h-4 w-4 mr-1" /> {t('bulkIncrease')}
                </Button>
                <Button variant="outline" size="sm" className={cn('rounded-lg', bulkPrice.percentage < 0 && 'bg-red-50 border-red-300 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300')}
                  onClick={() => onBulkPriceUpdate((p) => ({ ...p, percentage: -Math.abs(p.percentage) }))}>
                  <TrendingDown className="h-4 w-4 mr-1" /> {t('bulkDecrease')}
                </Button>
              </div>
              <Input type="number" min="1" max="100" value={Math.abs(bulkPrice.percentage)}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  onBulkPriceUpdate((p) => ({ ...p, percentage: p.percentage >= 0 ? val : -val }));
                }}
                className="text-center text-lg font-bold" />
              <p className="text-xs text-muted-foreground text-center">
                {bulkPrice.percentage >= 0 ? '+' : ''}{bulkPrice.percentage}%
              </p>
            </div>
            <div className="grid gap-2">
              <Label>{t('bulkPriceFilter')}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bulkPrice.productType} onChange={(e) => onBulkPriceUpdate((p) => ({ ...p, productType: e.target.value }))}>
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
                value={bulkPrice.category} onChange={(e) => onBulkPriceUpdate((p) => ({ ...p, category: e.target.value }))}>
                <option value="">{t('all')}</option>
                <option value="Yazilim">{t('software')}</option>
                <option value="Hizmet">{t('service')}</option>
                <option value="Donanim">{t('hardware')}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onBulkPriceChange(false)} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={onBulkPriceApply} disabled={isSubmitting}
              className={cn(bulkPrice.percentage >= 0
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700', 'text-white')}>
              {isSubmitting ? '...' : t('bulkPriceApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
