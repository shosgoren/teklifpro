'use client'

import { useState, useCallback, useMemo } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslations } from 'next-intl'
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
  Calendar,
  DollarSign,
  TrendingDown,
  Percent,
} from 'lucide-react'

import { Button } from '@/presentation/components/ui/button'
import { Input } from '@/presentation/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/tabs'
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

// Validation schemas
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
  discountPercent: z.number().min(0).max(100).default(0),
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

// Mock data - replace with actual API calls
const mockCustomers = [
  {
    id: '1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St, New York, NY 10001',
    taxNumber: '12-3456789',
    contacts: [
      { id: 'c1', name: 'John Smith', email: 'john@acme.com', phone: '+1 (555) 123-4568' },
      { id: 'c2', name: 'Sarah Johnson', email: 'sarah@acme.com', phone: '+1 (555) 123-4569' },
    ],
  },
  {
    id: '2',
    name: 'TechStart Inc',
    email: 'info@techstart.com',
    phone: '+1 (555) 987-6543',
    address: '456 Innovation Ave, San Francisco, CA 94103',
    taxNumber: '98-7654321',
    contacts: [
      { id: 'c3', name: 'Mike Chen', email: 'mike@techstart.com', phone: '+1 (555) 987-6544' },
    ],
  },
  {
    id: '3',
    name: 'Global Enterprises Ltd',
    email: 'procurement@global.com',
    phone: '+1 (555) 456-7890',
    address: '789 Corporate Blvd, Chicago, IL 60601',
    taxNumber: '45-6789012',
    contacts: [
      { id: 'c4', name: 'Lisa Anderson', email: 'lisa@global.com', phone: '+1 (555) 456-7891' },
      { id: 'c5', name: 'David Brown', email: 'david@global.com', phone: '+1 (555) 456-7892' },
    ],
  },
]

const mockProducts = [
  { id: '1', name: 'Professional Consulting - Senior', unitPrice: 250, sku: 'CONS-001' },
  { id: '2', name: 'Professional Consulting - Junior', unitPrice: 150, sku: 'CONS-002' },
  { id: '3', name: 'Software Development - Full Stack', unitPrice: 200, sku: 'DEV-001' },
  { id: '4', name: 'UI/UX Design Services', unitPrice: 180, sku: 'DESIGN-001' },
  { id: '5', name: 'Project Management', unitPrice: 120, sku: 'PM-001' },
  { id: '6', name: 'Quality Assurance Testing', unitPrice: 100, sku: 'QA-001' },
  { id: '7', name: 'Infrastructure Setup & Support', unitPrice: 300, sku: 'INFRA-001' },
  { id: '8', name: 'Technical Documentation', unitPrice: 75, sku: 'DOC-001' },
]

// Step 1: Customer Selection
function CustomerSelectionStep({ selectedCustomer, onSelect }: {
  selectedCustomer: ProposalFormData['customer'] | null
  onSelect: (customer: any, contact: any) => void
}) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState<string>('')

  const filteredCustomers = useMemo(() => {
    if (!search) return mockCustomers
    return mockCustomers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
  }, [search])

  const handleSelectCustomer = (customer: typeof mockCustomers[0], contactId: string) => {
    const contact = customer.contacts.find((c) => c.id === contactId)
    if (contact) {
      onSelect(
        {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          taxNumber: customer.taxNumber,
          contactPersonId: contact.id,
        },
        contact
      )
      setOpen(false)
      setSearch('')
      setSelectedContactId('')
    }
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
              className={cn('w-full justify-start text-left font-normal', !selectedCustomer && 'text-muted-foreground')}
            >
              <Building2 className="mr-2 h-4 w-4" />
              {selectedCustomer ? selectedCustomer.name : t('proposals.selectCustomer')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t('proposals.searchCustomer')}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>{t('proposals.noCustomer')}</CommandEmpty>
                <CommandGroup>
                  {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="space-y-2 p-2 border-b last:border-b-0">
                      <CommandItem disabled className="text-xs font-semibold text-foreground cursor-default">
                        {customer.name}
                      </CommandItem>
                      {customer.contacts.map((contact) => (
                        <CommandItem
                          key={contact.id}
                          onSelect={() => handleSelectCustomer(customer, contact.id)}
                          className="pl-4 text-xs"
                        >
                          {contact.name}
                        </CommandItem>
                      ))}
                    </div>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCustomer && (
        <Card className="bg-accent/50 border-accent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedCustomer.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {selectedCustomer.email}
                </CardDescription>
              </div>
              <Check className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Phone:</span>
                <p className="font-mono text-xs">{selectedCustomer.phone}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tax No:</span>
                <p className="font-mono text-xs">{selectedCustomer.taxNumber}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Address:</span>
              <p className="text-xs">{selectedCustomer.address}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Step 2: Product Selection
function ProductSelectionStep({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
}: {
  items: ProposalFormData['items']
  onAddItem: (item: ProposalFormData['items'][0]) => void
  onUpdateItem: (index: number, item: Partial<ProposalFormData['items'][0]>) => void
  onRemoveItem: (index: number) => void
  onReorderItems: (items: ProposalFormData['items']) => void
}) {
  const t = useTranslations()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dragging, setDragging] = useState<number | null>(null)

  const filteredProducts = useMemo(() => {
    if (!search) return mockProducts
    return mockProducts.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  const handleAddProduct = (product: typeof mockProducts[0]) => {
    onAddItem({
      id: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.unitPrice,
      discountPercent: 0,
      vatPercent: 18,
    })
    setSearch('')
    setSearchOpen(false)
  }

  const handleDragStart = (index: number) => {
    setDragging(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex: number) => {
    if (dragging === null || dragging === dropIndex) return
    const newItems = [...items]
    const [draggedItem] = newItems.splice(dragging, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    onReorderItems(newItems)
    setDragging(null)
  }

  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item, 'before_vat'), 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Search className="mr-2 h-4 w-4" />
              {t('proposals.searchProduct')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t('proposals.searchProduct')}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>{t('proposals.noProduct')}</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.map((product) => (
                    <CommandItem
                      key={product.id}
                      onSelect={() => handleAddProduct(product)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.unitPrice)} • {product.sku}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left font-medium">{t('proposals.product')}</th>
                <th className="w-20 px-4 py-3 text-right font-medium">{t('proposals.quantity')}</th>
                <th className="w-24 px-4 py-3 text-right font-medium">{t('proposals.unitPrice')}</th>
                <th className="w-20 px-4 py-3 text-right font-medium">{t('proposals.discount')}</th>
                <th className="w-16 px-4 py-3 text-right font-medium">{t('proposals.vat')}</th>
                <th className="w-24 px-4 py-3 text-right font-medium">{t('proposals.total')}</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/30',
                    dragging === index && 'bg-blue-50 opacity-50'
                  )}
                >
                  <td className="px-4 py-3 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </td>
                  <td className="px-4 py-3 font-medium text-xs max-w-xs truncate">{item.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-full h-8 text-right text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full h-8 text-right text-xs"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) => onUpdateItem(index, { discountPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full h-8 text-right text-xs"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.vatPercent}
                        onChange={(e) => onUpdateItem(index, { vatPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full h-8 text-right text-xs"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-xs whitespace-nowrap">
                    {formatCurrency(calculateLineTotal(item, 'with_vat'))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="border-dashed flex items-center justify-center py-12">
          <div className="text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('proposals.noItems')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

// Step 3: Details
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
          placeholder="e.g., Q2 2024 Development Services"
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t('proposals.generalDiscount')}</Label>
          <div className="flex gap-2 mt-2">
            <Select
              value={data.generalDiscount?.type || 'percent'}
              onValueChange={(value) => onChange('generalDiscount', { ...data.generalDiscount, type: value as any })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="fixed">$</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              value={data.generalDiscount?.value || 0}
              onChange={(e) => onChange('generalDiscount', { ...data.generalDiscount, value: parseFloat(e.target.value) || 0 })}
              className="flex-1"
            />
          </div>
        </div>

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
            />
            <span className="text-xs text-muted-foreground">{t('proposals.days')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="payment">{t('proposals.paymentTerms')}</Label>
          <Select
            value={data.paymentTerms || 'Net 30'}
            onValueChange={(value) => onChange('paymentTerms', value)}
          >
            <SelectTrigger id="payment" className="mt-2">
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

        <div>
          <Label htmlFor="delivery">{t('proposals.deliveryTerms')}</Label>
          <Select
            value={data.deliveryTerms || 'Standard'}
            onValueChange={(value) => onChange('deliveryTerms', value)}
          >
            <SelectTrigger id="delivery" className="mt-2">
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
      </div>

      <div>
        <Label htmlFor="notes">{t('proposals.notes')}</Label>
        <Textarea
          id="notes"
          value={data.notes || ''}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Add any additional notes or special instructions..."
          className="mt-2 h-24 resize-none"
        />
      </div>

      <div>
        <Label htmlFor="terms">{t('proposals.termsConditions')}</Label>
        <Textarea
          id="terms"
          value={data.termsAndConditions || ''}
          onChange={(e) => onChange('termsAndConditions', e.target.value)}
          placeholder="Standard terms and conditions..."
          className="mt-2 h-32 resize-none"
        />
      </div>
    </div>
  )
}

// Step 4: Preview & Send
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
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            {t('proposals.preview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header */}
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
                <p className="text-xs text-muted-foreground">Valid for {data.validityDays} days</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
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

          {/* Totals */}
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

          {/* Terms */}
          {data.notes && (
            <div className="bg-muted/50 p-4 rounded border text-xs space-y-2">
              <p className="font-semibold">{t('proposals.notes')}</p>
              <p className="whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}

          {data.termsAndConditions && (
            <div className="bg-muted/50 p-4 rounded border text-xs space-y-2">
              <p className="font-semibold">{t('proposals.termsConditions')}</p>
              <p className="whitespace-pre-wrap">{data.termsAndConditions}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          {t('proposals.saveDraft')}
        </Button>

        <Dialog open={sendDialog === 'email'} onOpenChange={(open) => setSendDialog(open ? 'email' : null)}>
          <Button variant="outline" className="gap-2" onClick={() => setSendDialog('email')}>
            <Send className="h-4 w-4" />
            {t('proposals.sendEmail')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('proposals.sendEmail')}</DialogTitle>
              <DialogDescription>
                {t('proposals.emailWillSentTo')} {data.customer.email}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleSendEmail} className="w-full">
              {t('proposals.send')}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Dialog open={sendDialog === 'whatsapp'} onOpenChange={(open) => setSendDialog(open ? 'whatsapp' : null)}>
          <Button variant="outline" className="gap-2" onClick={() => setSendDialog('whatsapp')}>
            <MessageSquare className="h-4 w-4" />
            {t('proposals.sendWhatsApp')}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('proposals.sendWhatsApp')}</DialogTitle>
              <DialogDescription>
                {t('proposals.whatsappMessageWillSentTo')} {data.customer.phone}
              </DialogDescription>
            </DialogHeader>
            <Button onClick={handleSendWhatsApp} className="w-full">
              {t('proposals.send')}
            </Button>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="gap-2" onClick={handleCopyLink}>
          <Copy className="h-4 w-4" />
          {t('proposals.copyLink')}
        </Button>
      </div>
    </div>
  )
}

// Main Page Component
export default function CreateProposalPage() {
  const t = useTranslations()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedContact, setSelectedContact] = useState<any>(null)

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
  const totals = useMemo(() => calculateProposalTotals(formData.items, formData.generalDiscount), [formData.items, formData.generalDiscount])

  const { fields: itemFields, append, update, remove, move } = useFieldArray({
    control,
    name: 'items',
  })

  const handleAddItem = (item: ProposalFormData['items'][0]) => {
    append(item)
  }

  const handleUpdateItem = (index: number, updates: Partial<ProposalFormData['items'][0]>) => {
    const currentItem = itemFields[index]
    if (currentItem) {
      update(index, { ...currentItem, ...updates })
    }
  }

  const handleRemoveItem = (index: number) => {
    remove(index)
  }

  const handleReorderItems = (items: ProposalFormData['items']) => {
    itemFields.forEach((_, index) => {
      if (items[index]) {
        update(index, items[index])
      }
    })
  }

  const handleSelectCustomer = (customer: any, contact: any) => {
    setValue('customer', customer)
    setSelectedContact(contact)
  }

  const steps = [
    {
      title: t('proposals.steps.selectCustomer'),
      icon: Building2,
      completed: !!formData.customer?.id,
    },
    {
      title: t('proposals.steps.addProducts'),
      icon: Package,
      completed: formData.items.length > 0,
    },
    {
      title: t('proposals.steps.details'),
      icon: Settings,
      completed: !!formData.title,
    },
    {
      title: t('proposals.steps.preview'),
      icon: Eye,
      completed: false,
    },
  ]

  const onSubmit = async (data: ProposalFormData) => {
    try {
      console.log('Submitting proposal:', data)
      toast.success(t('proposals.saved'))
    } catch (error) {
      toast.error(t('proposals.error'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('proposals.createNew')}</h1>
          <p className="text-muted-foreground">{t('proposals.createDescription')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Stepper */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-8">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStep
                const isCompleted = step.completed && index < currentStep

                return (
                  <div key={index} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors mb-2',
                          isActive && 'bg-blue-600 text-white shadow-lg',
                          isCompleted && 'bg-green-600 text-white',
                          !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <p className={cn(
                        'text-xs font-medium text-center max-w-24',
                        isActive && 'text-blue-600',
                        isCompleted && 'text-green-600',
                        !isActive && !isCompleted && 'text-muted-foreground'
                      )}>
                        {step.title}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        'flex-1 h-1 mx-3 transition-colors',
                        isCompleted ? 'bg-green-600' : 'bg-muted'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription>
                {currentStep === 0 && t('proposals.selectCustomerDesc')}
                {currentStep === 1 && t('proposals.addProductsDesc')}
                {currentStep === 2 && t('proposals.detailsDesc')}
                {currentStep === 3 && t('proposals.previewDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {currentStep === 0 && (
                <CustomerSelectionStep
                  selectedCustomer={formData.customer}
                  onSelect={handleSelectCustomer}
                />
              )}
              {currentStep === 1 && (
                <ProductSelectionStep
                  items={formData.items}
                  onAddItem={handleAddItem}
                  onUpdateItem={handleUpdateItem}
                  onRemoveItem={handleRemoveItem}
                  onReorderItems={handleReorderItems}
                />
              )}
              {currentStep === 2 && (
                <DetailsStep
                  data={formData}
                  onChange={(field, value) => {
                    if (field.includes('Discount') || field.includes('Validity') || field.includes('Terms') || field.includes('notes') || field.includes('Conditions')) {
                      setValue(field as any, value)
                    }
                  }}
                />
              )}
              {currentStep === 3 && (
                <PreviewStep data={formData} totals={totals} />
              )}
            </CardContent>
          </Card>

          {/* Totals Footer */}
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('proposals.subtotal')}</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.subtotal)}</p>
                </div>
                {totals.discountAmount > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('proposals.discount')}</p>
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(totals.discountAmount)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('proposals.vat')}</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.vatAmount)}</p>
                </div>
                <Separator orientation="vertical" className="hidden md:block" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('proposals.total')}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.grandTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('proposals.previous')}
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={!steps[currentStep].completed}
                className="gap-2"
              >
                {t('proposals.next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                {t('proposals.createProposal')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
