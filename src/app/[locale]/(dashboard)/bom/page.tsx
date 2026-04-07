'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { swrDefaultOptions, swrStaticOptions } from '@/shared/utils/swrConfig';
import { useConfirm } from '@/shared/components/confirm-dialog';
import {
  Plus,
  Search,
  Trash2,
  Edit,
  Calculator,
  ChevronDown,
  X,
  Package,
  Layers,
  ClipboardList,
  Boxes,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductRef {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  category?: string | null;
}

interface BomListItem {
  id: string;
  productId: string;
  product: ProductRef;
  version: number;
  isActive: boolean;
  notes: string | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MaterialDetail {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  stockQuantity: number;
  listPrice: number;
}

interface BomItem {
  id: string;
  materialId: string;
  material: MaterialDetail;
  quantity: number;
  unit: string;
  wasteRate: number;
  notes: string | null;
  sortOrder: number;
}

interface BomDetail {
  id: string;
  productId: string;
  product: ProductRef;
  version: number;
  isActive: boolean;
  notes: string | null;
  items: BomItem[];
  createdAt: string;
  updatedAt: string;
}

interface CostBreakdownItem {
  materialId: string;
  materialCode: string | null;
  materialName: string;
  unit: string;
  quantity: number;
  wasteRate: number;
  effectiveQuantity: number;
  unitPrice: number;
  totalCost: number;
}

interface CostSummary {
  totalMaterialCost: number;
  laborCost: number;
  overheadRate: number;
  overheadCost: number;
  totalProductionCost: number;
}

interface CostData {
  bomId: string;
  product: { id: string; code: string | null; name: string };
  version: number;
  materialBreakdown: CostBreakdownItem[];
  summary: CostSummary;
}

interface FormMaterialRow {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  wasteRate: number;
}

interface ProductOption {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  listPrice?: number;
}

// ─── Fetcher ─────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data.success) throw new Error(data.error || 'API hatasi');
      return data;
    });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPrice = (price: number) =>
  (price || 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  });

// ─── Component ───────────────────────────────────────────────────────────────

export default function BomPage() {
  const t = useTranslations('bomPage');
  const confirm = useConfirm();
  // List state
  const [searchQuery, setSearchQuery] = useState('');

  // Detail sheet
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [isCalculatingCost, setIsCalculatingCost] = useState(false);

  // Create / Edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formProductId, setFormProductId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMaterials, setFormMaterials] = useState<FormMaterialRow[]>([]);

  // Product search for selectors
  const [productSearch, setProductSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [activeMatRowIndex, setActiveMatRowIndex] = useState<number | null>(null);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const { data: bomListData, error: bomListError, isLoading: bomListLoading, mutate: mutateBomList } = useSWR(
    '/api/v1/bom',
    fetcher,
    swrDefaultOptions,
  );

  const boms: BomListItem[] = bomListData?.data ?? [];

  const filteredBoms = useMemo(() => {
    if (!searchQuery.trim()) return boms;
    const q = searchQuery.toLowerCase();
    return boms.filter(
      (b) =>
        b.product.name.toLowerCase().includes(q) ||
        (b.product.code && b.product.code.toLowerCase().includes(q)),
    );
  }, [boms, searchQuery]);

  // Fetch BOM detail when selected
  const { data: bomDetailData, mutate: mutateBomDetail } = useSWR(
    selectedBomId ? `/api/v1/bom/${selectedBomId}` : null,
    fetcher,
    swrDefaultOptions,
  );
  const bomDetail: BomDetail | null = bomDetailData?.data ?? null;

  // Fetch products for selector (commercial + semi-finished)
  const { data: commercialProducts } = useSWR(
    isDialogOpen ? '/api/v1/products?productType=COMMERCIAL&limit=200' : null,
    fetcher,
    swrStaticOptions,
  );
  const { data: semiFinishedProducts } = useSWR(
    isDialogOpen ? '/api/v1/products?productType=SEMI_FINISHED&limit=200' : null,
    fetcher,
    swrStaticOptions,
  );

  const productOptions: ProductOption[] = useMemo(() => {
    const commercial = commercialProducts?.data?.products ?? [];
    const semi = semiFinishedProducts?.data?.products ?? [];
    return [...commercial, ...semi];
  }, [commercialProducts, semiFinishedProducts]);

  const filteredProductOptions = useMemo(() => {
    if (!productSearch.trim()) return productOptions;
    const q = productSearch.toLowerCase();
    return productOptions.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)),
    );
  }, [productOptions, productSearch]);

  // Fetch material products (raw, semi, consumable)
  const { data: rawMaterials } = useSWR(
    isDialogOpen ? '/api/v1/products?productType=RAW_MATERIAL&limit=200' : null,
    fetcher,
    swrStaticOptions,
  );
  const { data: consumableMaterials } = useSWR(
    isDialogOpen ? '/api/v1/products?productType=CONSUMABLE&limit=200' : null,
    fetcher,
    swrStaticOptions,
  );

  const materialOptions: ProductOption[] = useMemo(() => {
    const raw = rawMaterials?.data?.products ?? [];
    const semi = semiFinishedProducts?.data?.products ?? [];
    const consumable = consumableMaterials?.data?.products ?? [];
    return [...raw, ...semi, ...consumable];
  }, [rawMaterials, semiFinishedProducts, consumableMaterials]);

  const filteredMaterialOptions = useMemo(() => {
    if (!materialSearch.trim()) return materialOptions;
    const q = materialSearch.toLowerCase();
    return materialOptions.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q)),
    );
  }, [materialOptions, materialSearch]);

  // ─── KPI Stats ──────────────────────────────────────────────────────────

  const totalBomCount = boms.length;
  const totalComponentCount = useMemo(
    () => boms.reduce((sum, b) => sum + b.itemCount, 0),
    [boms],
  );
  const avgComponentsPerBom = totalBomCount > 0 ? (totalComponentCount / totalBomCount).toFixed(1) : '0';

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const computeRowTotalCost = (item: BomItem) => {
    const effectiveQty = item.quantity * (1 + item.wasteRate / 100);
    return (item.material.listPrice || 0) * effectiveQty;
  };

  const totalMaterialCost = useMemo(() => {
    if (!bomDetail) return 0;
    return bomDetail.items.reduce((sum, item) => sum + computeRowTotalCost(item), 0);
  }, [bomDetail]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const openCreateDialog = useCallback(() => {
    setEditingBomId(null);
    setFormProductId('');
    setFormNotes('');
    setFormMaterials([]);
    setProductSearch('');
    setMaterialSearch('');
    setActiveMatRowIndex(null);
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback(
    (bom: BomDetail) => {
      setEditingBomId(bom.id);
      setFormProductId(bom.productId);
      setFormNotes(bom.notes || '');
      setFormMaterials(
        bom.items.map((item) => ({
          materialId: item.materialId,
          materialName: item.material.name,
          quantity: item.quantity,
          unit: item.unit,
          wasteRate: item.wasteRate,
        })),
      );
      setProductSearch('');
      setMaterialSearch('');
      setActiveMatRowIndex(null);
      setIsDialogOpen(true);
    },
    [],
  );

  const addMaterialRow = useCallback(() => {
    setFormMaterials((prev) => [
      ...prev,
      { materialId: '', materialName: '', quantity: 1, unit: 'Adet', wasteRate: 0 },
    ]);
  }, []);

  const removeMaterialRow = useCallback((index: number) => {
    setFormMaterials((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateMaterialRow = useCallback((index: number, updates: Partial<FormMaterialRow>) => {
    setFormMaterials((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }, []);

  const selectMaterial = useCallback(
    (index: number, mat: ProductOption) => {
      updateMaterialRow(index, {
        materialId: mat.id,
        materialName: mat.name,
        unit: mat.unit,
      });
      setActiveMatRowIndex(null);
      setMaterialSearch('');
    },
    [updateMaterialRow],
  );

  const handleSubmit = useCallback(async () => {
    if (!formProductId) {
      toast.error(t('selectProductRequired'));
      return;
    }
    if (formMaterials.length === 0) {
      toast.error(t('addMaterialRequired'));
      return;
    }
    if (formMaterials.some((m) => !m.materialId)) {
      toast.error(t('addMaterialRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        productId: formProductId,
        notes: formNotes,
        items: formMaterials.map((m, i) => ({
          materialId: m.materialId,
          quantity: Number(m.quantity),
          unit: m.unit,
          wasteRate: Number(m.wasteRate),
          sortOrder: i,
        })),
      };

      const url = editingBomId ? `/api/v1/bom/${editingBomId}` : '/api/v1/bom';
      const method = editingBomId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingBomId ? t('updateSuccess') : t('createSuccess'));
        setIsDialogOpen(false);
        mutateBomList();
        if (editingBomId && selectedBomId === editingBomId) {
          mutateBomDetail();
        }
      } else {
        toast.error(data.error || t('createError'));
      }
    } catch {
      toast.error(t('createError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formProductId, formNotes, formMaterials, editingBomId, selectedBomId, mutateBomList, mutateBomDetail]);

  const handleDelete = useCallback(
    async (bomId: string) => {
      const ok = await confirm({ message: t('deleteConfirm'), confirmText: t('deleteBtn'), variant: 'danger' });
      if (!ok) return;
      try {
        const response = await fetch(`/api/v1/bom/${bomId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
          toast.success(t('deleteSuccess'));
          setSelectedBomId(null);
          mutateBomList();
        } else {
          toast.error(data.error || t('deleteError'));
        }
      } catch {
        toast.error(t('deleteError'));
      }
    },
    [mutateBomList],
  );

  const handleCalculateCost = useCallback(async (bomId: string) => {
    setIsCalculatingCost(true);
    setCostData(null);
    try {
      const response = await fetch(`/api/v1/bom/${bomId}/cost`);
      const data = await response.json();
      if (data.success) {
        setCostData(data.data);
      } else {
        toast.error(data.error || t('createError'));
      }
    } catch {
      toast.error(t('createError'));
    } finally {
      setIsCalculatingCost(false);
    }
  }, []);

  // ─── Loading state ──────────────────────────────────────────────────────

  if (bomListLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="h-8 w-56 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        {/* KPI skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
        {/* Search bar skeleton */}
        <div className="h-12 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
        {/* Table skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────

  if (bomListError) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 py-12 px-6">
          <div className="rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900 p-4 mb-4">
            <Layers className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg font-medium text-red-700 dark:text-red-300">
            {t('createError')}
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {t('createError')}
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('noBomDesc')}
        </p>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total BOM count */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-lg">
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -right-1 -bottom-4 h-14 w-14 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100">{t('kpi.totalBoms')}</p>
              <p className="text-2xl font-bold">{totalBomCount}</p>
            </div>
          </div>
        </div>

        {/* Total component count */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-lg">
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -right-1 -bottom-4 h-14 w-14 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-100">{t('kpi.totalComponents')}</p>
              <p className="text-2xl font-bold">{totalComponentCount}</p>
            </div>
          </div>
        </div>

        {/* Avg components per BOM */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 p-4 text-white shadow-lg">
          <div className="absolute -right-3 -top-3 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -right-1 -bottom-4 h-14 w-14 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-violet-100">{t('kpi.avgPerBom')}</p>
              <p className="text-2xl font-bold">{avgComponentsPerBom}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / Filter Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-gray-50 dark:bg-gray-900 p-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={openCreateDialog} className="w-full sm:w-auto rounded-lg">
          <Plus className="mr-2 h-4 w-4" />
          {t('newBom')}
        </Button>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {filteredBoms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 bg-white dark:bg-gray-950">
          <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-6 mb-5">
            <Layers className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('noBoms')}
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm text-center">
            {t('noBomDesc')}
          </p>
          <Button onClick={openCreateDialog} className="mt-5 rounded-lg">
            <Plus className="mr-2 h-4 w-4" />
            {t('newBom')}
          </Button>
        </div>
      ) : (
        <>
          {/* ── Mobile Card View ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredBoms.map((bom) => (
              <div
                key={bom.id}
                className={cn(
                  'rounded-2xl bg-white dark:bg-gray-900 shadow-md p-4 border-l-4 cursor-pointer',
                  'active:scale-[0.98] transition-all duration-150',
                  bom.isActive
                    ? 'border-l-emerald-500'
                    : 'border-l-gray-400 dark:border-l-gray-600',
                )}
                onClick={() => {
                  setSelectedBomId(bom.id);
                  setCostData(null);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {bom.product.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {bom.product.code ?? '-'} &middot; v{bom.version}
                    </p>
                  </div>
                  <Badge
                    variant={bom.isActive ? 'default' : 'secondary'}
                    className={cn(
                      'ml-2 shrink-0',
                      bom.isActive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    )}
                  >
                    {bom.isActive ? t('table.active') : t('table.inactive')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Boxes className="h-3.5 w-3.5" />
                    <span>{bom.itemCount} {t('kpi.materials')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(bom.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop Table View ───────────────────────────────────────────── */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 dark:bg-gray-900/80">
                    <TableHead className="whitespace-nowrap font-semibold">{t('table.product')}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{t('table.product')}</TableHead>
                    <TableHead className="text-center whitespace-nowrap font-semibold">{t('table.version')}</TableHead>
                    <TableHead className="text-center whitespace-nowrap font-semibold">{t('table.materials')}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{t('table.status')}</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">{t('table.updated')}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoms.map((bom) => (
                    <TableRow
                      key={bom.id}
                      className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                      onClick={() => {
                        setSelectedBomId(bom.id);
                        setCostData(null);
                      }}
                    >
                      <TableCell className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {bom.product.code ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 shrink-0">
                            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="max-w-xs truncate font-medium text-gray-900 dark:text-gray-100">
                            {bom.product.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <Badge variant="outline" className="font-mono text-xs">
                          v{bom.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Boxes className="h-3.5 w-3.5" />
                          {bom.itemCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={bom.isActive ? 'default' : 'secondary'}
                          className={cn(
                            bom.isActive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                          )}
                        >
                          {bom.isActive ? t('table.active') : t('table.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(bom.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBomId(bom.id);
                                setCostData(null);
                              }}
                            >
                              <Layers className="mr-2 h-4 w-4" />
                              {t('detail.title')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(bom.id);
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

      {/* ── BOM Detail Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={!!selectedBomId} onOpenChange={(open) => !open && setSelectedBomId(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
          {bomDetail ? (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl">{bomDetail.product.name}</SheetTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge
                    variant={bomDetail.isActive ? 'default' : 'secondary'}
                    className={cn(
                      bomDetail.isActive && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    )}
                  >
                    {bomDetail.isActive ? t('table.active') : t('table.inactive')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t('detail.version')} {bomDetail.version}
                  </span>
                  {bomDetail.product.code && (
                    <span className="text-sm text-muted-foreground">
                      {bomDetail.product.code}
                    </span>
                  )}
                </div>
              </SheetHeader>

              {/* Materials table */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('form.materials')}</h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80 dark:bg-gray-900/80">
                        <TableHead>{t('detail.material')}</TableHead>
                        <TableHead>{t('table.product')}</TableHead>
                        <TableHead className="text-right">{t('detail.quantity')}</TableHead>
                        <TableHead>{t('detail.material')}</TableHead>
                        <TableHead className="text-right">{t('detail.waste')}</TableHead>
                        <TableHead className="text-right">{t('detail.unitPrice')}</TableHead>
                        <TableHead className="text-right">{t('detail.totalCost')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomDetail.items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
                          <TableCell className="font-medium text-sm">{item.material.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.material.code ?? '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{item.unit}</TableCell>
                          <TableCell className="text-right text-sm">%{item.wasteRate}</TableCell>
                          <TableCell className="text-right text-sm">
                            {formatPrice(item.material.listPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatPrice(computeRowTotalCost(item))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Inline totals */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('detail.totalMaterialCost')}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPrice(totalMaterialCost)}</span>
                  </div>
                </div>

                {/* Cost Calculation Section */}
                {costData && (
                  <Card className="rounded-xl border-gray-200 dark:border-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('detail.costBreakdown')}</CardTitle>
                      <CardDescription>{t('detail.costBreakdown')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('detail.totalMaterialCost')}:</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatPrice(costData.summary.totalMaterialCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('detail.laborCost')}:</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatPrice(costData.summary.laborCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('detail.overheadCost')} (%{costData.summary.overheadRate}):</span>
                          <span className="text-gray-900 dark:text-gray-100">{formatPrice(costData.summary.overheadCost)}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-2 mt-2" />
                        <div className="flex justify-between font-bold text-base">
                          <span className="text-gray-900 dark:text-gray-100">{t('detail.totalProductionCost')}:</span>
                          <span className="text-blue-600 dark:text-blue-400">{formatPrice(costData.summary.totalProductionCost)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {bomDetail.notes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{t('detail.notes')}</h3>
                    <p className="text-sm text-muted-foreground rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                      {bomDetail.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-4">
                  <Button
                    onClick={() => handleCalculateCost(bomDetail.id)}
                    disabled={isCalculatingCost}
                    variant="outline"
                    className="flex-1 rounded-lg"
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    {isCalculatingCost ? t('detail.calculating') : t('detail.calculateCost')}
                  </Button>
                  <Button
                    onClick={() => openEditDialog(bomDetail)}
                    variant="outline"
                    className="flex-1 rounded-lg"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    {t('editBtn')}
                  </Button>
                  <Button
                    onClick={() => handleDelete(bomDetail.id)}
                    variant="outline"
                    className="flex-1 rounded-lg text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-950"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('deleteBtn')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBomId ? t('form.editTitle') : t('form.createTitle')}</DialogTitle>
            <DialogDescription>
              {editingBomId
                ? t('form.editDesc')
                : t('form.createDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Product Selector */}
            <div className="grid gap-2">
              <Label>{t('form.selectProduct')}</Label>
              {editingBomId ? (
                <Input
                  disabled
                  value={
                    productOptions.find((p) => p.id === formProductId)?.name || formProductId
                  }
                />
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('form.searchProduct')}
                    className="pl-10"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => setProductSearch(productSearch)}
                  />
                  {formProductId && (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {productOptions.find((p) => p.id === formProductId)?.name ?? formProductId}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setFormProductId('')}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {productSearch && filteredProductOptions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filteredProductOptions.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => {
                            setFormProductId(p.id);
                            setProductSearch('');
                          }}
                        >
                          <span className="font-medium">{p.name}</span>
                          {p.code && (
                            <span className="ml-2 text-muted-foreground">({p.code})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t('form.notes')}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('form.notesPlaceholder')}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Materials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('form.materials')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
                  <Plus className="mr-1 h-3 w-3" />
                  {t('form.addMaterial')}
                </Button>
              </div>

              {formMaterials.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center text-sm text-muted-foreground bg-gray-50/50 dark:bg-gray-900/50">
                  {t('form.noMaterials')}
                </div>
              )}

              {formMaterials.map((row, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-3 bg-white dark:bg-gray-950"
                >
                  {/* Material selector */}
                  <div className="relative">
                    {row.materialId ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{row.materialName}</span>
                          <Badge variant="outline" className="text-xs">
                            {row.unit}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateMaterialRow(index, {
                              materialId: '',
                              materialName: '',
                              unit: 'Adet',
                            })
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder={t('form.searchMaterial')}
                          className="pl-10"
                          value={activeMatRowIndex === index ? materialSearch : ''}
                          onChange={(e) => {
                            setActiveMatRowIndex(index);
                            setMaterialSearch(e.target.value);
                          }}
                          onFocus={() => {
                            setActiveMatRowIndex(index);
                            setMaterialSearch('');
                          }}
                        />
                        {activeMatRowIndex === index && materialSearch && filteredMaterialOptions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                            {filteredMaterialOptions.slice(0, 15).map((mat) => (
                              <button
                                key={mat.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => selectMaterial(index, mat)}
                              >
                                <span className="font-medium">{mat.name}</span>
                                {mat.code && (
                                  <span className="ml-2 text-muted-foreground">({mat.code})</span>
                                )}
                                <span className="ml-2 text-muted-foreground">&middot; {mat.unit}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity, waste, remove */}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t('form.quantity')}</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantity || ''}
                        onChange={(e) =>
                          updateMaterialRow(index, { quantity: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-muted-foreground">{t('form.waste')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={row.wasteRate || ''}
                        onChange={(e) =>
                          updateMaterialRow(index, { wasteRate: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => removeMaterialRow(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              {t('form.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? t('form.saving')
                : editingBomId
                  ? t('form.update')
                  : t('form.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
