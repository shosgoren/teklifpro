'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useConfirm } from '@/shared/components/confirm-dialog';
import { Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown, Users, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/presentation/components/ui/label';
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
  const confirm = useConfirm();
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
    fetcher
  );

  const customers: Customer[] = data?.data?.customers ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, pages: 1, page: 1 };
  const totalPages = pagination.pages;

  const filterLabels: Record<FilterStatus, string> = { all: 'Tümü', active: 'Aktif', inactive: 'Pasif' };

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
        toast.success(`${data.data.syncedCount} müşteri senkronize edildi`);
        mutate();
      } else {
        toast.error(data.error || 'Bir hata oluştu');
      }
    } catch {
      toast.error('Senkronizasyon sırasında hata oluştu');
    } finally {
      setIsSyncing(false);
    }
  }, [mutate]);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    const ok = await confirm({ message: 'Bu müşteriyi silmek istediğinize emin misiniz?', confirmText: 'Sil', variant: 'danger' });
    if (!ok) return;
    try {
      await fetch(`/api/v1/customers/${customerId}`, { method: 'DELETE' });
      toast.success('Müşteri başarıyla silindi');
      mutate();
    } catch {
      toast.error('Silme işlemi sırasında hata oluştu');
    }
  }, [mutate]);

  const handleAddCustomer = useCallback(async () => {
    if (!newCustomer.name) { toast.error('Firma adı zorunludur'); return; }
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
        toast.success(`${newCustomer.name} başarıyla eklendi`);
        setNewCustomer({ name: '', shortName: '', phone: '', email: '', city: '', address: '', taxNumber: '' });
        setIsAddDialogOpen(false);
        mutate();
      } else {
        toast.error(data.error || 'Müşteri eklenirken bir hata oluştu');
      }
    } catch {
      toast.error('Müşteri eklenirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCustomer, mutate]);

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
    if (!editingCustomer || !editForm.name) { toast.error('Firma adı zorunludur'); return; }
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
        toast.success('Müşteri başarıyla güncellendi');
        setIsEditDialogOpen(false);
        setEditingCustomer(null);
        mutate();
      } else {
        toast.error(data.error || 'Güncelleme sırasında hata oluştu');
      }
    } catch {
      toast.error('Güncelleme sırasında hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingCustomer, editForm, mutate]);

  const formatBalance = (balance: number) =>
    (balance || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-950/40 dark:to-rose-950/40 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Veriler yuklenemedi</p>
          <p className="text-sm text-gray-400">Lutfen sayfayi yenileyin veya daha sonra tekrar deneyin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Müşteriler</h1>
        <div className="flex gap-2">
          <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="sm" className="rounded-xl">
            <RefreshCw className={cn('mr-2 h-4 w-4', isSyncing && 'animate-spin')} />
            Senkronize
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm"
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Müşteri
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Müşteri ara..."
            className="pl-10 rounded-xl"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl min-w-[120px] justify-between">
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

      {/* Customers List */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Müşteri bulunamadı</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden">
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
                      <Edit className="mr-2 h-4 w-4" /> Düzenle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Sil
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </button>
            ))}
          </div>

          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Müşteri</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">İletişim</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Şehir</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bakiye</th>
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
                          <p className="text-xs text-muted-foreground">VN: {customer.taxNumber}</p>
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
                          <Edit className="mr-2 h-4 w-4" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Sil
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
                Toplam {pagination.total} müşteri · Sayfa {currentPage}/{totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  Önceki
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
            <DialogDescription>Müşteri bilgilerini girin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Firma Adı *</Label>
              <Input placeholder="Firma adını girin" value={newCustomer.name}
                onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Kısa Ad</Label>
              <Input placeholder="Kısa ad (opsiyonel)" value={newCustomer.shortName}
                onChange={(e) => setNewCustomer((c) => ({ ...c, shortName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input type="tel" placeholder="0xxx xxx xx xx" value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>E-posta</Label>
                <Input type="email" placeholder="ornek@firma.com" value={newCustomer.email}
                  onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Şehir</Label>
              <Input placeholder="Şehir" value={newCustomer.city}
                onChange={(e) => setNewCustomer((c) => ({ ...c, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Adres</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Açık adres (opsiyonel)" value={newCustomer.address}
                onChange={(e) => setNewCustomer((c) => ({ ...c, address: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Vergi Numarası</Label>
              <Input placeholder="Vergi numarası" value={newCustomer.taxNumber}
                onChange={(e) => setNewCustomer((c) => ({ ...c, taxNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>İptal</Button>
            <Button onClick={handleAddCustomer} disabled={isSubmitting}>
              {isSubmitting ? 'Ekleniyor...' : 'Müşteri Ekle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); setEditingCustomer(null); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Müşteriyi Düzenle</DialogTitle>
            <DialogDescription>Müşteri bilgilerini güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Firma Adı *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input type="tel" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>E-posta</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Şehir</Label>
              <Input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Adres</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Vergi Numarası</Label>
              <Input value={editForm.taxNumber} onChange={(e) => setEditForm((f) => ({ ...f, taxNumber: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingCustomer(null); }} disabled={isSubmitting}>İptal</Button>
            <Button onClick={handleEditCustomer} disabled={isSubmitting}>
              {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold',
                    selectedCustomer.syncedFromParasut
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'
                      : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                  )}>
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <SheetTitle>{selectedCustomer.name}</SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedCustomer.syncedFromParasut ? 'Paraşüt\'ten senkronize' : 'Manuel eklenmiş'}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-4">
                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">İletişim</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.email || '-'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{selectedCustomer.address || '-'}{selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Vergi No</p>
                    <p className="font-medium mt-1">{selectedCustomer.taxNumber || '-'}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">Bakiye</p>
                    <p className={cn('font-bold text-lg mt-1',
                      selectedCustomer.balance > 0 ? 'text-emerald-600' : selectedCustomer.balance < 0 ? 'text-red-600' : ''
                    )}>
                      {formatBalance(selectedCustomer.balance)}
                    </p>
                  </div>
                </div>

                <Button onClick={() => { setSelectedCustomer(null); openEditDialog(selectedCustomer); }} className="w-full rounded-xl" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Düzenle
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
