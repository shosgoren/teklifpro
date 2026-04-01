'use client'

import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  Send,
  FileText,
  Copy,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  Package,
  Settings,
  Eye,
  Minus,
  Percent,
  ChevronDown,
  ArrowLeftRight,
  Copy as CopyIcon,
} from 'lucide-react'

import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Textarea } from '@/presentation/components/ui/textarea'
import { Label } from '@/presentation/components/ui/label'
import { Separator } from '@/presentation/components/ui/separator'
import { Badge } from '@/presentation/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/presentation/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/ui/popover'
import { cn } from '@/shared/utils/cn'
import { calculateLineTotal, calculateProposalTotals, formatCurrency } from '@/shared/utils/proposal'

// ── Validation ────────────────────────────────────────────

const customerSchema = z.object({
  id: z.string().min(1, 'Customer is required'),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  taxNumber: z.string(),
  contactPersonId: z.string().min(1, 'Contact person is required'),
})

const productItemSchema = z.object({
  id: z.string().min(1, 'Product is required'),
  name: z.string(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
  discountType: z.enum(['percent', 'fixed']).default('percent'),
  discountPercent: z.number().min(0).max(100).default(0),
  discountFixed: z.number().min(0).default(0),
  vatPercent: z.number().min(0).max(100).default(18),
})

const proposalFormSchema = z.object({
  customer: customerSchema,
  items: z.array(productItemSchema).min(1, 'At least one product is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  generalDiscount: z.object({
    type: z.enum(['percent', 'fixed']),
    value: z.number().min(0).default(0),
  }),
  validityDays: z.number().min(1).max(365).default(30),
  paymentTerms: z.string().default('Net 30'),
  deliveryTerms: z.string().default('Standard'),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
})

type ProposalFormData = z.infer<typeof proposalFormSchema>

const apiFetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

// ── Step 1: Customer Selection ────────────────────────────

function CustomerSelectionStep({ selectedCustomer, onSelect }: {
  selectedCustomer: ProposalFormData['customer'] | null
  onSelect: (customer: any, contact: any) => void
}) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: customersData } = useSWR('/api/v1/customers?limit=100', apiFetcher)
  const customers: any[] = customersData?.data?.customers ?? []

  const filteredCustomers = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter((c: any) =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(search))
    )
  }, [search, customers])

  const handleSelectCustomer = (customer: any) => {
    onSelect(
      {
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        taxNumber: customer.taxNumber || '',
        contactPersonId: customer.id,
      },
      { id: customer.id, name: customer.name }
    )
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">
          {t('proposals.steps.selectCustomer')}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn('w-full justify-start text-left font-normal h-12 rounded-xl', !selectedCustomer && 'text-muted-foreground')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              {selectedCustomer ? selectedCustomer.name : t('proposals.selectCustomer')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput placeholder={t('proposals.searchCustomer')} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>{t('proposals.noCustomer')}</CommandEmpty>
                <CommandGroup>
                  {filteredCustomers.map((customer: any) => (
                    <CommandItem key={customer.id} onSelect={() => handleSelectCustomer(customer)}>
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{customer.name}</p>
                          {customer.email && <p className="text-xs text-muted-foreground truncate">{customer.email}</p>}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCustomer && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-emerald-200/30 dark:bg-emerald-800/20" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg shadow-emerald-500/20">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-100">{selectedCustomer.name}</h3>
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{selectedCustomer.email}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
                {selectedCustomer.taxNumber && <span>VN: {selectedCustomer.taxNumber}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Product Selection (Redesigned) ────────────────

function ProductSelectionStep({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  generalDiscount,
  onGeneralDiscountChange,
}: {
  items: ProposalFormData['items']
  onAddItem: (item: ProposalFormData['items'][0]) => void
  onUpdateItem: (index: number, item: Partial<ProposalFormData['items'][0]>) => void
  onRemoveItem: (index: number) => void
  onReorderItems: (items: ProposalFormData['items']) => void
  generalDiscount: ProposalFormData['generalDiscount']
  onGeneralDiscountChange: (gd: ProposalFormData['generalDiscount']) => void
}) {
  const t = useTranslations()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)

  const { data: productsData } = useSWR('/api/v1/products?limit=100', apiFetcher)
  const allProducts: any[] = productsData?.data?.products ?? []

  const filteredProducts = useMemo(() => {
    if (!search) return allProducts
    const q = search.toLowerCase()
    return allProducts.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q))
    )
  }, [search, allProducts])

  const handleAddProduct = (product: any) => {
    if (replacingIndex !== null) {
      // Replace: keep quantity and discount settings, swap product
      const existing = items[replacingIndex]
      onUpdateItem(replacingIndex, {
        id: product.id,
        name: product.name,
        unitPrice: product.listPrice || 0,
        vatPercent: product.vatRate || 18,
      })
      setReplacingIndex(null)
    } else {
      onAddItem({
        id: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.listPrice || 0,
        discountType: 'percent',
        discountPercent: 0,
        discountFixed: 0,
        vatPercent: product.vatRate || 18,
      })
    }
    setSearch('')
    setSearchOpen(false)
  }

  const handleReplaceProduct = (index: number) => {
    setReplacingIndex(index)
    setSearchOpen(true)
    setSearch('')
  }

  const handleDuplicateItem = (index: number) => {
    const item = items[index]
    onAddItem({ ...item })
  }

  const toggleExpand = (index: number) => {
    const next = expandedItem === index ? null : index
    setExpandedItem(next)
    if (next !== null) scrollToCard(next)
  }

  // Convert fixed discounts to effective percent for calculation
  const itemsForCalc = useMemo(() => items.map(item => {
    if (item.discountType === 'fixed' && item.discountFixed > 0) {
      const lineSubtotal = item.quantity * item.unitPrice
      const effectivePercent = lineSubtotal > 0 ? (item.discountFixed / lineSubtotal) * 100 : 0
      return { ...item, discountPercent: Math.min(effectivePercent, 100) }
    }
    return item
  }), [items])

  const totals = useMemo(() => calculateProposalTotals(itemsForCalc, generalDiscount), [itemsForCalc, generalDiscount])

  const getEffectiveItem = (item: ProposalFormData['items'][0]) => {
    if (item.discountType === 'fixed' && item.discountFixed > 0) {
      const lineSubtotal = item.quantity * item.unitPrice
      const effectivePercent = lineSubtotal > 0 ? (item.discountFixed / lineSubtotal) * 100 : 0
      return { ...item, discountPercent: Math.min(effectivePercent, 100) }
    }
    return item
  }

  // Select-all on focus for number inputs
  const handleNumFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

  const scrollToCard = (index: number) => {
    setTimeout(() => {
      document.getElementById(`product-card-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 50)
  }

  return (
    <div className="space-y-5">
      {/* Product Search */}
      <Popover open={searchOpen} onOpenChange={(open) => { setSearchOpen(open); if (!open) setReplacingIndex(null) }}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-left group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-blue-700 dark:text-blue-300 text-sm">{t('proposals.create.addProduct')}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400">{t('proposals.searchProduct')}</p>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command shouldFilter={false}>
            {replacingIndex !== null && (
              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3 w-3" />
                  {t('proposals.create.replaceSearch')}
                </p>
              </div>
            )}
            <CommandInput placeholder={t('proposals.searchProduct')} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{t('proposals.noProduct')}</CommandEmpty>
              <CommandGroup>
                {filteredProducts.map((product: any) => (
                  <CommandItem key={product.id} onSelect={() => handleAddProduct(product)}>
                    <div className="flex items-center gap-3 w-full py-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                        <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.code && `${product.code} · `}{formatCurrency(product.listPrice || 0)}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Product Items */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => {
            const effectiveItem = getEffectiveItem(item)
            const lineTotal = calculateLineTotal(effectiveItem, 'with_vat')
            const lineTotalBeforeVat = calculateLineTotal(effectiveItem, 'before_vat')
            const isExpanded = expandedItem === index
            const hasDiscount = item.discountType === 'fixed' ? item.discountFixed > 0 : item.discountPercent > 0
            const discountDisplay = item.discountType === 'fixed'
              ? formatCurrency(item.discountFixed)
              : `${item.discountPercent}%`
            const discountAmount = item.quantity * item.unitPrice - lineTotalBeforeVat

            return (
              <div
                id={`product-card-${index}`}
                key={index}
                draggable
                onDragStart={() => setDragging(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging === null || dragging === index) return
                  const newItems = [...items]
                  const [draggedItem] = newItems.splice(dragging, 1)
                  newItems.splice(index, 0, draggedItem)
                  onReorderItems(newItems)
                  setDragging(null)
                }}
                className={cn(
                  'rounded-2xl border bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all overflow-hidden',
                  dragging === index && 'opacity-50 scale-[0.98]',
                  isExpanded && 'ring-2 ring-blue-200 dark:ring-blue-800'
                )}
              >
                {/* Main Row - Two-line layout on mobile for breathing room */}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hidden sm:block">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Item Number */}
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {index + 1}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</span>
                        {hasDiscount && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                            -{discountDisplay}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">KDV %{item.vatPercent}</span>
                      </div>
                    </div>

                    {/* Actions - always visible */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(index)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                          isExpanded
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'
                        )}
                      >
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity + Total row */}
                  <div className="flex items-center justify-between mt-3 gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                        className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onFocus={handleNumFocus}
                        onChange={(e) => onUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-16 h-9 text-center text-sm font-semibold rounded-lg border-gray-200 dark:border-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateItem(index, { quantity: item.quantity + 1 })}
                        className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="border-t bg-gray-50/50 dark:bg-gray-800/30 p-4 space-y-4">
                    {/* Unit Price - full width on mobile */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">{t('proposals.unitPrice')}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onFocus={handleNumFocus}
                          onChange={(e) => onUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="h-11 rounded-xl pr-8 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₺</span>
                      </div>
                    </div>

                    {/* Discount - with type toggle (% or ₺) */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">{t('proposals.discount')}</Label>
                      <div className="flex gap-2">
                        <div className="flex rounded-xl border overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateItem(index, { discountType: 'percent', discountFixed: 0 })}
                            className={cn(
                              'w-11 h-11 flex items-center justify-center text-sm font-bold transition-colors',
                              item.discountType === 'percent'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'
                            )}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateItem(index, { discountType: 'fixed', discountPercent: 0 })}
                            className={cn(
                              'w-11 h-11 flex items-center justify-center text-sm font-bold transition-colors',
                              item.discountType === 'fixed'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100'
                            )}
                          >
                            ₺
                          </button>
                        </div>
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={item.discountType === 'percent' ? 100 : undefined}
                            value={item.discountType === 'percent' ? (item.discountPercent || '') : (item.discountFixed || '')}
                            placeholder="0"
                            onFocus={handleNumFocus}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              if (item.discountType === 'percent') {
                                onUpdateItem(index, { discountPercent: Math.min(val, 100) })
                              } else {
                                onUpdateItem(index, { discountFixed: val })
                              }
                            }}
                            className="h-11 rounded-xl pr-8 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {item.discountType === 'percent' ? '%' : '₺'}
                          </span>
                        </div>
                      </div>
                      {hasDiscount && (
                        <p className="text-xs text-red-500 mt-1.5">
                          {t('proposals.discount')}: -{formatCurrency(discountAmount)}
                        </p>
                      )}
                    </div>

                    {/* VAT + Total side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">{t('proposals.vat')}</Label>
                        <Select
                          value={String(item.vatPercent)}
                          onValueChange={(v) => onUpdateItem(index, { vatPercent: Number(v) })}
                        >
                          <SelectTrigger className="h-11 rounded-xl text-sm font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">%0</SelectItem>
                            <SelectItem value="1">%1</SelectItem>
                            <SelectItem value="8">%8</SelectItem>
                            <SelectItem value="10">%10</SelectItem>
                            <SelectItem value="18">%18</SelectItem>
                            <SelectItem value="20">%20</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">{t('proposals.total')}</Label>
                        <div className="h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                          <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">{formatCurrency(lineTotal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span>{t('proposals.subtotal')}: {formatCurrency(item.quantity * item.unitPrice)}</span>
                      {hasDiscount && <span className="text-red-500">{t('proposals.discount')}: -{formatCurrency(discountAmount)}</span>}
                      <span>{t('proposals.vat')}: +{formatCurrency(lineTotal - lineTotalBeforeVat)}</span>
                    </div>

                    {/* Item Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleReplaceProduct(index)}
                        className="rounded-lg text-xs gap-1.5 h-9"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        {t('proposals.create.replaceProduct')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateItem(index)}
                        className="rounded-lg text-xs gap-1.5 h-9"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                        {t('proposals.create.duplicateItem')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveItem(index)}
                        className="rounded-lg text-xs gap-1.5 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 ml-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('proposals.create.removeItem')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('proposals.noItems')}</p>
        </div>
      )}

      {/* General Discount Section */}
      {items.length > 0 && (
        <div className="rounded-2xl border bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{t('proposals.generalDiscount')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={generalDiscount.type}
                onValueChange={(v) => onGeneralDiscountChange({ ...generalDiscount, type: v as 'percent' | 'fixed' })}
              >
                <SelectTrigger className="w-16 h-9 rounded-lg text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="fixed">₺</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={generalDiscount.value || ''}
                onFocus={handleNumFocus}
                onChange={(e) => onGeneralDiscountChange({ ...generalDiscount, value: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-24 h-9 rounded-lg text-sm font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          {generalDiscount.value > 0 && (
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-2 text-right">
              -{formatCurrency(totals.discountAmount)}
            </p>
          )}
        </div>
      )}

      {/* Running Totals */}
      {items.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 shadow-xl shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-blue-200 mb-0.5">{t('proposals.subtotal')}</p>
              <p className="text-lg font-bold">{formatCurrency(totals.subtotal)}</p>
            </div>
            {totals.discountAmount > 0 && (
              <div>
                <p className="text-xs text-blue-200 mb-0.5">{t('proposals.discount')}</p>
                <p className="text-lg font-bold text-red-300">-{formatCurrency(totals.discountAmount)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-blue-200 mb-0.5">{t('proposals.vat')}</p>
              <p className="text-lg font-bold">{formatCurrency(totals.vatAmount)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-blue-200 mb-0.5">{t('proposals.total')}</p>
              <p className="text-2xl font-extrabold">{formatCurrency(totals.grandTotal)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Details ───────────────────────────────────────

function DetailsStep({
  data,
  onChange,
}: {
  data: Partial<ProposalFormData>
  onChange: (field: string, value: any) => void
}) {
  const t = useTranslations()

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">{t('proposals.title')}</Label>
        <Input
          id="title"
          value={data.title || ''}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder={t('proposals.create.proposalTitle')}
          className="mt-2 h-12 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validity">{t('proposals.validityDays')}</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="validity"
              type="number"
              min="1"
              max="365"
              value={data.validityDays || 30}
              onChange={(e) => onChange('validityDays', parseInt(e.target.value) || 30)}
              className="h-11 rounded-xl"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t('proposals.days')}</span>
          </div>
        </div>
        <div>
          <Label htmlFor="payment">{t('proposals.paymentTerms')}</Label>
          <Select
            value={data.paymentTerms || 'Net 30'}
            onValueChange={(value) => onChange('paymentTerms', value)}
          >
            <SelectTrigger id="payment" className="mt-2 h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Due Upon Receipt">Due Upon Receipt</SelectItem>
              <SelectItem value="Net 15">Net 15</SelectItem>
              <SelectItem value="Net 30">Net 30</SelectItem>
              <SelectItem value="Net 45">Net 45</SelectItem>
              <SelectItem value="Net 60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="delivery">{t('proposals.deliveryTerms')}</Label>
        <Select
          value={data.deliveryTerms || 'Standard'}
          onValueChange={(value) => onChange('deliveryTerms', value)}
        >
          <SelectTrigger id="delivery" className="mt-2 h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="Express">Express</SelectItem>
            <SelectItem value="Overnight">Overnight</SelectItem>
            <SelectItem value="Same Day">Same Day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">{t('proposals.notes')}</Label>
        <Textarea
          id="notes"
          value={data.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder={t('proposals.create.notes')}
          className="mt-2 h-24 resize-none rounded-xl"
        />
      </div>

      <div>
        <Label htmlFor="terms">{t('proposals.termsConditions')}</Label>
        <Textarea
          id="terms"
          value={data.termsAndConditions || ''}
          onChange={(e) => onChange('termsAndConditions', e.target.value)}
          className="mt-2 h-32 resize-none rounded-xl"
        />
      </div>
    </div>
  )
}

// ── Step 4: Preview & Send ────────────────────────────────

function PreviewStep({
  data,
  totals,
}: {
  data: ProposalFormData
  totals: ReturnType<typeof calculateProposalTotals>
}) {
  const t = useTranslations()
  const [sendDialog, setSendDialog] = useState<'email' | 'whatsapp' | null>(null)

  const handleSendEmail = async () => {
    toast.success('Proposal sent via email!')
    setSendDialog(null)
  }

  const handleSendWhatsApp = async () => {
    toast.success('Proposal link copied to clipboard!')
    setSendDialog(null)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://proposal.link/abc123')
    toast.success('Link copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('proposals.preview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="border-b pb-6">
            <h1 className="text-2xl font-bold mb-2">{data.title}</h1>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">{t('proposals.customer')}</p>
                <p className="font-semibold">{data.customer.name}</p>
                <p className="text-xs text-muted-foreground">{data.customer.email}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs mb-1">{t('proposals.date')}</p>
                <p className="font-semibold">{new Date().toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">{data.validityDays} {t('proposals.days')}</p>
              </div>
            </div>
          </div>

          <div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold">{t('proposals.description')}</th>
                  <th className="text-right py-2 font-semibold w-16">{t('proposals.qty')}</th>
                  <th className="text-right py-2 font-semibold w-20">{t('proposals.unitPrice')}</th>
                  <th className="text-right py-2 font-semibold w-20">{t('proposals.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{item.name}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right font-medium">{formatCurrency(calculateLineTotal(item, 'with_vat'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-end text-sm">
              <div className="w-48">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">{t('proposals.subtotal')}</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between mb-2 text-red-600">
                    <span>{t('proposals.discount')}</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">{t('proposals.vat')}</span>
                  <span>{formatCurrency(totals.vatAmount)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>{t('proposals.total')}</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="bg-muted/50 p-4 rounded-xl border text-xs space-y-2">
              <p className="font-semibold">{t('proposals.notes')}</p>
              <p className="whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2 h-12 rounded-xl">
          <FileText className="h-4 w-4" />
          {t('proposals.saveDraft')}
        </Button>
        <Dialog open={sendDialog === 'email'} onOpenChange={(open) => setSendDialog(open ? 'email' : null)}>
          <Button variant="outline" className="gap-2 h-12 rounded-xl" onClick={() => setSendDialog('email')}>
            <Send className="h-4 w-4" />
            {t('proposals.sendEmail')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('proposals.sendEmail')}</DialogTitle>
              <DialogDescription>{t('proposals.emailWillSentTo')} {data.customer.email}</DialogDescription>
            </DialogHeader>
            <Button onClick={handleSendEmail} className="w-full rounded-xl">{t('proposals.send')}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Dialog open={sendDialog === 'whatsapp'} onOpenChange={(open) => setSendDialog(open ? 'whatsapp' : null)}>
          <Button variant="outline" className="gap-2 h-12 rounded-xl" onClick={() => setSendDialog('whatsapp')}>
            <MessageSquare className="h-4 w-4" />
            {t('proposals.sendWhatsApp')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('proposals.sendWhatsApp')}</DialogTitle>
              <DialogDescription>{t('proposals.whatsappMessageWillSentTo')} {data.customer.phone}</DialogDescription>
            </DialogHeader>
            <Button onClick={handleSendWhatsApp} className="w-full rounded-xl">{t('proposals.send')}</Button>
          </DialogContent>
        </Dialog>
        <Button variant="outline" className="gap-2 h-12 rounded-xl" onClick={handleCopyLink}>
          <Copy className="h-4 w-4" />
          {t('proposals.copyLink')}
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function CreateProposalPage() {
  const t = useTranslations()
  const router = useRouter()
  const locale = useLocale()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    mode: 'onChange',
    defaultValues: {
      customer: { id: '', name: '', email: '', phone: '', address: '', taxNumber: '', contactPersonId: '' },
      items: [],
      title: '',
      generalDiscount: { type: 'percent', value: 0 },
      validityDays: 30,
      paymentTerms: 'Net 30',
      deliveryTerms: 'Standard',
      notes: '',
      termsAndConditions: '',
    },
  })

  const formData = watch()
  const itemsForCalcMain = useMemo(() => formData.items.map((item: any) => {
    if (item.discountType === 'fixed' && item.discountFixed > 0) {
      const lineSubtotal = item.quantity * item.unitPrice
      const effectivePercent = lineSubtotal > 0 ? (item.discountFixed / lineSubtotal) * 100 : 0
      return { ...item, discountPercent: Math.min(effectivePercent, 100) }
    }
    return item
  }), [formData.items])
  const totals = useMemo(() => calculateProposalTotals(itemsForCalcMain, formData.generalDiscount), [itemsForCalcMain, formData.generalDiscount])

  const { fields: itemFields, append, update, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const handleAddItem = (item: ProposalFormData['items'][0]) => { append(item) }

  const handleUpdateItem = (index: number, updates: Partial<ProposalFormData['items'][0]>) => {
    const currentItem = itemFields[index]
    if (currentItem) update(index, { ...currentItem, ...updates })
  }

  const handleRemoveItem = (index: number) => { remove(index) }

  const handleReorderItems = (items: ProposalFormData['items']) => {
    itemFields.forEach((_, index) => { if (items[index]) update(index, items[index]) })
  }

  const handleSelectCustomer = (customer: any, contact: any) => {
    setValue('customer', customer)
    setSelectedContact(contact)
  }

  const steps = [
    { title: t('proposals.steps.selectCustomer'), icon: Building2, completed: !!formData.customer?.id },
    { title: t('proposals.steps.addProducts'), icon: Package, completed: formData.items.length > 0 },
    { title: t('proposals.steps.details'), icon: Settings, completed: !!formData.title },
    { title: t('proposals.steps.preview'), icon: Eye, completed: false },
  ]

  const onSubmit = async (data: ProposalFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (data.validityDays || 30))

      const payload = {
        customerId: data.customer.id,
        title: data.title,
        description: data.notes || '',
        items: data.items.map(item => ({
          name: item.name,
          description: '',
          unit: 'Adet',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountRate: item.discountPercent || 0,
          vatRate: item.vatPercent || 18,
        })),
        expiresAt: expiresAt.toISOString(),
        notes: data.notes || '',
        paymentTerms: data.paymentTerms || '',
        deliveryTerms: data.deliveryTerms || '',
      }

      const res = await fetch('/api/v1/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || t('proposals.error'))
      toast.success(t('proposals.saved'))
      router.push(`/${locale}/proposals/${result.data.id}`)
    } catch (error) {
      console.error('Proposal creation error:', error)
      toast.error(error instanceof Error ? error.message : t('proposals.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-0">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {t('proposals.createNew')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('proposals.createDescription')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Stepper */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border shadow-sm p-4 md:p-6">
            <div className="flex justify-between items-center">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStep
                const isCompleted = step.completed && index < currentStep

                return (
                  <div key={index} className="flex items-center flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index < currentStep || steps[index - 1]?.completed || index === 0) setCurrentStep(index)
                      }}
                      className="flex flex-col items-center group"
                    >
                      <div
                        className={cn(
                          'w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-semibold transition-all mb-1.5',
                          isActive && 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-110',
                          isCompleted && 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20',
                          !isActive && !isCompleted && 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                        )}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <p className={cn(
                        'text-[10px] md:text-xs font-medium text-center max-w-20 md:max-w-24 leading-tight',
                        isActive && 'text-blue-600 dark:text-blue-400',
                        isCompleted && 'text-emerald-600 dark:text-emerald-400',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}>
                        {step.title}
                      </p>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        'flex-1 h-1 mx-2 md:mx-3 rounded-full transition-colors',
                        isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-200 dark:bg-gray-800'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="rounded-2xl bg-white dark:bg-gray-900 border shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b bg-gray-50/50 dark:bg-gray-800/30">
              <h2 className="text-lg font-bold">{steps[currentStep].title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentStep === 0 && t('proposals.selectCustomerDesc')}
                {currentStep === 1 && t('proposals.addProductsDesc')}
                {currentStep === 2 && t('proposals.detailsDesc')}
                {currentStep === 3 && t('proposals.previewDesc')}
              </p>
            </div>
            <div className="p-4 md:p-6">
              {currentStep === 0 && (
                <CustomerSelectionStep selectedCustomer={formData.customer} onSelect={handleSelectCustomer} />
              )}
              {currentStep === 1 && (
                <ProductSelectionStep
                  items={formData.items}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onReorderItems={handleReorderItems}
                  generalDiscount={formData.generalDiscount}
                  onGeneralDiscountChange={(gd) => setValue('generalDiscount', gd)}
                />
              )}
              {currentStep === 2 && (
                <DetailsStep data={formData} onChange={(field, value) => setValue(field as any, value)} />
              )}
              {currentStep === 3 && (
                <PreviewStep data={formData} totals={totals} />
              )}
            </div>
          </div>

          {/* Navigation - Mobile sticky bottom */}
          <div className="sticky bottom-0 md:relative bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t md:border md:rounded-2xl p-4 md:p-5 -mx-4 md:mx-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:shadow-sm">
            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="gap-2 h-11 rounded-xl flex-1 md:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{t('proposals.previous')}</span>
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  disabled={!steps[currentStep].completed}
                  className="gap-2 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 flex-1 md:flex-none"
                >
                  <span>{t('proposals.next')}</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="gap-2 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 flex-1 md:flex-none"
                  disabled={isSubmitting}
                >
                  <Check className="h-4 w-4" />
                  {isSubmitting ? '...' : t('proposals.createProposal')}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
