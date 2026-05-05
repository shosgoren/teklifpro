'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Calculator, Edit, Trash2, ClipboardList, Layers, Package,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { useConfirm } from '@/shared/components/confirm-dialog'
import { usePermissions } from '@/shared/hooks/usePermissions'
import {
  DetailPanel,
  DetailPanelHeader,
  DetailPanelBody,
  DetailPanelSection,
  DetailPanelFooter,
  InlineField,
} from '@/shared/components/DetailPanel'
import { cn } from '@/shared/utils/cn'

// ── Types ──────────────────────────────────────────

interface MaterialDetail {
  id: string
  code: string | null
  name: string
  unit: string
  stockQuantity: number
  listPrice: number
}

interface BomItem {
  id: string
  materialId: string
  material: MaterialDetail
  quantity: number
  unit: string
  wasteRate: number
  notes: string | null
  sortOrder: number
}

interface BomDetail {
  id: string
  productId: string
  product: { id: string; code: string | null; name: string; unit: string }
  version: number
  isActive: boolean
  notes: string | null
  items: BomItem[]
  createdAt: string
  updatedAt: string
}

interface CostSummary {
  totalMaterialCost: number
  laborCost: number
  overheadRate: number
  overheadCost: number
  totalProductionCost: number
}

interface CostData {
  bomId: string
  product: { id: string; code: string | null; name: string }
  version: number
  materialBreakdown: Array<{
    materialId: string
    materialName: string
    unit: string
    quantity: number
    wasteRate: number
    effectiveQuantity: number
    unitPrice: number
    totalCost: number
  }>
  summary: CostSummary
}

interface BomDetailPanelProps {
  bom: BomDetail | null
  open: boolean
  onClose: () => void
  onMutate?: () => void
  onEdit?: (bom: BomDetail) => void
  formatPrice: (price: number) => string
}

// ── Component ──────────────────────────────────────

export default function BomDetailPanel({ bom, open, onClose, onMutate, onEdit, formatPrice }: BomDetailPanelProps) {
  const t = useTranslations('bomPage')
  const tc = useTranslations('common')
  const confirm = useConfirm()
  const { can } = usePermissions()

  const [costData, setCostData] = useState<CostData | null>(null)
  const [isCalculatingCost, setIsCalculatingCost] = useState(false)

  const canUpdate = can('bom.update')
  const canDelete = can('bom.delete')

  const computeRowTotalCost = (item: BomItem) => {
    const effectiveQty = item.quantity * (1 + item.wasteRate / 100)
    return (item.material.listPrice || 0) * effectiveQty
  }

  const totalMaterialCost = useMemo(() => {
    if (!bom) return 0
    return bom.items.reduce((sum, item) => sum + computeRowTotalCost(item), 0)
  }, [bom])

  if (!bom) return null

  const handleCalculateCost = async () => {
    setIsCalculatingCost(true)
    setCostData(null)
    try {
      const res = await fetch(`/api/v1/bom/${bom.id}/cost`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setCostData(data.data)
    } catch {
      toast.error(tc('error'))
    } finally {
      setIsCalculatingCost(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({ message: t('deleteConfirm'), confirmText: t('deleteBtn'), variant: 'danger' })
    if (!ok) return
    try {
      const res = await fetch(`/api/v1/bom/${bom.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error()
      toast.success(t('deleted'))
      onClose()
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
  }

  const handleFieldUpdate = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/v1/bom/${bom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error()
      onMutate?.()
    } catch {
      toast.error(tc('error'))
    }
  }

  return (
    <DetailPanel open={open} onClose={onClose} width="600px">
      <DetailPanelHeader gradient="from-blue-600 to-cyan-600" onClose={onClose}>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate pr-8">{bom.product.name}</h2>
          <p className="text-sm text-white/70 mt-0.5 font-mono">{bom.product.code ?? '-'}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={cn(
              'border-0 text-xs',
              bom.isActive
                ? 'bg-emerald-500/20 text-white hover:bg-emerald-500/30'
                : 'bg-white/20 text-white hover:bg-white/30'
            )}>
              {bom.isActive ? t('table.active') : t('table.inactive')}
            </Badge>
            <span className="text-xs text-white/60">v{bom.version}</span>
          </div>
        </div>
      </DetailPanelHeader>

      <DetailPanelBody>
        {/* Materials Table */}
        <DetailPanelSection
          title={t('form.materials')}
          icon={<Layers className="h-3.5 w-3.5 text-muted-foreground" />}
          className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-gray-900/80">
                  <TableHead className="text-xs">{t('detail.material')}</TableHead>
                  <TableHead className="text-xs text-right">{t('detail.quantity')}</TableHead>
                  <TableHead className="text-xs text-right">{t('detail.waste')}</TableHead>
                  <TableHead className="text-xs text-right">{t('detail.unitPrice')}</TableHead>
                  <TableHead className="text-xs text-right">{t('detail.totalCost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bom.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
                    <TableCell>
                      <p className="text-sm font-medium">{item.material.name}</p>
                      {item.material.code && (
                        <p className="text-xs text-muted-foreground">{item.material.code}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-sm">%{item.wasteRate}</TableCell>
                    <TableCell className="text-right text-sm">{formatPrice(item.material.listPrice)}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatPrice(computeRowTotalCost(item))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('detail.totalMaterialCost')}</span>
            <span className="text-lg font-bold">{formatPrice(totalMaterialCost)}</span>
          </div>
        </DetailPanelSection>

        {/* Cost Breakdown */}
        {costData && (
          <DetailPanelSection
            title={t('detail.costBreakdown')}
            icon={<Calculator className="h-3.5 w-3.5 text-muted-foreground" />}
            className="border border-gray-200 dark:border-gray-800"
          >
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('detail.totalMaterialCost')}</span>
                <span>{formatPrice(costData.summary.totalMaterialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('detail.laborCost')}</span>
                <span>{formatPrice(costData.summary.laborCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('detail.overheadCost')} (%{costData.summary.overheadRate})</span>
                <span>{formatPrice(costData.summary.overheadCost)}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-2 mt-2" />
              <div className="flex justify-between font-bold text-base">
                <span>{t('detail.totalProductionCost')}</span>
                <span className="text-blue-600 dark:text-blue-400">{formatPrice(costData.summary.totalProductionCost)}</span>
              </div>
            </div>
          </DetailPanelSection>
        )}

        {/* Notes */}
        <DetailPanelSection>
          <InlineField
            label={t('detail.notes')}
            value={bom.notes}
            editable={canUpdate}
            onSave={canUpdate ? (v) => handleFieldUpdate('notes', v) : undefined}
            type="textarea"
            placeholder="-"
          />
        </DetailPanelSection>
      </DetailPanelBody>

      <DetailPanelFooter>
        <Button
          onClick={handleCalculateCost}
          disabled={isCalculatingCost}
          variant="outline"
          className="flex-1 rounded-xl h-10"
        >
          <Calculator className="mr-2 h-4 w-4" />
          {isCalculatingCost ? t('detail.calculating') : t('detail.calculateCost')}
        </Button>
        {canUpdate && (
          <Button
            className="flex-1 rounded-xl h-10"
            onClick={() => { onClose(); onEdit?.(bom) }}
          >
            <Edit className="mr-2 h-4 w-4" />
            {t('editBtn')}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </DetailPanelFooter>
    </DetailPanel>
  )
}
