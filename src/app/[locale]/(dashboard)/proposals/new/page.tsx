'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { swrStaticOptions } from '@/shared/utils/swrConfig'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Logger } from '@/infrastructure/logger'
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges'
import {
  Search,
  Plus,
  Trash2,
  GripVertical,
  Send,
  FileText,
  MessageSquare,
  Check,
  Building2,
  Package,
  Eye,
  Minus,
  Percent,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Copy as CopyIcon,
  Mic,
  Save,
  Keyboard,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { Badge } from '@/shared/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/utils/cn'
import { calculateLineTotal, calculateProposalTotals, formatCurrency } from '@/shared/utils/proposal'
import { VoiceNoteRecorder } from '@/presentation/components/molecules/VoiceNoteRecorder'
import { DatePicker } from '@/shared/components/ui/date-picker'

const logger = new Logger('ProposalNewPage')

const AUTOSAVE_KEY = 'teklifpro_proposal_draft'
const AUTOSAVE_INTERVAL = 30_000

// ── Interfaces ───────────────────────────────────────────

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  district: string | null
  taxNumber: string | null
  taxOffice: string | null
  parasutId: string | null
  contacts: CustomerContact[]
}

interface CustomerContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  title: string | null
}

interface Product {
  id: string
  name: string
  code: string | null
  listPrice: number
  vatRate: number
  unit: string | null
  description: string | null
}

type ProposalFormField = keyof ProposalFormData

// ── Validation ────────────────────────────────────────────

const customerSchema = z.object({
  id: z.string().min(1, 'Customer is required'),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  taxNumber: z.string(),
  contactPersonId: z.string(),
})

const productItemSchema = z.object({
  id: z.string().min(1, 'Product is required'),
  name: z.string(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Price cannot be negative'),
  discountType: z.enum(['percent', 'fixed']).default('percent'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountFixed: z.coerce.number().min(0).default(0),
  vatPercent: z.coerce.number().min(0).max(100).default(18),
})

const proposalFormSchema = z.object({
  customer: customerSchema,
  proposalType: z.enum(['OFFICIAL', 'UNOFFICIAL']).default('OFFICIAL'),
  items: z.array(productItemSchema).min(1, 'At least one product is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  generalDiscount: z.object({
    type: z.enum(['percent', 'fixed']),
    value: z.coerce.number().min(0).default(0),
  }),
  validityDays: z.coerce.number().min(1).max(365).default(30),
  paymentTerms: z.string().default('Net 30'),
  deliveryTerms: z.string().default('Standard'),
  deliveryDate: z.date().nullable().optional(),
  installationDate: z.date().nullable().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  voiceNoteData: z.string().nullable().optional(),
  voiceNoteDuration: z.number().nullable().optional(),
})

type ProposalFormData = z.infer<typeof proposalFormSchema>

const apiFetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error')
    return data
  })

// ── Helper: effective item for calculations ──────────────

function getEffectiveItem(item: ProposalFormData['items'][0]) {
  if (item.discountType === 'fixed' && item.discountFixed > 0) {
    const lineSubtotal = item.quantity * item.unitPrice
    const effectivePercent = lineSubtotal > 0 ? (item.discountFixed / lineSubtotal) * 100 : 0
    return { ...item, discountPercent: Math.min(effectivePercent, 100) }
  }
  return item
}

function handleNumFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.select()
}

// ── LeftPanel ─────────────────────────────────────────────

function LeftPanel({
  formData,
  onSelectCustomer,
  onProposalTypeChange,
  onChange,
  onDateChange,
  onVoiceNoteChange,
  collapsed,
  onToggleCollapse,
}: {
  formData: ProposalFormData
  onSelectCustomer: (customer: ProposalFormData['customer']) => void
  onProposalTypeChange: (type: 'OFFICIAL' | 'UNOFFICIAL') => void
  onChange: (field: string, value: string | number | boolean | null) => void
  onDateChange: (field: 'deliveryDate' | 'installationDate', value: Date | null) => void
  onVoiceNoteChange: (data: string | null, duration: number | null) => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const t = useTranslations()
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')

  const { data: customersData } = useSWR('/api/v1/customers?limit=100', apiFetcher, swrStaticOptions)
  const customers: Customer[] = customersData?.data?.customers ?? []

  const { data: calendarData } = useSWR('/api/v1/calendar', apiFetcher, swrStaticOptions)
  const disabledDeliveryDates: string[] = calendarData?.data?.disabledDeliveryDates ?? []
  const disabledInstallationDates: string[] = calendarData?.data?.disabledInstallationDates ?? []

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter((c: Customer) =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(customerSearch))
    )
  }, [customerSearch, customers])

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      taxNumber: customer.taxNumber || '',
      contactPersonId: customer.id,
    })
    setCustomerOpen(false)
    setCustomerSearch('')
  }

  // Collapsed view for tablet (md-lg)
  if (collapsed) {
    return (
      <div className="hidden md:flex xl:hidden flex-col items-center w-14 border-r bg-white dark:bg-gray-900 py-4 gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Expand panel"
        >
          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
        </button>
        <Separator />
        <button
          type="button"
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
            formData.proposalType === 'OFFICIAL'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
          )}
          title={formData.proposalType === 'OFFICIAL' ? t('proposals.proposalTypeOfficial') : t('proposals.proposalTypeUnofficial')}
          onClick={() => onProposalTypeChange(formData.proposalType === 'OFFICIAL' ? 'UNOFFICIAL' : 'OFFICIAL')}
        >
          {formData.proposalType === 'OFFICIAL' ? <FileText className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => { onToggleCollapse(); setTimeout(() => setCustomerOpen(true), 200) }}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
            formData.customer.id ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          )}
          title={formData.customer.name || t('proposals.selectCustomer')}
        >
          <Building2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      'w-full md:w-72 xl:w-72 shrink-0 border-r bg-white dark:bg-gray-900 overflow-y-auto',
      'md:block'
    )}>
      <div className="p-4 space-y-5">
        {/* Collapse button for tablet */}
        <div className="hidden md:flex xl:hidden justify-end">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Collapse panel"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>
        </div>

        {/* Proposal Type Toggle */}
        <div>
          <Label className="text-xs font-medium mb-2 block text-muted-foreground uppercase tracking-wider">
            {t('proposals.proposalType')}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onProposalTypeChange('OFFICIAL')}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                formData.proposalType === 'OFFICIAL'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">{t('proposals.proposalTypeOfficial')}</span>
            </button>
            <button
              type="button"
              onClick={() => onProposalTypeChange('UNOFFICIAL')}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                formData.proposalType === 'UNOFFICIAL'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-500/20'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <Eye className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold">{t('proposals.proposalTypeUnofficial')}</span>
            </button>
          </div>
        </div>

        <Separator />

        {/* Customer Selection */}
        <div>
          <Label className="text-xs font-medium mb-2 block text-muted-foreground uppercase tracking-wider">
            {t('proposals.steps.selectCustomer')}
          </Label>
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-10 rounded-xl text-sm',
                  !formData.customer.id && 'text-muted-foreground'
                )}
              >
                <Building2 className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                  {formData.customer.id ? formData.customer.name : t('proposals.selectCustomer')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t('proposals.searchCustomer')}
                  value={customerSearch}
                  onValueChange={setCustomerSearch}
                />
                <CommandList>
                  <CommandEmpty>{t('proposals.noCustomer')}</CommandEmpty>
                  <CommandGroup>
                    {filteredCustomers.map((customer: Customer) => (
                      <CommandItem key={customer.id} onSelect={() => handleSelectCustomer(customer)}>
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            {customer.email && <p className="text-[11px] text-muted-foreground truncate">{customer.email}</p>}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected customer info */}
          {formData.customer.id && (
            <div className="mt-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {formData.customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 truncate">{formData.customer.name}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">{formData.customer.email}</p>
                </div>
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              </div>
              {(formData.customer.phone || formData.customer.taxNumber) && (
                <div className="flex flex-wrap gap-x-3 mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                  {formData.customer.phone && <span>{formData.customer.phone}</span>}
                  {formData.customer.taxNumber && <span>VKN: {formData.customer.taxNumber}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.title')}
          </Label>
          <Input
            id="title"
            value={formData.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder={t('proposals.create.proposalTitle')}
            className="mt-1.5 h-9 rounded-lg text-sm"
          />
        </div>

        {/* Validity */}
        <div>
          <Label htmlFor="validity" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.validityDays')}
          </Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              id="validity"
              type="number"
              min="1"
              max="365"
              value={formData.validityDays || 30}
              onChange={(e) => onChange('validityDays', parseInt(e.target.value) || 30)}
              className="h-9 rounded-lg text-sm flex-1"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('proposals.days')}</span>
          </div>
        </div>

        {/* Payment Terms */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.paymentTerms')}
          </Label>
          <Select
            value={formData.paymentTerms || 'Net 30'}
            onValueChange={(value) => onChange('paymentTerms', value)}
          >
            <SelectTrigger className="mt-1.5 h-9 rounded-lg text-sm">
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

        {/* Delivery Terms */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.deliveryTerms')}
          </Label>
          <Select
            value={formData.deliveryTerms || 'Standard'}
            onValueChange={(value) => onChange('deliveryTerms', value)}
          >
            <SelectTrigger className="mt-1.5 h-9 rounded-lg text-sm">
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

        {/* Dates */}
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('proposals.deliveryDate')}
            </Label>
            <div className="mt-1.5">
              <DatePicker
                value={formData.deliveryDate ?? undefined}
                onChange={(date) => onDateChange('deliveryDate', date ?? null)}
                disabledDates={disabledDeliveryDates}
                placeholder={t('proposals.selectDeliveryDate')}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('proposals.installationDate')}
            </Label>
            <div className="mt-1.5">
              <DatePicker
                value={formData.installationDate ?? undefined}
                onChange={(date) => onDateChange('installationDate', date ?? null)}
                disabledDates={disabledInstallationDates}
                placeholder={t('proposals.selectInstallationDate')}
                minDate={formData.deliveryDate ?? undefined}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.notes')}
          </Label>
          <Textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder={t('proposals.create.notes')}
            className="mt-1.5 h-20 resize-none rounded-lg text-sm"
          />
        </div>

        {/* Terms & Conditions */}
        <div>
          <Label htmlFor="terms" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t('proposals.termsConditions')}
          </Label>
          <Textarea
            id="terms"
            value={formData.termsAndConditions || ''}
            onChange={(e) => onChange('termsAndConditions', e.target.value)}
            className="mt-1.5 h-20 resize-none rounded-lg text-sm"
          />
        </div>

        {/* Voice Note */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Mic className="h-3.5 w-3.5 text-blue-500" />
            {t('proposals.voiceNote')}
          </Label>
          <p className="text-[11px] text-muted-foreground mb-2">{t('proposals.voiceNoteDesc')}</p>
          <VoiceNoteRecorder
            value={formData.voiceNoteData ?? null}
            duration={formData.voiceNoteDuration ?? null}
            onChange={onVoiceNoteChange}
            maxDuration={60}
            labels={{
              record: t('proposals.voiceRecord'),
              recording: t('proposals.voiceRecording'),
              stop: t('proposals.voiceStop'),
              play: t('proposals.voiceReady'),
              reRecord: t('proposals.voiceReRecord'),
              delete: t('proposals.voiceDelete'),
              maxDurationLabel: t('proposals.voiceMaxDuration'),
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ── ProductTable ──────────────────────────────────────────

function ProductTable({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  generalDiscount,
  onGeneralDiscountChange,
  proposalType,
}: {
  items: ProposalFormData['items']
  onAddItem: (item: ProposalFormData['items'][0]) => void
  onUpdateItem: (index: number, item: Partial<ProposalFormData['items'][0]>) => void
  onRemoveItem: (index: number) => void
  onReorderItems: (items: ProposalFormData['items']) => void
  generalDiscount: ProposalFormData['generalDiscount']
  onGeneralDiscountChange: (gd: ProposalFormData['generalDiscount']) => void
  proposalType: string
}) {
  const t = useTranslations()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)

  const { data: productsData } = useSWR('/api/v1/products?limit=100', apiFetcher, swrStaticOptions)
  const allProducts: Product[] = productsData?.data?.products ?? []

  const filteredProducts = useMemo(() => {
    if (!search) return allProducts
    const q = search.toLowerCase()
    return allProducts.filter((p: Product) =>
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q))
    )
  }, [search, allProducts])

  const handleAddProduct = (product: Product) => {
    if (replacingIndex !== null) {
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

  const isUnofficial = proposalType === 'UNOFFICIAL'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Header: search + add */}
      <div className="p-3 md:p-4 border-b bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">
            {t('proposals.steps.addProducts')}
          </h2>
          {isUnofficial && (
            <Badge className="text-[10px] px-2 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
              {t('proposals.vatExcludedNotice')}
            </Badge>
          )}
          <div className="ml-auto">
            <Popover open={searchOpen} onOpenChange={(open) => { setSearchOpen(open); if (!open) setReplacingIndex(null) }}>
              <PopoverTrigger asChild>
                <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  {t('proposals.create.addProduct')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="end">
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
                      {filteredProducts.map((product: Product) => (
                        <CommandItem key={product.id} onSelect={() => handleAddProduct(product)}>
                          <div className="flex items-center gap-2 w-full py-0.5">
                            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.code && `${product.code} · `}{formatCurrency(product.listPrice || 0)}
                              </p>
                            </div>
                            <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {items.length > 0 ? (
          <div>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_80px_100px_80px_80px_100px_36px] gap-2 px-4 py-2 border-b bg-gray-50 dark:bg-gray-800/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider items-center">
              <div className="w-6" />
              <div>{t('proposals.product')}</div>
              <div className="text-center">{t('proposals.qty')}</div>
              <div className="text-right">{t('proposals.unitPrice')}</div>
              <div className="text-center">{t('proposals.discount')}</div>
              {!isUnofficial && <div className="text-center">{t('proposals.vat')}</div>}
              <div className="text-right">{t('proposals.amount')}</div>
              <div />
            </div>

            {/* Table rows */}
            {items.map((item, index) => {
              const effectiveItem = getEffectiveItem(item)
              const lineTotal = calculateLineTotal(effectiveItem, isUnofficial ? 'before_vat' : 'with_vat')
              const lineTotalBeforeVat = calculateLineTotal(effectiveItem, 'before_vat')
              const hasDiscount = item.discountType === 'fixed' ? item.discountFixed > 0 : item.discountPercent > 0
              const discountDisplay = item.discountType === 'fixed'
                ? formatCurrency(item.discountFixed)
                : `${item.discountPercent}%`
              const discountAmount = item.quantity * item.unitPrice - lineTotalBeforeVat
              const isExpanded = expandedRow === index

              return (
                <div
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
                    'border-b transition-all',
                    dragging === index && 'opacity-50',
                    isExpanded && 'bg-blue-50/30 dark:bg-blue-950/10'
                  )}
                >
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[auto_1fr_80px_100px_80px_80px_100px_36px] gap-2 px-4 py-2 items-center">
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 w-6">
                      <GripVertical className="h-4 w-4" />
                    </div>

                    {/* Product name */}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : index)}
                        className="text-left w-full"
                      >
                        <p className="font-medium text-sm truncate">{item.name}</p>
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        value={item.quantity}
                        onFocus={handleNumFocus}
                        onChange={(e) => onUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-10 h-7 text-center text-xs font-semibold px-0 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateItem(index, { quantity: item.quantity + 1 })}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Unit Price */}
                    <div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onFocus={handleNumFocus}
                        onChange={(e) => onUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                        className="h-7 text-right text-xs font-medium rounded px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Discount */}
                    <div className="text-center">
                      {hasDiscount ? (
                        <Badge className="text-[10px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 cursor-pointer"
                          onClick={() => setExpandedRow(isExpanded ? null : index)}
                        >
                          -{discountDisplay}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedRow(isExpanded ? null : index)}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          -
                        </button>
                      )}
                    </div>

                    {/* VAT */}
                    {!isUnofficial && (
                      <div className="text-center">
                        <Select
                          value={String(item.vatPercent)}
                          onValueChange={(v) => onUpdateItem(index, { vatPercent: Number(v) })}
                        >
                          <SelectTrigger className="h-7 rounded text-[11px] font-medium px-1.5 w-full">
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
                    )}

                    {/* Line Total */}
                    <div className="text-right">
                      <span className="font-bold text-sm">{formatCurrency(lineTotal)}</span>
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Mobile row */}
                  <div className="sm:hidden p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</span>
                          {hasDiscount && (
                            <Badge className="text-[10px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                              -{discountDisplay}
                            </Badge>
                          )}
                          {!isUnofficial && <span className="text-[10px] text-muted-foreground">KDV %{item.vatPercent}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedRow(isExpanded ? null : index)}
                        className={cn(
                          'w-7 h-7 rounded flex items-center justify-center transition-all',
                          isExpanded ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'
                        )}
                      >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="w-7 h-7 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-3">
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => onUpdateItem(index, { quantity: Math.max(1, item.quantity - 1) })} className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <Input
                          type="number" min="1" inputMode="numeric" value={item.quantity}
                          onFocus={handleNumFocus}
                          onChange={(e) => onUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                          className="w-14 h-8 text-center text-sm font-semibold rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button type="button" onClick={() => onUpdateItem(index, { quantity: item.quantity + 1 })} className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-bold text-base">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Unit Price (mobile) */}
                        <div className="sm:hidden">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t('proposals.unitPrice')}</Label>
                          <div className="relative">
                            <Input
                              type="number" inputMode="decimal" min="0" step="0.01"
                              value={item.unitPrice} onFocus={handleNumFocus}
                              onChange={(e) => onUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                              className="h-9 rounded-lg pr-6 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">&#8378;</span>
                          </div>
                        </div>

                        {/* Discount */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t('proposals.discount')}</Label>
                          <div className="flex gap-1.5">
                            <div className="flex rounded-lg border overflow-hidden shrink-0">
                              <button type="button"
                                onClick={() => onUpdateItem(index, { discountType: 'percent', discountFixed: 0 })}
                                className={cn('w-9 h-9 flex items-center justify-center text-xs font-bold transition-colors',
                                  item.discountType === 'percent' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'
                                )}
                              >%</button>
                              <button type="button"
                                onClick={() => onUpdateItem(index, { discountType: 'fixed', discountPercent: 0 })}
                                className={cn('w-9 h-9 flex items-center justify-center text-xs font-bold transition-colors',
                                  item.discountType === 'fixed' ? 'bg-blue-500 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500'
                                )}
                              >&#8378;</button>
                            </div>
                            <Input
                              type="number" inputMode="decimal" min="0"
                              max={item.discountType === 'percent' ? 100 : undefined}
                              value={item.discountType === 'percent' ? (item.discountPercent || '') : (item.discountFixed || '')}
                              placeholder="0" onFocus={handleNumFocus}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                if (item.discountType === 'percent') {
                                  onUpdateItem(index, { discountPercent: Math.min(val, 100) })
                                } else {
                                  onUpdateItem(index, { discountFixed: val })
                                }
                              }}
                              className="h-9 rounded-lg text-sm font-medium flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          {hasDiscount && (
                            <p className="text-[11px] text-red-500 mt-1">-{formatCurrency(discountAmount)}</p>
                          )}
                        </div>

                        {/* VAT (mobile only if official) */}
                        {!isUnofficial && (
                          <div className="sm:hidden">
                            <Label className="text-xs text-muted-foreground mb-1 block">{t('proposals.vat')}</Label>
                            <Select
                              value={String(item.vatPercent)}
                              onValueChange={(v) => onUpdateItem(index, { vatPercent: Number(v) })}
                            >
                              <SelectTrigger className="h-9 rounded-lg text-sm font-medium">
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
                        )}
                      </div>

                      {/* Price breakdown */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>{t('proposals.subtotal')}: {formatCurrency(item.quantity * item.unitPrice)}</span>
                        {hasDiscount && <span className="text-red-500">{t('proposals.discount')}: -{formatCurrency(discountAmount)}</span>}
                        {!isUnofficial && <span>{t('proposals.vat')}: +{formatCurrency(lineTotal - lineTotalBeforeVat)}</span>}
                      </div>

                      {/* Item actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleReplaceProduct(index)} className="rounded-lg text-xs gap-1.5 h-7">
                          <ArrowLeftRight className="h-3 w-3" />
                          {t('proposals.create.replaceProduct')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleDuplicateItem(index)} className="rounded-lg text-xs gap-1.5 h-7">
                          <CopyIcon className="h-3 w-3" />
                          {t('proposals.create.duplicateItem')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => onRemoveItem(index)}
                          className="rounded-lg text-xs gap-1.5 h-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                          {t('proposals.create.removeItem')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* General Discount Row */}
            <div className="px-4 py-3 border-b bg-violet-50/50 dark:bg-violet-950/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-semibold text-violet-800 dark:text-violet-200">{t('proposals.generalDiscount')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={generalDiscount.type}
                    onValueChange={(v) => onGeneralDiscountChange({ ...generalDiscount, type: v as 'percent' | 'fixed' })}
                  >
                    <SelectTrigger className="w-14 h-8 rounded-lg text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">&#8378;</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" inputMode="decimal" min="0"
                    value={generalDiscount.value || ''}
                    onFocus={handleNumFocus}
                    onChange={(e) => onGeneralDiscountChange({ ...generalDiscount, value: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-20 h-8 rounded-lg text-sm font-medium text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 flex items-center justify-center mb-3">
              <Package className="h-7 w-7 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-3">{t('proposals.noItems')}</p>
            <Button size="sm" className="gap-1.5 rounded-lg" onClick={() => setSearchOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              {t('proposals.create.addProduct')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SummaryPanel ──────────────────────────────────────────

function SummaryPanel({
  totals,
  proposalType,
  itemCount,
  customerName,
  isSending,
  onSaveAndSend,
  canSend,
}: {
  totals: ReturnType<typeof calculateProposalTotals>
  proposalType: string
  itemCount: number
  customerName: string
  isSending: boolean
  onSaveAndSend: (method: 'draft' | 'whatsapp' | 'email') => Promise<void>
  canSend: boolean
}) {
  const t = useTranslations()
  const [sendDialog, setSendDialog] = useState<'email' | 'whatsapp' | null>(null)
  const isUnofficial = proposalType === 'UNOFFICIAL'

  const handleAction = async (method: 'draft' | 'whatsapp' | 'email') => {
    await onSaveAndSend(method)
    setSendDialog(null)
  }

  return (
    <div className="w-full xl:w-80 shrink-0 border-l bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Summary Header */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            {t('proposals.preview')}
          </h3>

          {/* Totals */}
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('proposals.subtotal')}</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-600">{t('proposals.discount')}</span>
                <span className="font-medium text-red-600">-{formatCurrency(totals.discountAmount)}</span>
              </div>
            )}
            {!isUnofficial && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('proposals.vat')}</span>
                <span className="font-medium">{formatCurrency(totals.vatAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold">{t('proposals.total')}</span>
              <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>

          {/* Item count */}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            <span>{itemCount} {t('proposals.product').toLowerCase()}</span>
          </div>
        </div>

        <Separator />

        {/* Keyboard shortcuts hint */}
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5 text-[10px] text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5">
            <Keyboard className="h-3 w-3" />
            <span className="font-medium">Ctrl+S</span>
            <span>{t('proposals.saveDraft')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Keyboard className="h-3 w-3" />
            <span className="font-medium">Ctrl+Enter</span>
            <span>{t('proposals.send')}</span>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Save Draft */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-10 rounded-xl text-sm"
            onClick={() => handleAction('draft')}
            disabled={isSending || !canSend}
          >
            <Save className="h-4 w-4" />
            {t('proposals.saveDraft')}
          </Button>

          {/* WhatsApp */}
          <Dialog open={sendDialog === 'whatsapp'} onOpenChange={(open) => setSendDialog(open ? 'whatsapp' : null)}>
            <Button
              type="button"
              className="w-full gap-2 h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 text-sm font-semibold"
              onClick={() => setSendDialog('whatsapp')}
              disabled={isSending || !canSend}
            >
              <MessageSquare className="h-4 w-4" />
              {t('proposals.sendWhatsApp')}
            </Button>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                  </div>
                  {t('proposals.sendWhatsApp')}
                </DialogTitle>
                <DialogDescription className="pt-2">
                  {t('proposals.whatsappMessageWillSentTo')}
                </DialogDescription>
              </DialogHeader>
              {customerName && (
                <div className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {customerName.charAt(0)}
                  </div>
                  <p className="font-semibold text-sm">{customerName}</p>
                </div>
              )}
              <Button
                onClick={() => handleAction('whatsapp')}
                disabled={isSending}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg gap-2"
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t('proposals.send')}
                  </>
                )}
              </Button>
            </DialogContent>
          </Dialog>

          {/* Email */}
          <Dialog open={sendDialog === 'email'} onOpenChange={(open) => setSendDialog(open ? 'email' : null)}>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-10 rounded-xl text-sm"
              onClick={() => setSendDialog('email')}
              disabled={isSending || !canSend}
            >
              <Send className="h-4 w-4" />
              {t('proposals.sendEmail')}
            </Button>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>{t('proposals.sendEmail')}</DialogTitle>
                <DialogDescription>{t('proposals.emailWillSentTo')}</DialogDescription>
              </DialogHeader>
              <Button
                onClick={() => handleAction('email')}
                disabled={isSending}
                className="w-full h-11 rounded-xl gap-2"
              >
                {isSending ? '...' : t('proposals.send')}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

// ── MobileBottomBar ──────────────────────────────────────

function MobileBottomBar({
  grandTotal,
  isSending,
  canSend,
  onSaveDraft,
  onSend,
}: {
  grandTotal: number
  isSending: boolean
  canSend: boolean
  onSaveDraft: () => void
  onSend: () => void
}) {
  const t = useTranslations()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('proposals.total')}</p>
          <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(grandTotal)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 px-3 rounded-xl"
          onClick={onSaveDraft}
          disabled={isSending || !canSend}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 gap-1.5"
          onClick={onSend}
          disabled={isSending || !canSend}
        >
          <Send className="h-4 w-4" />
          {t('proposals.send')}
        </Button>
      </div>
    </div>
  )
}

// ── Mobile Accordion Sections ─────────────────────────────

function MobileAccordionSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
      >
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        {badge && (
          <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            {badge}
          </Badge>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────

export default function CreateProposalPage() {
  const t = useTranslations()
  const router = useRouter()
  const locale = useLocale()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalFormSchema),
    mode: 'onChange',
    defaultValues: {
      customer: { id: '', name: '', email: '', phone: '', address: '', taxNumber: '', contactPersonId: '' },
      proposalType: 'OFFICIAL',
      items: [],
      title: '',
      generalDiscount: { type: 'percent', value: 0 },
      validityDays: 30,
      paymentTerms: 'Net 30',
      deliveryTerms: 'Standard',
      deliveryDate: null,
      installationDate: null,
      notes: '',
      termsAndConditions: '',
      voiceNoteData: null,
      voiceNoteDuration: null,
    },
  })

  const { markDirty, markClean } = useUnsavedChanges()

  useEffect(() => {
    if (isDirty) markDirty()
  }, [isDirty, markDirty])

  const formData = watch()

  // Effective items for calculation (convert fixed discounts)
  const itemsForCalcMain = useMemo(() => formData.items.map((item: ProposalFormData['items'][0]) => {
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

  const handleAddItem = useCallback((item: ProposalFormData['items'][0]) => { append(item) }, [append])

  const handleUpdateItem = useCallback((index: number, updates: Partial<ProposalFormData['items'][0]>) => {
    const currentItem = itemFields[index]
    if (currentItem) update(index, { ...currentItem, ...updates })
  }, [itemFields, update])

  const handleRemoveItem = useCallback((index: number) => { remove(index) }, [remove])

  const handleReorderItems = useCallback((items: ProposalFormData['items']) => {
    itemFields.forEach((_, index) => { if (items[index]) update(index, items[index]) })
  }, [itemFields, update])

  const handleSelectCustomer = useCallback((customer: ProposalFormData['customer']) => {
    setValue('customer', customer)
  }, [setValue])

  const canSend = !!formData.customer?.id && formData.items.length > 0 && !!formData.title && formData.title.length >= 3

  // ── Auto-save to localStorage ──────────────────────────

  useEffect(() => {
    // Restore from localStorage on mount
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        if (parsed.deliveryDate) parsed.deliveryDate = new Date(parsed.deliveryDate)
        if (parsed.installationDate) parsed.installationDate = new Date(parsed.installationDate)
        reset(parsed)
        toast.info(t('proposals.saved'))
      }
    } catch {
      // Ignore parse errors
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty) {
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData))
        } catch {
          // Quota exceeded, ignore
        }
      }
    }, AUTOSAVE_INTERVAL)

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [isDirty, formData])

  // ── Keyboard shortcuts ─────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (canSend && !isSubmitting) handleSaveAndSend('draft')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (canSend && !isSubmitting) setSendDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canSend, isSubmitting]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save proposal to DB ────────────────────────────────

  const saveProposal = async (data: ProposalFormData): Promise<string> => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (data.validityDays || 30))

    const items = data.items.map(item => {
      let discountRate = item.discountPercent || 0
      if (item.discountType === 'fixed' && item.discountFixed > 0) {
        const lineSubtotal = item.quantity * item.unitPrice
        discountRate = lineSubtotal > 0 ? Math.min((item.discountFixed / lineSubtotal) * 100, 100) : 0
      }
      return {
        name: item.name,
        description: '',
        unit: 'Adet',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountRate: Math.round(discountRate * 100) / 100,
        vatRate: Number(item.vatPercent) || 18,
      }
    })

    const payload = {
      customerId: data.customer.id,
      proposalType: data.proposalType,
      title: data.title,
      description: data.notes || '',
      items,
      discountType: data.generalDiscount.type === 'percent' ? 'PERCENTAGE' : 'FIXED',
      discountValue: Number(data.generalDiscount.value) || 0,
      expiresAt: expiresAt.toISOString(),
      notes: data.notes || '',
      paymentTerms: data.paymentTerms || '',
      deliveryTerms: data.deliveryTerms || '',
      deliveryDate: data.deliveryDate ? data.deliveryDate.toISOString() : undefined,
      installationDate: data.installationDate ? data.installationDate.toISOString() : undefined,
      voiceNoteData: data.voiceNoteData || null,
      voiceNoteDuration: data.voiceNoteDuration || null,
    }

    const res = await fetch('/api/v1/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (!res.ok || !result.success) throw new Error(result.error || t('proposals.error'))
    return result.data.id
  }

  // ── Send proposal via channel ──────────────────────────

  const sendProposal = async (proposalId: string, method: 'whatsapp' | 'email') => {
    const res = await fetch(`/api/v1/proposals/${proposalId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    })
    const result = await res.json()
    if (!res.ok || !result.success) throw new Error(result.error || t('proposals.error'))
    return result.data
  }

  // ── Combined save & send handler ───────────────────────

  const handleSaveAndSend = async (method: 'draft' | 'whatsapp' | 'email') => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const proposalId = await saveProposal(formData)

      if (method === 'whatsapp' || method === 'email') {
        const sendResult = await sendProposal(proposalId, method)
        const channel = method === 'whatsapp' ? 'WhatsApp' : 'E-posta'
        toast.success(`${t('proposals.saved')} — ${channel}: ${sendResult.sentTo}`)
      } else {
        toast.success(t('proposals.saved'))
      }

      // Clear autosave on successful save
      try { localStorage.removeItem(AUTOSAVE_KEY) } catch { /* ignore */ }

      markClean()
      router.push(`/${locale}/proposals/${proposalId}`)
    } catch (error) {
      logger.error('Proposal save/send error', error)
      toast.error(error instanceof Error ? error.message : t('proposals.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Send dialog (Ctrl+Enter) ───────────────────────────

  const handleSendDialogAction = async (method: 'whatsapp' | 'email') => {
    setSendDialogOpen(false)
    await handleSaveAndSend(method)
  }

  return (
    <>
      {/* Desktop + Tablet layout (md+) */}
      <div className="hidden md:flex h-[calc(100vh-64px)] overflow-hidden">
        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
          className="flex w-full h-full"
        >
          {/* Left Panel */}
          {leftPanelCollapsed ? (
            <LeftPanel
              formData={formData}
              onSelectCustomer={handleSelectCustomer}
              onProposalTypeChange={(type) => setValue('proposalType', type)}
              onChange={(field, value) => { (setValue as (field: string, value: string | number | boolean | null) => void)(field, value) }}
              onDateChange={(field, value) => setValue(field, value)}
              onVoiceNoteChange={(data, dur) => { setValue('voiceNoteData', data); setValue('voiceNoteDuration', dur) }}
              collapsed={true}
              onToggleCollapse={() => setLeftPanelCollapsed(false)}
            />
          ) : (
            <LeftPanel
              formData={formData}
              onSelectCustomer={handleSelectCustomer}
              onProposalTypeChange={(type) => setValue('proposalType', type)}
              onChange={(field, value) => { (setValue as (field: string, value: string | number | boolean | null) => void)(field, value) }}
              onDateChange={(field, value) => setValue(field, value)}
              onVoiceNoteChange={(data, dur) => { setValue('voiceNoteData', data); setValue('voiceNoteDuration', dur) }}
              collapsed={false}
              onToggleCollapse={() => setLeftPanelCollapsed(true)}
            />
          )}

          {/* Center Panel: Product Table */}
          <ProductTable
            items={formData.items}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onReorderItems={handleReorderItems}
            generalDiscount={formData.generalDiscount}
            onGeneralDiscountChange={(gd) => setValue('generalDiscount', gd)}
            proposalType={formData.proposalType}
          />

          {/* Right Panel: Summary (visible on xl+, merged with center on md-lg) */}
          <div className="hidden xl:block">
            <SummaryPanel
              totals={totals}
              proposalType={formData.proposalType}
              itemCount={formData.items.length}
              customerName={formData.customer.name}
              isSending={isSubmitting}
              onSaveAndSend={handleSaveAndSend}
              canSend={canSend}
            />
          </div>

          {/* Tablet: Floating summary bar at bottom when xl panel is hidden */}
          <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
            <div className="flex items-center gap-4 px-6 py-3">
              <div className="flex-1 flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('proposals.subtotal')}</p>
                  <p className="text-sm font-semibold">{formatCurrency(totals.subtotal)}</p>
                </div>
                {totals.discountAmount > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('proposals.discount')}</p>
                    <p className="text-sm font-semibold text-red-600">-{formatCurrency(totals.discountAmount)}</p>
                  </div>
                )}
                {formData.proposalType !== 'UNOFFICIAL' && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('proposals.vat')}</p>
                    <p className="text-sm font-semibold">{formatCurrency(totals.vatAmount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('proposals.total')}</p>
                  <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(totals.grandTotal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl"
                  onClick={() => handleSaveAndSend('draft')}
                  disabled={isSubmitting || !canSend}
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {t('proposals.saveDraft')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/20 gap-1.5"
                  onClick={() => setSendDialogOpen(true)}
                  disabled={isSubmitting || !canSend}
                >
                  <Send className="h-4 w-4" />
                  {t('proposals.send')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Mobile layout (< md) */}
      <div className="md:hidden min-h-screen pb-20">
        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault() }}
          className="px-4 py-4 space-y-3"
        >
          {/* Header */}
          <div className="mb-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('proposals.createNew')}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('proposals.createDescription')}</p>
          </div>

          {/* Proposal Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue('proposalType', 'OFFICIAL')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                formData.proposalType === 'OFFICIAL'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold">{t('proposals.proposalTypeOfficial')}</span>
            </button>
            <button
              type="button"
              onClick={() => setValue('proposalType', 'UNOFFICIAL')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 transition-all',
                formData.proposalType === 'UNOFFICIAL'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-500/20'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <Eye className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-xs font-semibold">{t('proposals.proposalTypeUnofficial')}</span>
            </button>
          </div>

          {/* Customer Section */}
          <MobileAccordionSection
            title={t('proposals.steps.selectCustomer')}
            icon={Building2}
            defaultOpen={true}
            badge={formData.customer.id ? formData.customer.name : undefined}
          >
            <MobileCustomerSelect
              formData={formData}
              onSelectCustomer={handleSelectCustomer}
            />
          </MobileAccordionSection>

          {/* Details Section */}
          <MobileAccordionSection
            title={t('proposals.steps.details')}
            icon={FileText}
            defaultOpen={true}
            badge={formData.title || undefined}
          >
            <MobileDetailsSection
              formData={formData}
              onChange={(field, value) => { (setValue as (field: string, value: string | number | boolean | null) => void)(field, value) }}
              onDateChange={(field, value) => setValue(field, value)}
              onVoiceNoteChange={(data, dur) => { setValue('voiceNoteData', data); setValue('voiceNoteDuration', dur) }}
            />
          </MobileAccordionSection>

          {/* Products Section */}
          <MobileAccordionSection
            title={t('proposals.steps.addProducts')}
            icon={Package}
            defaultOpen={true}
            badge={formData.items.length > 0 ? String(formData.items.length) : undefined}
          >
            <div className="pt-3">
              <ProductTable
                items={formData.items}
                onAddItem={handleAddItem}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
                onReorderItems={handleReorderItems}
                generalDiscount={formData.generalDiscount}
                onGeneralDiscountChange={(gd) => setValue('generalDiscount', gd)}
                proposalType={formData.proposalType}
              />
            </div>
          </MobileAccordionSection>

          {/* Mobile Summary */}
          {formData.items.length > 0 && (
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 shadow-xl shadow-blue-500/20">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-blue-200">{t('proposals.subtotal')}</p>
                  <p className="text-sm font-bold">{formatCurrency(totals.subtotal)}</p>
                </div>
                {totals.discountAmount > 0 && (
                  <div>
                    <p className="text-[10px] text-blue-200">{t('proposals.discount')}</p>
                    <p className="text-sm font-bold text-red-300">-{formatCurrency(totals.discountAmount)}</p>
                  </div>
                )}
                {formData.proposalType !== 'UNOFFICIAL' && (
                  <div>
                    <p className="text-[10px] text-blue-200">{t('proposals.vat')}</p>
                    <p className="text-sm font-bold">{formatCurrency(totals.vatAmount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-blue-200">{t('proposals.total')}</p>
                  <p className="text-xl font-extrabold">{formatCurrency(totals.grandTotal)}</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Mobile Bottom Bar */}
        <MobileBottomBar
          grandTotal={totals.grandTotal}
          isSending={isSubmitting}
          canSend={canSend}
          onSaveDraft={() => handleSaveAndSend('draft')}
          onSend={() => setSendDialogOpen(true)}
        />
      </div>

      {/* Send Dialog (Ctrl+Enter) */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('proposals.send')}</DialogTitle>
            <DialogDescription>{t('proposals.previewDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              className="w-full gap-3 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 font-semibold"
              onClick={() => handleSendDialogAction('whatsapp')}
              disabled={isSubmitting || !formData.customer.phone}
            >
              <MessageSquare className="h-5 w-5" />
              {t('proposals.sendWhatsApp')}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 h-11 rounded-xl"
              onClick={() => handleSendDialogAction('email')}
              disabled={isSubmitting || !formData.customer.email}
            >
              <Send className="h-4 w-4" />
              {t('proposals.sendEmail')}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 h-11 rounded-xl"
              onClick={() => { setSendDialogOpen(false); handleSaveAndSend('draft') }}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              {t('proposals.saveDraft')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Mobile sub-components ─────────────────────────────────

function MobileCustomerSelect({
  formData,
  onSelectCustomer,
}: {
  formData: ProposalFormData
  onSelectCustomer: (customer: ProposalFormData['customer']) => void
}) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: customersData } = useSWR('/api/v1/customers?limit=100', apiFetcher, swrStaticOptions)
  const customers: Customer[] = customersData?.data?.customers ?? []

  const filteredCustomers = useMemo(() => {
    if (!search) return customers
    const q = search.toLowerCase()
    return customers.filter((c: Customer) =>
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(search))
    )
  }, [search, customers])

  const handleSelect = (customer: Customer) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      taxNumber: customer.taxNumber || '',
      contactPersonId: customer.id,
    })
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="pt-3 space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('w-full justify-start text-left font-normal h-10 rounded-xl text-sm', !formData.customer.id && 'text-muted-foreground')}
          >
            <Building2 className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{formData.customer.id ? formData.customer.name : t('proposals.selectCustomer')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-48px)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder={t('proposals.searchCustomer')} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{t('proposals.noCustomer')}</CommandEmpty>
              <CommandGroup>
                {filteredCustomers.map((customer: Customer) => (
                  <CommandItem key={customer.id} onSelect={() => handleSelect(customer)}>
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{customer.name}</p>
                        {customer.email && <p className="text-[11px] text-muted-foreground truncate">{customer.email}</p>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {formData.customer.id && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {formData.customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 truncate">{formData.customer.name}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate">{formData.customer.email}</p>
            </div>
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
        </div>
      )}
    </div>
  )
}

function MobileDetailsSection({
  formData,
  onChange,
  onDateChange,
  onVoiceNoteChange,
}: {
  formData: ProposalFormData
  onChange: (field: string, value: string | number | boolean | null) => void
  onDateChange: (field: 'deliveryDate' | 'installationDate', value: Date | null) => void
  onVoiceNoteChange: (data: string | null, duration: number | null) => void
}) {
  const t = useTranslations()

  const { data: calendarData } = useSWR('/api/v1/calendar', apiFetcher, swrStaticOptions)
  const disabledDeliveryDates: string[] = calendarData?.data?.disabledDeliveryDates ?? []
  const disabledInstallationDates: string[] = calendarData?.data?.disabledInstallationDates ?? []

  return (
    <div className="pt-3 space-y-4">
      <div>
        <Label htmlFor="m-title" className="text-xs font-medium text-muted-foreground">{t('proposals.title')}</Label>
        <Input id="m-title" value={formData.title || ''} onChange={(e) => onChange('title', e.target.value)}
          placeholder={t('proposals.create.proposalTitle')} className="mt-1 h-9 rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t('proposals.validityDays')}</Label>
          <div className="flex items-center gap-1.5 mt-1">
            <Input type="number" min="1" max="365" value={formData.validityDays || 30}
              onChange={(e) => onChange('validityDays', parseInt(e.target.value) || 30)} className="h-9 rounded-lg text-sm" />
            <span className="text-xs text-muted-foreground">{t('proposals.days')}</span>
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t('proposals.paymentTerms')}</Label>
          <Select value={formData.paymentTerms || 'Net 30'} onValueChange={(v) => onChange('paymentTerms', v)}>
            <SelectTrigger className="mt-1 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
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
        <Label className="text-xs font-medium text-muted-foreground">{t('proposals.deliveryTerms')}</Label>
        <Select value={formData.deliveryTerms || 'Standard'} onValueChange={(v) => onChange('deliveryTerms', v)}>
          <SelectTrigger className="mt-1 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="Express">Express</SelectItem>
            <SelectItem value="Overnight">Overnight</SelectItem>
            <SelectItem value="Same Day">Same Day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t('proposals.deliveryDate')}</Label>
          <div className="mt-1">
            <DatePicker value={formData.deliveryDate ?? undefined} onChange={(d) => onDateChange('deliveryDate', d ?? null)}
              disabledDates={disabledDeliveryDates} placeholder={t('proposals.selectDeliveryDate')} />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground">{t('proposals.installationDate')}</Label>
          <div className="mt-1">
            <DatePicker value={formData.installationDate ?? undefined} onChange={(d) => onDateChange('installationDate', d ?? null)}
              disabledDates={disabledInstallationDates} placeholder={t('proposals.selectInstallationDate')}
              minDate={formData.deliveryDate ?? undefined} />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground">{t('proposals.notes')}</Label>
        <Textarea value={formData.notes || ''} onChange={(e) => onChange('notes', e.target.value)}
          placeholder={t('proposals.create.notes')} className="mt-1 h-16 resize-none rounded-lg text-sm" />
      </div>

      <div>
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
          <Mic className="h-3.5 w-3.5 text-blue-500" />
          {t('proposals.voiceNote')}
        </Label>
        <VoiceNoteRecorder
          value={formData.voiceNoteData ?? null}
          duration={formData.voiceNoteDuration ?? null}
          onChange={onVoiceNoteChange}
          maxDuration={60}
          labels={{
            record: t('proposals.voiceRecord'),
            recording: t('proposals.voiceRecording'),
            stop: t('proposals.voiceStop'),
            play: t('proposals.voiceReady'),
            reRecord: t('proposals.voiceReRecord'),
            delete: t('proposals.voiceDelete'),
            maxDurationLabel: t('proposals.voiceMaxDuration'),
          }}
        />
      </div>
    </div>
  )
}
