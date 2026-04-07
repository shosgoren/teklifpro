'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
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

const TABS: { key: TabKey; label: string; icon: typeof Package }[] = [
  { key: 'general', label: 'Genel', icon: Package },
  { key: 'stock', label: 'Stok', icon: Warehouse },
  { key: 'bom', label: 'Reçete', icon: ClipboardList },
  { key: 'suppliers', label: 'Tedarikçiler', icon: Truck },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  COMMERCIAL: 'Ticari',
  RAW_MATERIAL: 'Hammadde',
  SEMI_FINISHED: 'Yarı Mamül',
  CONSUMABLE: 'Sarf',
};

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  COMMERCIAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  RAW_MATERIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SEMI_FINISHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CONSUMABLE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const MOVEMENT_TYPE_CONFIG: Record<string, { label: string; color: string; positive: boolean }> = {
  IN: { label: 'Giriş', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', positive: true },
  OUT: { label: 'Çıkış', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', positive: false },
  ADJUSTMENT: { label: 'Düzeltme', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', positive: true },
  PRODUCTION_IN: { label: 'Üretim Girişi', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', positive: true },
  PRODUCTION_OUT: { label: 'Üretime Çıkış', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', positive: false },
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

const isLowStock = (p: Product) =>
  p.trackStock && p.minStockLevel > 0 && p.stockQuantity < p.minStockLevel;

// ─── Component ───────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
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
    fetcher
  );

  const { data: movementsData, mutate: mutateMovements } = useSWR(
    activeTab === 'stock' ? `/api/v1/stock/movements?productId=${productId}&limit=20` : null,
    fetcher
  );

  const { data: bomData } = useSWR(
    activeTab === 'bom' ? `/api/v1/bom?productId=${productId}` : null,
    fetcher
  );

  const { data: costData } = useSWR(
    activeTab === 'bom' && bomData?.data?.boms?.[0]?.id
      ? `/api/v1/bom/${bomData.data.boms[0].id}/cost`
      : null,
    fetcher
  );

  const { data: suppliersData, mutate: mutateSuppliers } = useSWR(
    activeTab === 'suppliers' ? `/api/v1/products/${productId}/suppliers` : null,
    fetcher
  );

  const { data: availableSuppliersData } = useSWR(
    isAddSupplierOpen ? '/api/v1/suppliers?limit=100' : null,
    fetcher
  );

  const { data: priceHistoryData, mutate: mutatePriceHistory } = useSWR(
    activeTab === 'general' ? `/api/v1/products/${productId}/price-history` : null,
    fetcher
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
      toast.error('Lütfen geçerli bir miktar girin');
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
        toast.success(movementDialogType === 'IN' ? 'Stok girişi kaydedildi' : 'Stok çıkışı kaydedildi');
        setMovementDialogType(null);
        setMovementForm({ quantity: '', unitPrice: '', reference: '', notes: '' });
        mutateProduct();
        mutateMovements();
      } else {
        toast.error(data.error || 'Bir hata oluştu');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [movementForm, movementDialogType, productId, mutateProduct, mutateMovements]);

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
      toast.error('Ürün adı zorunludur');
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
        toast.success('Ürün başarıyla güncellendi');
        setIsEditOpen(false);
        mutateProduct();
      } else {
        toast.error(data.error || 'Güncelleme sırasında hata oluştu');
      }
    } catch {
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [editForm, productId, mutateProduct]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
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
        toast.success('Görsel yüklendi');
        mutateProduct();
      } else {
        toast.error(data.error || 'Görsel yüklenemedi');
      }
    } catch {
      toast.error('Görsel yüklenirken hata oluştu');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  }, [productId, mutateProduct]);

  const handleImageDelete = useCallback(async () => {
    if (!window.confirm('Ürün görselini kaldırmak istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`/api/v1/products/${productId}/image`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('Görsel kaldırıldı');
        mutateProduct();
      } else {
        toast.error(data.error || 'Görsel kaldırılamadı');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    }
  }, [productId, mutateProduct]);

  const availableSuppliers = (availableSuppliersData?.data?.suppliers ?? []).filter(
    (s: { id: string }) => !suppliers.some((ps) => ps.supplierId === s.id)
  );

  const handleAddSupplier = useCallback(async () => {
    if (!supplierForm.supplierId || !supplierForm.unitPrice) {
      toast.error('Tedarikçi ve birim fiyat zorunludur');
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
        toast.success('Tedarikçi eklendi');
        setIsAddSupplierOpen(false);
        setSupplierForm({ supplierId: '', unitPrice: '', currency: 'TRY', leadTimeDays: '', minOrderQty: '', isPreferred: false, notes: '' });
        mutateSuppliers();
      } else {
        toast.error(data.error || 'Bir hata oluştu');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [supplierForm, productId, mutateSuppliers]);

  const handleRemoveSupplier = useCallback(async (supplierId: string, supplierName: string) => {
    if (!window.confirm(`${supplierName} tedarikçisini bu üründen kaldırmak istediğinize emin misiniz?`)) return;
    try {
      const response = await fetch(`/api/v1/products/${productId}/suppliers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Tedarikçi kaldırıldı');
        mutateSuppliers();
      } else {
        toast.error(data.error || 'Bir hata oluştu');
      }
    } catch {
      toast.error('İşlem sırasında hata oluştu');
    }
  }, [productId, mutateSuppliers]);

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
        <p className="text-lg font-medium text-muted-foreground">Ürün bulunamadı</p>
        <Button variant="outline" onClick={() => router.push(`/${locale}/products`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ürünlere Dön
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
          Ürünler
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">{product.name}</h1>
              <Badge className={cn('text-xs border-0 shrink-0', PRODUCT_TYPE_COLORS[product.productType])}>
                {PRODUCT_TYPE_LABELS[product.productType] || product.productType}
              </Badge>
              {!product.isActive && (
                <Badge variant="secondary" className="shrink-0">Pasif</Badge>
              )}
            </div>
            {product.code && (
              <p className="text-sm text-muted-foreground mt-1">{product.code}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={openEditDialog} className="shrink-0">
            <Edit className="mr-1.5 h-4 w-4" />
            Düzenle
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
                {tab.label}
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
              {movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.label || 'Stok Hareketi'}
            </DialogTitle>
            <DialogDescription>
              {product.name} için {movementDialogType === 'ADJUSTMENT' ? 'stok düzeltmesi' : movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.label.toLowerCase()} yapın
              {movementDialogType === 'ADJUSTMENT' && ' (Miktarı doğrudan yeni değere ayarlar)'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Miktar ({product.unit}) *</Label>
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
              <Label>Birim Fiyat (TRY)</Label>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Opsiyonel"
                value={movementForm.unitPrice}
                onChange={(e) => setMovementForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Referans</Label>
              <Input
                placeholder="Sipariş No, Fatura No..."
                value={movementForm.reference}
                onChange={(e) => setMovementForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Not</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ek açıklama..."
                value={movementForm.notes}
                onChange={(e) => setMovementForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialogType(null)}>İptal</Button>
            <Button
              onClick={handleMovementSubmit}
              disabled={isSubmitting || !movementForm.quantity}
              className={cn(
                movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.positive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : movementDialogType === 'ADJUSTMENT'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {movementDialogType && MOVEMENT_TYPE_CONFIG[movementDialogType]?.label || 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Product Dialog ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ürünü Düzenle</DialogTitle>
            <DialogDescription>Ürün bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Ürün Adı *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ürün Kodu</Label>
                <Input
                  value={editForm.code}
                  onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Ürün Türü</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.productType}
                  onChange={(e) => setEditForm((f) => ({ ...f, productType: e.target.value }))}
                >
                  <option value="COMMERCIAL">Ticari</option>
                  <option value="RAW_MATERIAL">Hammadde</option>
                  <option value="SEMI_FINISHED">Yarı Mamül</option>
                  <option value="CONSUMABLE">Sarf Malzeme</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Birim</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={editForm.unit}
                  onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                >
                  <option value="Adet">Adet</option>
                  <option value="Saat">Saat</option>
                  <option value="Gün">Gün</option>
                  <option value="Ay">Ay</option>
                  <option value="Yıl">Yıl</option>
                  <option value="Paket">Paket</option>
                  <option value="kg">kg</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                  <option value="lt">lt</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Kategori</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ör: Yazılım, Donanım"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Liste Fiyatı (TRY)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.listPrice || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, listPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>KDV Oranı (%)</Label>
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
                <Label>Maliyet Fiyatı (TRY)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.costPrice || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, costPrice: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>İşçilik Maliyeti (TRY)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={editForm.laborCost || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, laborCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Genel Gider Oranı (%)</Label>
                <Input
                  type="number" min="0" step="0.1"
                  value={editForm.overheadRate || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, overheadRate: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Min. Stok Seviyesi</Label>
                <Input
                  type="number" min="0" step="1"
                  value={editForm.minStockLevel || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, minStockLevel: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Açıklama</Label>
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
              <Label htmlFor="edit-active">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              İptal
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : 'Kaydet'}
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
            <DialogTitle>Tedarikçi Ekle</DialogTitle>
            <DialogDescription>Bu ürüne bir tedarikçi bağlayın</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Tedarikçi *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={supplierForm.supplierId}
                onChange={(e) => setSupplierForm((f) => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">Tedarikçi seçin...</option>
                {availableSuppliers.map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {availableSuppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">Eklenecek tedarikçi bulunamadı</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Birim Fiyat *</Label>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={supplierForm.unitPrice}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, unitPrice: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Para Birimi</Label>
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
                <Label>Teslim Süresi (gün)</Label>
                <Input
                  type="number" min="0" step="1" placeholder="Opsiyonel"
                  value={supplierForm.leadTimeDays}
                  onChange={(e) => setSupplierForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Min. Sipariş</Label>
                <Input
                  type="number" min="0" step="1" placeholder="Opsiyonel"
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
              <Label htmlFor="supplier-preferred">Tercih Edilen Tedarikçi</Label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Not</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ek açıklama..."
                value={supplierForm.notes}
                onChange={(e) => setSupplierForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>İptal</Button>
            <Button onClick={handleAddSupplier} disabled={isSubmitting || !supplierForm.supplierId || !supplierForm.unitPrice}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ekleniyor...</> : 'Tedarikçi Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── General Tab ─────────────────────────────────────────

const PRICE_FIELD_LABELS: Record<string, string> = {
  listPrice: 'Liste Fiyatı',
  costPrice: 'Maliyet Fiyatı',
  laborCost: 'İşçilik Maliyeti',
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Product Image */}
      <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Ürün Görseli
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
              {isUploadingImage ? 'Yükleniyor...' : product.imageUrl ? 'Görseli Değiştir' : 'Görsel Yükle'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onImageUpload}
                className="hidden"
                disabled={isUploadingImage}
              />
            </label>
            <p className="text-xs text-muted-foreground">JPEG, PNG veya WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Temel Bilgiler
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Ürün Kodu</p>
            <p className="font-medium">{product.code ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Kategori</p>
            <p className="font-medium">{product.category ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Birim</p>
            <p className="font-medium">{product.unit}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Durum</p>
            <Badge variant={product.isActive ? 'default' : 'secondary'}>
              {product.isActive ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
        </div>
        {product.description && (
          <div className="pt-2 border-t">
            <p className="text-muted-foreground text-xs mb-1">Açıklama</p>
            <p className="text-sm">{product.description}</p>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Fiyatlandırma
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Liste Fiyatı</p>
            <p className="font-medium text-lg">{formatCurrency(product.listPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">KDV Dahil</p>
            <p className="font-medium text-lg">
              {formatCurrency(product.listPrice * (1 + product.vatRate / 100))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Maliyet Fiyatı</p>
            <p className="font-medium">{product.costPrice > 0 ? formatCurrency(product.costPrice) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">KDV Oranı</p>
            <p className="font-medium">%{product.vatRate}</p>
          </div>
          {product.laborCost > 0 && (
            <div>
              <p className="text-muted-foreground">İşçilik</p>
              <p className="font-medium">{formatCurrency(product.laborCost)}</p>
            </div>
          )}
          {product.overheadRate > 0 && (
            <div>
              <p className="text-muted-foreground">Genel Gider</p>
              <p className="font-medium">%{product.overheadRate}</p>
            </div>
          )}
        </div>
        {product.costPrice > 0 && product.listPrice > 0 && (
          <div className="pt-2 border-t">
            <p className="text-muted-foreground text-xs mb-1">Kar Marjı</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              %{(((product.listPrice - product.costPrice) / product.listPrice) * 100).toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Sync Info */}
      <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Senkronizasyon
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              product.syncedFromParasut ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="text-sm">
            {product.syncedFromParasut ? 'Paraşüt\'ten senkronize' : 'Manuel eklenmiş'}
          </span>
          {product.lastSyncAt && (
            <span className="text-xs text-muted-foreground ml-2">
              Son: {formatDate(product.lastSyncAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Oluşturulma: {formatDate(product.createdAt)}
        </p>
      </div>

      {/* Price History */}
      {priceHistory.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <History className="h-4 w-4" />
            Fiyat Geçmişi
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
                        {PRICE_FIELD_LABELS[entry.field] || entry.field}
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
                    <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
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
            Stok Durumu
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => onMovement('IN')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackagePlus className="mr-1.5 h-4 w-4" />
              Giriş
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onMovement('OUT')}
            >
              <PackageMinus className="mr-1.5 h-4 w-4" />
              Çıkış
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <ChevronDown className="mr-1.5 h-4 w-4" />
                  Diğer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onMovement('ADJUSTMENT')}>
                  <RotateCcw className="mr-2 h-4 w-4 text-blue-500" />
                  Stok Düzeltme
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMovement('PRODUCTION_IN')}>
                  <Factory className="mr-2 h-4 w-4 text-emerald-500" />
                  Üretim Girişi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMovement('PRODUCTION_OUT')}>
                  <Factory className="mr-2 h-4 w-4 text-orange-500" />
                  Üretime Çıkış
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Mevcut Stok</p>
            <p className="text-2xl font-bold">
              {product.stockQuantity}
              <span className="text-sm font-normal text-muted-foreground ml-1">{product.unit}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Min. Seviye</p>
            <p className="text-2xl font-bold">{product.minStockLevel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Durum</p>
            {low ? (
              <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Düşük Stok
              </Badge>
            ) : (
              <Badge className="mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Normal
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Movement History */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Stok Hareketleri
        </h3>
        {movements.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">Henüz stok hareketi bulunmuyor</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {movements.map((mov) => {
              const config = MOVEMENT_TYPE_CONFIG[mov.type] ?? {
                label: mov.type,
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
                    {mov.type === 'ADJUSTMENT' && <RotateCcw className="h-5 w-5 shrink-0 text-blue-500" />}
                    {mov.type === 'PRODUCTION_IN' && <Factory className="h-5 w-5 shrink-0 text-emerald-500" />}
                    {mov.type === 'PRODUCTION_OUT' && <Factory className="h-5 w-5 shrink-0 text-orange-500" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs', config.color)}>{config.label}</Badge>
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
                    <p className="text-xs text-muted-foreground">{formatDate(mov.createdAt)}</p>
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
  if (!bom) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Bu ürün için henüz reçete tanımlanmamış</p>
        <p className="text-xs text-muted-foreground mt-1">
          {product.productType === 'COMMERCIAL' || product.productType === 'SEMI_FINISHED'
            ? 'Reçete eklemek için BOM sayfasını kullanabilirsiniz'
            : 'Reçeteler yalnızca Ticari ve Yarı Mamül ürünler için tanımlanır'}
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
            Reçete v{bom.version}
          </h3>
          {bom.isActive && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
              Aktif
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{bom.items.length} malzeme</p>
      </div>

      {/* Materials List */}
      <div className="rounded-lg border overflow-hidden">
        {/* Desktop */}
        <table className="w-full text-sm hidden md:table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Malzeme</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Miktar</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Fire %</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Stok</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Birim Fiyat</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Toplam</th>
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
                  {item.wasteRate > 0 && <span>Fire: %{item.wasteRate}</span>}
                  <span className={cn(
                    item.material.stockQuantity < item.quantity ? 'text-red-600 font-medium' : ''
                  )}>
                    Stok: {item.material.stockQuantity}
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
            Maliyet Hesabı
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Malzeme Maliyeti</span>
              <span className="font-medium">{formatCurrency(costBreakdown.totalMaterialCost)}</span>
            </div>
            {costBreakdown.laborCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">İşçilik</span>
                <span className="font-medium">{formatCurrency(costBreakdown.laborCost)}</span>
              </div>
            )}
            {costBreakdown.overheadCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Genel Gider</span>
                <span className="font-medium">{formatCurrency(costBreakdown.overheadCost)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Toplam Üretim Maliyeti</span>
              <span>{formatCurrency(costBreakdown.totalProductionCost)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Liste Fiyatı</span>
              <span>{formatCurrency(costBreakdown.listPrice)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Kar Marjı</span>
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
          <p className="text-xs text-muted-foreground mb-1">Notlar</p>
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
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <Truck className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Bu ürün için henüz tedarikçi tanımlanmamış
        </p>
        <Button variant="outline" size="sm" onClick={onAdd} className="mt-3">
          <Plus className="mr-1.5 h-4 w-4" />
          Tedarikçi Ekle
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {suppliers.length} Tedarikçi
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Tedarikçi Ekle
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
                title="Tedarikçiyi kaldır"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {s.phone && <span>{s.phone}</span>}
            {s.email && <span>{s.email}</span>}
            {s.leadTimeDays !== null && <span>Teslim: {s.leadTimeDays} gün</span>}
            {s.minOrderQty !== null && <span>Min. sipariş: {s.minOrderQty}</span>}
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
