'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import useSWR from 'swr';
import { swrDefaultOptions } from '@/shared/utils/swrConfig';
import { useConfirm } from '@/shared/components/confirm-dialog';
import { Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown, Users, Phone, Mail, MapPin, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import { FilterEmptyState } from '@/shared/components/FilterEmptyState';
import { useCurrency } from '@/shared/hooks/useCurrency';
import CustomerDetailPanel from './components/CustomerDetailPanel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/shared/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

interface Customer {
  id: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string;
  taxNumber: string;
  isActive: boolean;
  balance: number;
  lastSyncAt: string | null;
  syncedFromParasut: boolean;
  createdAt: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

export default function CustomersPage() {
  const t = useTranslations('customersPage');
  const tc = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const confirm = useConfirm();
  const { formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '', shortName: '', phone: '', email: '', city: '', address: '', taxNumber: '',
  });
  const [editForm, setEditForm] = useState({
    name: '', phone: '', email: '', city: '', address: '', taxNumber: '',
  });
  const itemsPerPage = 10;

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: itemsPerPage.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(filterStatus !== 'all' && { status: filterStatus }),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/customers?${queryParams.toString()}`,
    fetcher,
    swrDefaultOptions
  );

  const customers: Customer[] = data?.data?.customers ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, pages: 1, page: 1 };
  const totalPages = pagination.pages;

  const filterLabels: Record<FilterStatus, string> = { all: t('all'), active: t('active'), inactive: t('inactive') };

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['customers'] }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('syncSuccess', { count: data.data.syncedCount }));
        mutate();
      } else {
        toast.error(data.error || t('genericError'));
      }
    } catch {
      toast.error(t('syncError'));
    } finally {
      setIsSyncing(false);
    }
  }, [mutate, t]);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    const ok = await confirm({ message: t('deleteConfirm'), confirmText: t('deleteBtn'), variant: 'danger' });
    if (!ok) return;
    try {
      await fetch(`/api/v1/customers/${customerId}`, { method: 'DELETE' });
      toast.success(t('deleteSuccess'));
      mutate();
    } catch {
      toast.error(t('deleteError'));
    }
  }, [mutate, confirm, t]);

  const handleAddCustomer = useCallback(async () => {
    if (!newCustomer.name) { toast.error(t('companyNameRequired')); return; }
    setIsSubmitting(true);
    try {
      const payload: Record<string, string | boolean> = { name: newCustomer.name, isActive: true };
      if (newCustomer.shortName) payload.shortName = newCustomer.shortName;
      if (newCustomer.phone) payload.phone = newCustomer.phone;
      if (newCustomer.email) payload.email = newCustomer.email;
      if (newCustomer.city) payload.city = newCustomer.city;
      if (newCustomer.address) payload.address = newCustomer.address;
      if (newCustomer.taxNumber) payload.taxNumber = newCustomer.taxNumber;

      const response = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('addSuccess', { name: newCustomer.name }));
        setNewCustomer({ name: '', shortName: '', phone: '', email: '', city: '', address: '', taxNumber: '' });
        setIsAddDialogOpen(false);
        mutate();
      } else {
        toast.error(data.error || t('addError'));
      }
    } catch {
      toast.error(t('addError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [newCustomer, mutate, t]);

  const openEditDialog = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      city: customer.city ?? '',
      address: customer.address ?? '',
      taxNumber: customer.taxNumber ?? '',
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleEditCustomer = useCallback(async () => {
    if (!editingCustomer || !editForm.name) { toast.error(t('companyNameRequired')); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone || null,
          email: editForm.email || null,
          city: editForm.city || null,
          address: editForm.address || null,
          taxNumber: editForm.taxNumber || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('editSuccess'));
        setIsEditDialogOpen(false);
        setEditingCustomer(null);
        mutate();
      } else {
        toast.error(data.error || t('editError'));
      }
    } catch {
      toast.error(t('editError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [editingCustomer, editForm, mutate, t]);

  const formatBalance = (balance: number) => formatCurrency(balance || 0);

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-mint-500 to-mint-600 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="h-8 w-48 bg-white/20 animate-pulse rounded-xl" />
            <div className="h-4 w-64 bg-white/10 animate-pulse rounded-lg mt-2" />
            <div className="h-11 bg-white/10 animate-pulse rounded-xl mt-4" />
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-gray-900 animate-pulse rounded-xl shadow-sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-mint-500 to-mint-600 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{t('title')}</h1>
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('errorLoad')}</p>
              <p className="text-sm text-gray-400">{t('errorLoadDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
      {/* Gradient Hero */}
      <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-mint-500 to-mint-600 pb-6 px-4 md:px-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />

        <div className="relative max-w-7xl mx-auto space-y-4">
          {/* Subtitle + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-white/70 text-sm">Müşteri bilgilerini yönet ve takip et</p>
            <div className="flex gap-2">
              <Button onClick={handleSync} disabled={isSyncing} size="sm"
                className="rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20">
                <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
                {t('sync')}
              </Button>
              {/* Add Customer button - glass style */}
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm"
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20">
                <Plus className="mr-2 h-4 w-4" />
                {t('newCustomer')}
              </Button>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                placeholder={t('searchPlaceholder')}
                className="pl-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/30"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl min-w-[120px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterLabels[filterStatus]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filterStatus === status}
                    onCheckedChange={() => { setFilterStatus(status); setCurrentPage(1); }}
                  >
                    {filterLabels[status]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6" aria-live="polite">
      {/* Customers List */}
      {customers.length === 0 ? (
        (searchQuery || filterStatus !== 'all') ? (
          <FilterEmptyState
            onClearFilters={() => {
              setSearchQuery('');
              setFilterStatus('all');
              setCurrentPage(1);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('noCustomers')}</p>
          </div>
        )
      ) : (
        <div className="rounded-2xl border bg-card overflow-clip">
          {/* Mobile Cards */}
          <div className="divide-y md:hidden">
            {customers.map((customer) => (
              <button
                key={customer.id}
                className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
                onClick={() => setSelectedCustomer(customer)}
              >
                {/* Avatar */}
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                  customer.syncedFromParasut
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                    : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                )}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{customer.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {customer.city && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />{customer.city}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Phone className="h-3 w-3" />{customer.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-bold', customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-600' : '')}>
                    {formatBalance(customer.balance)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(customer); }}>
                      <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            ))}
          </div>

          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-gray-50 dark:bg-gray-900">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contact')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('city')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('balance')}</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        customer.syncedFromParasut
                          ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                          : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                      )}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{customer.name}</p>
                        {customer.taxNumber && (
                          <p className="text-xs text-muted-foreground">{t('taxNumberPrefix')}: {customer.taxNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm space-y-0.5">
                      {customer.phone && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{customer.phone}
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-muted-foreground flex items-center gap-1 truncate max-w-[200px]">
                          <Mail className="h-3 w-3 shrink-0" />{customer.email}
                        </p>
                      )}
                      {!customer.phone && !customer.email && <span className="text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm">{customer.city ?? '-'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn(
                      'text-sm font-bold',
                      customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-red-600' : ''
                    )}>
                      {formatBalance(customer.balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(customer); }}>
                          <Edit className="mr-2 h-4 w-4" /> {t('editBtn')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> {t('deleteBtn')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t('total')} {pagination.total} {t('customerCount')} · {t('page')} {currentPage}/{totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  {t('previous')}
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('addTitle')}</DialogTitle>
            <DialogDescription>{t('addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('companyName')}</Label>
              <Input placeholder={t('companyNamePlaceholder')} value={newCustomer.name}
                onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('shortName')}</Label>
              <Input placeholder={t('shortNamePlaceholder')} value={newCustomer.shortName}
                onChange={(e) => setNewCustomer((c) => ({ ...c, shortName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('phone')}</Label>
                <Input type="tel" placeholder={t('phonePlaceholder')} value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('email')}</Label>
                <Input type="email" placeholder={t('emailPlaceholder')} value={newCustomer.email}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('cityLabel')}</Label>
              <Input placeholder={t('cityPlaceholder')} value={newCustomer.city}
                onChange={(e) => setNewCustomer((c) => ({ ...c, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('address')}</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t('addressPlaceholder')} value={newCustomer.address}
                onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('taxNumber')}</Label>
              <Input placeholder={t('taxNumberPlaceholder')} value={newCustomer.taxNumber}
                onChange={(e) => setNewCustomer((c) => ({ ...c, taxNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={handleAddCustomer} disabled={isSubmitting}>
              {isSubmitting ? t('adding') : t('addCustomer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingCustomer(null); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
            <DialogDescription>{t('editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('companyName')}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('phone')}</Label>
                <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('email')}</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('cityLabel')}</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('address')}</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('taxNumber')}</Label>
              <Input value={editForm.taxNumber} onChange={(e) => setEditForm((f) => ({ ...f, taxNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingCustomer(null); }} disabled={isSubmitting}>{t('cancel')}</Button>
            <Button onClick={handleEditCustomer} disabled={isSubmitting}>
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <CustomerDetailPanel
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onMutate={() => mutate()}
        onEdit={(c) => openEditDialog(c as Customer)}
      />
    </div>
  );
}
