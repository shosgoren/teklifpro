'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import useSWR from 'swr';
import { swrDefaultOptions, swrStaticOptions } from '@/shared/utils/swrConfig';
import {
  ArrowLeft,
  Edit,
  Package,
  Warehouse,
  ClipboardList,
  Truck,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  PackageMinus,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Factory,
  Plus,
  Trash2,
  Calculator,
  Loader2,
  Star,
  X,
  ChevronDown,
  Upload,
  ImageIcon,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';
import { useCurrency } from '@/shared/hooks/useCurrency';

// ─── Types ───────────────────────────────────────────────

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
  imageUrl: string | null;
  trackStock: boolean;
  stockQuantity: number;
  minStockLevel: number;
  syncedFromParasut: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface BomItem {
  id: string;
  materialId: string;
  material: {
    id: string;
    code: string | null;
    name: string;
    unit: string;
    stockQuantity: number;
    listPrice: number;
  };
  quantity: number;
  unit: string;
  wasteRate: number;
  notes: string | null;
  sortOrder: number;
}

interface Bom {
  id: string;
  productId: string;
  version: number;
  isActive: boolean;
  notes: string | null;
  items: BomItem[];
  createdAt: string;
  updatedAt: string;
}

interface CostBreakdown {
  materialCosts: {
    materialName: string;
    quantity: number;
    unitPrice: number;
    wasteRate: number;
    totalCost: number;
  }[];
  totalMaterialCost: number;
  laborCost: number;
  overheadCost: number;
  totalProductionCost: number;
  listPrice: number;
  profitMargin: number;
}

interface ProductSupplier {
  id: string;
  supplierId: string;
  supplierName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  supplierActive: boolean;
  unitPrice: number;
  currency: string;
  leadTimeDays: number | null;
  minOrderQty: number | null;
  isPreferred: boolean;
  notes: string | null;
}

interface PriceHistoryEntry {
  id: string;
  field: string;
  oldValue: number;
  newValue: number;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────

type TabKey = 'general' | 'stock' | 'bom' | 'suppliers';

const TABS: { key: TabKey; labelKey: string; icon: typeof Package }[] = [
  { key: 'general', labelKey: 'tabs.general', icon: Package },
  { key: 'stock', labelKey: 'tabs.stock', icon: Warehouse },
  { key: 'bom', labelKey: 'tabs.bom', icon: ClipboardList },
  { key: 'suppliers', labelKey: 'tabs.suppliers', icon: Truck },
];

const PRODUCT_TYPE_LABEL_KEYS: Record<string, string> = {
  COMMERCIAL: 'productTypes.commercial',
  RAW_MATERIAL: 'productTypes.rawMaterial',
  SEMI_FINISHED: 'productTypes.semiFinished',
  CONSUMABLE: 'productTypes.consumable',
};

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-mint-100 text-mint-800 dark:bg-mint-900 dark:text-mint-200',
  RAW_MATERIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SEMI_FINISHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CONSUMABLE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const MOVEMENT_TYPE_CONFIG: Record<string, { labelKey: string; color: string; positive: boolean }> = {
  IN: { labelKey: 'movementTypes.in', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', positive: true },
  OUT: { labelKey: 'movementTypes.out', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', positive: false },
  ADJUSTMENT: { labelKey: 'movementTypes.adjustment', color: 'bg-mint-100 text-mint-800 dark:bg-mint-900 dark:text-mint-200', positive: true },
  PRODUCTION_IN: { labelKey: 'movementTypes.productionIn', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', positive: true },
  PRODUCTION_OUT: { labelKey: 'movementTypes.productionOut', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', positive: false },
};

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

const formatDate = (dateStr: string, dateLocale = 'tr-TR') =>
  new Intl.DateTimeFormat(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const isLowStock = (p: Product) =>
  p.trackStock && p.minStockLevel > 0 && p.stockQuantity < p.minStockLevel;

// ─── Component ───────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('productDetail');
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const { formatCurrency } = useCurrency();
  const productId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [movementDialogType, setMovementDialogType] = useState<'IN' | 'OUT' | 'ADJUSTMENT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', code: '', category: '', productType: 'COMMERCIAL', unit: 'Adet',
    listPrice: 0, costPrice: 0, laborCost: 0, overheadRate: 0, minStockLevel: 0,
    vatRate: 18, description: '', isActive: true,
  });
  const [movementForm, setMovementForm] = useState({
    quantity: '',
    unitPrice: '',
    reference: '',
    notes: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    supplierId: '',
    unitPrice: '',
    currency: 'TRY',
    leadTimeDays: '',
    minOrderQty: '',
    isPreferred: false,
    notes: '',
  });

  // ─── Data fetching ───

  const { data: productData, error: productError, isLoading, mutate: mutateProduct } = useSWR(
    `/api/v1/products/${productId}`,
    fetcher,
    swrDefaultOptions
  );

  const { data: movementsData, mutate: mutateMovements } = useSWR(
    activeTab === 'stock' ? `/api/v1/stock/movements?productId=${productId}&limit=20` : null,
    fetcher,
    swrDefaultOptions
  );

  const { data: bomData } = useSWR(
    activeTab === 'bom' ? `/api/v1/bom?productId=${productId}` : null,
    fetcher,
    swrDefaultOptions
  );

  const { data: costData } = useSWR(
    activeTab === 'bom' && bomData?.data?.boms?.[0]?.id
      ? `/api/v1/bom/${bomData.data.boms[0].id}/cost`
      : null,
    fetcher,
    swrDefaultOptions
  );

  const { data: suppliersData, mutate: mutateSuppliers } = useSWR(
    activeTab === 'suppliers' ? `/api/v1/products/${productId}/suppliers` : null,
    fetcher,
    swrDefaultOptions
  );

  const { data: availableSuppliersData } = useSWR(
    isAddSupplierOpen ? '/api/v1/suppliers?limit=100' : null,
    fetcher,
    swrStaticOptions
  );

  const { data: priceHistoryData, mutate: mutatePriceHistory } = useSWR(
    activeTab === 'general' ? `/api/v1/products/${productId}/price-history` : null,
    fetcher,
    swrDefaultOptions
  );

  const product: Product | null = productData?.data ?? null;
  const movements: StockMovement[] = movementsData?.data?.movements ?? movementsData?.data ?? [];
  const boms: Bom[] = bomData?.data?.boms ?? [];
  const activeBom = boms.find((b) => b.isActive) ?? boms[0] ?? null;
  const costBreakdown: CostBreakdown | null = costData?.data ?? null;
  const suppliers: ProductSupplier[] = suppliersData?.data?.suppliers ?? [];
  const priceHistory: PriceHistoryEntry[] = priceHistoryData?.data?.history ?? [];

  // ─── Handlers ───

  const handleMovementSubmit = useCallback(async () => {
    if (!movementForm.quantity || Number(movementForm.quantity) <= 0) {
      toast.error(t('toast.invalidQuantity'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type: movementDialogType,
          quantity: Number(movementForm.quantity),
          ...(movementForm.unitPrice && { unitPrice: Number(movementForm.unitPrice) }),
          ...(movementForm.reference && { reference: movementForm.reference }),
          ...(movementForm.notes && { notes: movementForm.notes }),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(movementDialogType === 'IN' ? t('toast.stockInSaved') : t('toast.stockOutSaved'));
        setMovementDialogType(null);
        setMovementForm({ quantity: '', unitPrice: '', reference: '', notes: '' });
        mutateProduct();
        mutateMovements();
      } else {
        toast.error(data.error || t('toast.genericError'));
      }
    } catch {
      toast.error(t('toast.operationError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [movementForm, movementDialogType, productId, mutateProduct, mutateMovements, t]);

  const openEditDialog = useCallback(() => {
    if (!product) return;
    setEditForm({
      name: product.name,
      code: product.code ?? '',
      category: product.category ?? '',
      productType: product.productType,
      unit: product.unit,
      listPrice: product.listPrice,
      costPrice: product.costPrice,
      laborCost: product.laborCost,
      overheadRate: product.overheadRate,
      minStockLevel: product.minStockLevel,
      vatRate: product.vatRate,
      description: product.description ?? '',
      isActive: product.isActive,
    });
    setIsEditOpen(true);
  }, [product]);

  const handleEditSubmit = useCallback(async () => {
    if (!editForm.name) {
      toast.error(t('toast.nameRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          code: editForm.code || null,
          category: editForm.category || null,
          productType: editForm.productType,
          unit: editForm.unit,
          listPrice: Number(editForm.listPrice),
          costPrice: Number(editForm.costPrice),
          laborCost: Number(editForm.laborCost),
          overheadRate: Number(editForm.overheadRate),
          minStockLevel: Number(editForm.minStockLevel),
          vatRate: Number(editForm.vatRate),
          description: editForm.description || null,
          isActive: editForm.isActive,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toast.productUpdated'));
        setIsEditOpen(false);
        mutateProduct();
      } else {
        toast.error(data.error || t('toast.updateError'));
      }
    } catch {
      toast.error(t('toast.updateError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [editForm, productId, mutateProduct, t]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('toast.fileTooLarge'));
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/products/${productId}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toast.imageUploaded'));
        mutateProduct();
      } else {
        toast.error(data.error || t('toast.imageUploadFailed'));
      }
    } catch {
      toast.error(t('toast.imageUploadError'));
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  }, [productId, mutateProduct]);

  const handleImageDelete = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/image`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toast.imageRemoved'));
        mutateProduct();
      } else {
        toast.error(data.error || t('toast.imageRemoveFailed'));
      }
    } catch {
      toast.error(t('toast.operationError'));
    }
  }, [productId, mutateProduct, t]);

  const availableSuppliers = (availableSuppliersData?.data?.suppliers ?? []).filter(
    (s: { id: string }) => !suppliers.some((ps) => ps.supplierId === s.id)
  );

  const handleAddSupplier = useCallback(async () => {
    if (!supplierForm.supplierId || !supplierForm.unitPrice) {
      toast.error(t('toast.supplierAndPriceRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/products/${productId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplierForm.supplierId,
          unitPrice: Number(supplierForm.unitPrice),
          currency: supplierForm.currency,
          ...(supplierForm.leadTimeDays && { leadTimeDays: Number(supplierForm.leadTimeDays) }),
          ...(supplierForm.minOrderQty && { minOrderQty: Number(supplierForm.minOrderQty) }),
          isPreferred: supplierForm.isPreferred,
          ...(supplierForm.notes && { notes: supplierForm.notes }),
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toast.supplierAdded'));
        setIsAddSupplierOpen(false);
        setSupplierForm({ supplierId: '', unitPrice: '', currency: 'TRY', leadTimeDays: '', minOrderQty: '', isPreferred: false, notes: '' });
        mutateSuppliers();
      } else {
        toast.error(data.error || t('toast.genericError'));
      }
    } catch {
      toast.error(t('toast.operationError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [supplierForm, productId, mutateSuppliers, t]);

  const handleRemoveSupplier = useCallback(async (supplierId: string, _supplierName: string) => {
    try {
      const response = await fetch(`/api/v1/products/${productId}/suppliers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('toast.supplierRemoved'));
        mutateSuppliers();
      } else {
        toast.error(data.error || t('toast.genericError'));
      }
    } catch {
      toast.error(t('toast.operationError'));
    }
  }, [productId, mutateSuppliers, t]);

  // ─── Loading / Error ───

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 py-20">
        <p className="text-lg font-medium text-muted-foreground">{t('productNotFound')}</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/products`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToProducts')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 md:gap-6 md:p-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 p-4 md:p-0">
        <button
          onClick={() => router.push(`/${locale}/products`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('products')}
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{product.name}</h1>
              <Badge className={cn('text-xs border-0 shrink-0', PRODUCT_TYPE_COLORS[product.productType])}>
                {PRODUCT_TYPE_LABEL_KEYS[product.productType] ? t(PRODUCT_TYPE_LABEL_KEYS[product.productType]) : product.productType}
              </Badge>
              {!product.isActive && (
                <Badge variant="secondary" className="shrink-0">{t('status.inactive')}</Badge>
              )}
            </div>
            {product.code && (
              <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={openEditDialog} className="shrink-0">
            <Edit className="mr-1.5 h-4 w-4" />
            {t('edit')}
          </Button>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="border-b overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tab.labelKey)}
                {tab.key === 'stock' && isLowStock(product) && (
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="p-4 md:p-0">
        {activeTab === 'general' && (
          <GeneralTab
            product={product}
            priceHistory={priceHistory}
            isUploadingImage={isUploadingImage}
            onImageUpload={handleImageUpload}
            onImageDelete={handleImageDelete}
          />
        )}
        {activeTab === 'stock' && (
          <StockTab
            product={product}
            movements={movements}
            onMovement={(type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT') => setMovementDialogType(type)}
          />
        )}
        {activeTab === 'bom' && (
          <BomTab product={product} bom={activeBom} costBreakdown={costBreakdown} />
        )}
        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            onAdd={() => setIsAddSupplierOpen(true)}
            onRemove={handleRemoveSupplier}
          />
        )}
      </div>

      {/* ─── Stock Movement Dialog ─── */}
      <Dialog
        open={movementDialogType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMovementDialogType(null);
            setMovementForm({ quantity: '', unitPrice: '', reference: '', notes: '' });
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.labelKey ? t(MOVEMENT_TYPE_CONFIG[movementDialogType].labelKey) : t('stockMovement')}
            </DialogTitle>
            <DialogDescription>
              {t('movementDialog.description', { productName: product.name, type: movementDialogType === 'ADJUSTMENT' ? t('movementDialog.stockAdjustment') : movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.labelKey ? t(MOVEMENT_TYPE_CONFIG[movementDialogType].labelKey).toLowerCase() : '' })}
              {movementDialogType === 'ADJUSTMENT' && ` (${t('movementDialog.adjustmentNote')})`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('movementDialog.quantity', { unit: product.unit })} *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('movementDialog.unitPrice')}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder={t('optional')}
                value={movementForm.unitPrice}
                onChange={(e) => setMovementForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('movementDialog.reference')}</Label>
              <Input
                placeholder={t('movementDialog.referencePlaceholder')}
                value={movementForm.reference}
                onChange={(e) => setMovementForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('note')}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('additionalNotes')}
                value={movementForm.notes}
                onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogType(null)}>{t('cancel')}</Button>
            <Button
              onClick={handleMovementSubmit}
              disabled={isSubmitting || !movementForm.quantity}
              className={cn(
                movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.positive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : movementDialogType === 'ADJUSTMENT'
                    ? 'bg-mint-600 hover:bg-mint-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.labelKey ? t(MOVEMENT_TYPE_CONFIG[movementDialogType].labelKey) : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Product Dialog ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>{t('editDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('editDialog.productName')} *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('editDialog.productCode')}</Label>
                <Input
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('editDialog.productType')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.productType}
                  onChange={(e) => setEditForm((f) => ({ ...f, productType: e.target.value }))}
                >
                  <option value="COMMERCIAL">{t('productTypes.commercial')}</option>
                  <option value="RAW_MATERIAL">{t('productTypes.rawMaterial')}</option>
                  <option value="SEMI_FINISHED">{t('productTypes.semiFinished')}</option>
                  <option value="CONSUMABLE">{t('productTypes.consumable')}</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('editDialog.unit')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.unit}
                  onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  <option value="Adet">{t('units.piece')}</option>
                  <option value="Saat">{t('units.hour')}</option>
                  <option value="Gün">{t('units.day')}</option>
                  <option value="Ay">{t('units.month')}</option>
                  <option value="Yıl">{t('units.year')}</option>
                  <option value="Paket">{t('units.pack')}</option>
                  <option value="kg">{t('units.kg')}</option>
                  <option value="m">{t('units.m')}</option>
                  <option value="m²">{t('units.m2')}</option>
                  <option value="lt">{t('units.lt')}</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>{t('editDialog.category')}</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder={t('editDialog.categoryPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('editDialog.listPrice')}</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.listPrice || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, listPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('editDialog.vatRate')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.vatRate}
                  onChange={(e) => setEditForm((f) => ({ ...f, vatRate: parseInt(e.target.value) }))}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('editDialog.costPrice')}</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.costPrice || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('editDialog.laborCost')}</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.laborCost || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, laborCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('editDialog.overheadRate')}</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={editForm.overheadRate || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, overheadRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('editDialog.minStockLevel')}</Label>
                <Input
                  type="number" min="0" step="1"
                  value={editForm.minStockLevel || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, minStockLevel: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('description')}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-active">{t('status.active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Supplier Dialog ─── */}
      <Dialog open={isAddSupplierOpen} onOpenChange={(open) => {
        setIsAddSupplierOpen(open);
        if (!open) setSupplierForm({ supplierId: '', unitPrice: '', currency: 'TRY', leadTimeDays: '', minOrderQty: '', isPreferred: false, notes: '' });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('supplierDialog.title')}</DialogTitle>
            <DialogDescription>{t('supplierDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('supplierDialog.supplier')} *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={supplierForm.supplierId}
                onChange={(e) => setSupplierForm((f) => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">{t('supplierDialog.selectSupplier')}</option>
                {availableSuppliers.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {availableSuppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('supplierDialog.noSuppliersAvailable')}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('supplierDialog.unitPrice')} *</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={supplierForm.unitPrice}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('supplierDialog.currency')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={supplierForm.currency}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('supplierDialog.leadTime')}</Label>
                <Input
                  type="number" min="0" step="1" placeholder={t('optional')}
                  value={supplierForm.leadTimeDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('supplierDialog.minOrder')}</Label>
                <Input
                  type="number" min="0" step="1" placeholder={t('optional')}
                  value={supplierForm.minOrderQty}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, minOrderQty: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="supplier-preferred"
                checked={supplierForm.isPreferred}
                onChange={(e) => setSupplierForm((f) => ({ ...f, isPreferred: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="supplier-preferred">{t('supplierDialog.preferred')}</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('note')}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('additionalNotes')}
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddSupplier} disabled={isSubmitting || !supplierForm.supplierId || !supplierForm.unitPrice}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('adding')}</> : t('supplierDialog.addSupplier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── General Tab ─────────────────────────────────────────

const PRICE_FIELD_LABEL_KEYS: Record<string, string> = {
  listPrice: 'priceFields.listPrice',
  costPrice: 'priceFields.costPrice',
  laborCost: 'priceFields.laborCost',
};

function GeneralTab({
  product,
  priceHistory,
  isUploadingImage,
  onImageUpload,
  onImageDelete,
}: {
  product: Product;
  priceHistory: PriceHistoryEntry[];
  isUploadingImage: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageDelete: () => void;
}) {
  const { formatCurrency } = useCurrency();
  const locale = useLocale();
  const t = useTranslations('productDetail');
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Product Image */}
      <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.productImage')}
        </h3>
        <div className="flex items-center gap-4">
          {product.imageUrl ? (
            <div className="relative group">
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-xl object-cover border shadow-sm"
                unoptimized={product.imageUrl.startsWith('data:')}
              />
              <button
                onClick={onImageDelete}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-colors',
              'hover:bg-muted/50',
              isUploadingImage && 'opacity-50 pointer-events-none'
            )}>
              {isUploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isUploadingImage ? t('general.uploading') : product.imageUrl ? t('general.changeImage') : t('general.uploadImage')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onImageUpload}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
            <p className="text-xs text-muted-foreground">{t('general.imageHint')}</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.basicInfo')}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t('general.productCode')}</p>
            <p className="font-medium">{product.code ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.category')}</p>
            <p className="font-medium">{product.category ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.unit')}</p>
            <p className="font-medium">{product.unit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.status')}</p>
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? t('status.active') : t('status.inactive')}
            </Badge>
          </div>
        </div>
        {product.description && (
          <div className="pt-2 border-t">
            <p className="text-muted-foreground text-xs mb-1">{t('description')}</p>
            <p className="text-sm">{product.description}</p>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.pricing')}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t('general.listPrice')}</p>
            <p className="font-medium text-lg">{formatCurrency(product.listPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.vatIncluded')}</p>
            <p className="font-medium text-lg">
              {formatCurrency(product.listPrice * (1 + product.vatRate / 100))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.costPrice')}</p>
            <p className="font-medium">{product.costPrice > 0 ? formatCurrency(product.costPrice) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('general.vatRate')}</p>
            <p className="font-medium">%{product.vatRate}</p>
          </div>
          {product.laborCost > 0 && (
            <div>
              <p className="text-muted-foreground">{t('general.labor')}</p>
              <p className="font-medium">{formatCurrency(product.laborCost)}</p>
            </div>
          )}
          {product.overheadRate > 0 && (
            <div>
              <p className="text-muted-foreground">{t('general.overhead')}</p>
              <p className="font-medium">%{product.overheadRate}</p>
            </div>
          )}
        </div>
        {product.costPrice > 0 && product.listPrice > 0 && (
          <div className="pt-2 border-t">
            <p className="text-muted-foreground text-xs mb-1">{t('general.profitMargin')}</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              %{(((product.listPrice - product.costPrice) / product.listPrice) * 100).toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Sync Info */}
      <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('general.sync')}
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              product.syncedFromParasut ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="text-sm">
            {product.syncedFromParasut ? t('general.syncedFromParasut') : t('general.manuallyAdded')}
          </span>
          {product.lastSyncAt && (
            <span className="text-xs text-muted-foreground ml-2">
              {t('general.lastSync')}: {formatDate(product.lastSyncAt, dateLocale)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('general.createdAt')}: {formatDate(product.createdAt, dateLocale)}
        </p>
      </div>

      {/* Price History */}
      {priceHistory.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('general.priceHistory')}
          </h3>
          <div className="flex flex-col gap-2">
            {priceHistory.slice(0, 10).map((entry) => {
              const increased = entry.newValue > entry.oldValue;
              const pctChange = entry.oldValue > 0
                ? (((entry.newValue - entry.oldValue) / entry.oldValue) * 100).toFixed(1)
                : '∞';
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    {increased
                      ? <TrendingUp className="h-4 w-4 shrink-0 text-red-500" />
                      : <TrendingDown className="h-4 w-4 shrink-0 text-green-500" />
                    }
                    <div className="min-w-0">
                      <span className="font-medium">
                        {PRICE_FIELD_LABEL_KEYS[entry.field] ? t(PRICE_FIELD_LABEL_KEYS[entry.field]) : entry.field}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {formatCurrency(entry.oldValue)} → {formatCurrency(entry.newValue)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <Badge className={cn(
                      'text-xs',
                      increased
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    )}>
                      {increased ? '+' : ''}{pctChange}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt, dateLocale)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stock Tab ───────────────────────────────────────────

function StockTab({
  product,
  movements,
  onMovement,
}: {
  product: Product;
  movements: StockMovement[];
  onMovement: (type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT') => void;
}) {
  const locale = useLocale();
  const t = useTranslations('productDetail');
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const low = isLowStock(product);

  return (
    <div className="flex flex-col gap-4">
      {/* Stock Summary */}
      <div
        className={cn(
          'rounded-lg border p-4',
          low ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30' : ''
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('stock.stockStatus')}
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => onMovement('IN')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackagePlus className="mr-1.5 h-4 w-4" />
              {t('movementTypes.in')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onMovement('OUT')}
            >
              <PackageMinus className="mr-1.5 h-4 w-4" />
              {t('movementTypes.out')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <ChevronDown className="mr-1.5 h-4 w-4" />
                  {t('stock.other')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onMovement('ADJUSTMENT')}>
                  <RotateCcw className="mr-2 h-4 w-4 text-mint-500" />
                  {t('stock.stockAdjustment')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMovement('PRODUCTION_IN')}>
                  <Factory className="mr-2 h-4 w-4 text-emerald-500" />
                  {t('movementTypes.productionIn')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMovement('PRODUCTION_OUT')}>
                  <Factory className="mr-2 h-4 w-4 text-orange-500" />
                  {t('movementTypes.productionOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('stock.currentStock')}</p>
            <p className="text-2xl font-bold">
              {product.stockQuantity}
              <span className="text-sm font-normal text-muted-foreground ml-1">{product.unit}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('stock.minLevel')}</p>
            <p className="text-2xl font-bold">{product.minStockLevel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('general.status')}</p>
            {low ? (
              <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {t('stock.lowStock')}
              </Badge>
            ) : (
              <Badge className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('stock.normal')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('stock.movements')}
        </h3>
        {movements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('stock.noMovements')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {movements.map((mov) => {
              const config = MOVEMENT_TYPE_CONFIG[mov.type] ?? {
                labelKey: mov.type,
                color: 'bg-gray-100 text-gray-800',
                positive: true,
              };
              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {mov.type === 'IN' && <ArrowDownCircle className="h-5 w-5 shrink-0 text-green-500" />}
                    {mov.type === 'OUT' && <ArrowUpCircle className="h-5 w-5 shrink-0 text-red-500" />}
                    {mov.type === 'ADJUSTMENT' && <RotateCcw className="h-5 w-5 shrink-0 text-mint-500" />}
                    {mov.type === 'PRODUCTION_IN' && <Factory className="h-5 w-5 shrink-0 text-emerald-500" />}
                    {mov.type === 'PRODUCTION_OUT' && <Factory className="h-5 w-5 shrink-0 text-orange-500" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', config.color)}>{t(config.labelKey)}</Badge>
                        {mov.reference && (
                          <span className="text-xs text-muted-foreground truncate">{mov.reference}</span>
                        )}
                      </div>
                      {mov.notes && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">{mov.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p
                      className={cn(
                        'font-semibold',
                        config.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {config.positive ? '+' : '-'}{mov.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(mov.createdAt, dateLocale)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BOM Tab ─────────────────────────────────────────────

function BomTab({
  product,
  bom,
  costBreakdown,
}: {
  product: Product;
  bom: Bom | null;
  costBreakdown: CostBreakdown | null;
}) {
  const { formatCurrency } = useCurrency();
  const t = useTranslations('productDetail');
  if (!bom) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{t('bom.noBom')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {product.productType === 'COMMERCIAL' || product.productType === 'SEMI_FINISHED'
            ? t('bom.useBomPage')
            : t('bom.bomOnlyForCommercial')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* BOM Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('bom.bomVersion', { version: bom.version })}
          </h3>
          {bom.isActive && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
              {t('status.active')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t('bom.materialsCount', { count: bom.items.length })}</p>
      </div>

      {/* Materials List */}
      <div className="rounded-lg border overflow-hidden">
        {/* Desktop */}
        <table className="w-full text-sm hidden md:table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t('bom.material')}</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t('bom.quantity')}</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t('bom.wastePercent')}</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t('bom.stock')}</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t('bom.unitPrice')}</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">{t('bom.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bom.items.map((item) => {
              const effectiveQty = item.quantity * (1 + item.wasteRate / 100);
              const lineCost = effectiveQty * item.material.listPrice;
              return (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{item.material.name}</p>
                    {item.material.code && (
                      <p className="text-xs text-muted-foreground">{item.material.code}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {item.wasteRate > 0 ? `%${item.wasteRate}` : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={cn(
                      item.material.stockQuantity < item.quantity
                        ? 'text-red-600 font-medium'
                        : 'text-muted-foreground'
                    )}>
                      {item.material.stockQuantity}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {formatCurrency(item.material.listPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {formatCurrency(lineCost)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile */}
        <div className="flex flex-col divide-y md:hidden">
          {bom.items.map((item) => {
            const effectiveQty = item.quantity * (1 + item.wasteRate / 100);
            const lineCost = effectiveQty * item.material.listPrice;
            return (
              <div key={item.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{item.material.name}</p>
                    {item.material.code && (
                      <p className="text-xs text-muted-foreground">{item.material.code}</p>
                    )}
                  </div>
                  <p className="font-medium text-sm shrink-0 ml-2">{formatCurrency(lineCost)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{item.quantity} {item.unit}</span>
                  {item.wasteRate > 0 && <span>{t('bom.waste')}: %{item.wasteRate}</span>}
                  <span className={cn(
                    item.material.stockQuantity < item.quantity ? 'text-red-600 font-medium' : ''
                  )}>
                    {t('bom.stock')}: {item.material.stockQuantity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Breakdown */}
      {costBreakdown && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            {t('bom.costCalculation')}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('bom.materialCost')}</span>
              <span className="font-medium">{formatCurrency(costBreakdown.totalMaterialCost)}</span>
            </div>
            {costBreakdown.laborCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('general.labor')}</span>
                <span className="font-medium">{formatCurrency(costBreakdown.laborCost)}</span>
              </div>
            )}
            {costBreakdown.overheadCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('general.overhead')}</span>
                <span className="font-medium">{formatCurrency(costBreakdown.overheadCost)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>{t('bom.totalProductionCost')}</span>
              <span>{formatCurrency(costBreakdown.totalProductionCost)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t('general.listPrice')}</span>
              <span>{formatCurrency(costBreakdown.listPrice)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">{t('general.profitMargin')}</span>
              <span
                className={cn(
                  'font-bold text-lg',
                  costBreakdown.profitMargin >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                %{costBreakdown.profitMargin.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {bom.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">{t('notes')}</p>
          <p className="text-sm">{bom.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Suppliers Tab ───────────────────────────────────────

function SuppliersTab({
  suppliers,
  onAdd,
  onRemove,
}: {
  suppliers: ProductSupplier[];
  onAdd: () => void;
  onRemove: (supplierId: string, supplierName: string) => void;
}) {
  const { formatCurrency } = useCurrency();
  const t = useTranslations('productDetail');
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Truck className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {t('suppliers.noSuppliers')}
        </p>
        <Button variant="outline" size="sm" onClick={onAdd} className="mt-3">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('supplierDialog.addSupplier')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('suppliers.supplierCount', { count: suppliers.length })}
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('supplierDialog.addSupplier')}
        </Button>
      </div>
      {suppliers.map((s) => (
        <div
          key={s.id}
          className={cn(
            'rounded-lg border p-4 space-y-2',
            s.isPreferred && 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{s.supplierName}</p>
                {s.isPreferred && (
                  <Star className="h-4 w-4 shrink-0 text-amber-500 fill-amber-500" />
                )}
              </div>
              {s.contactName && (
                <p className="text-sm text-muted-foreground">{s.contactName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <p className="font-semibold text-lg">
                {formatCurrency(s.unitPrice)}
              </p>
              <button
                onClick={() => onRemove(s.supplierId, s.supplierName)}
                className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                title={t('suppliers.removeSupplier')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {s.phone && <span>{s.phone}</span>}
            {s.email && <span>{s.email}</span>}
            {s.leadTimeDays !== null && <span>{t('suppliers.delivery')}: {s.leadTimeDays} {t('suppliers.days')}</span>}
            {s.minOrderQty !== null && <span>{t('suppliers.minOrder')}: {s.minOrderQty}</span>}
            <span>{s.currency}</span>
          </div>
          {s.notes && (
            <p className="text-xs text-muted-foreground pt-1 border-t">{s.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
