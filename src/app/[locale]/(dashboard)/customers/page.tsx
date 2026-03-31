'use client';

import { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { Plus, RefreshCw, Search, Filter, Edit, Trash2, ChevronDown } from 'lucide-react';
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
import { useToast } from '@/shared/components/ui/use-toast';
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
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

  const filterLabels: Record<FilterStatus, string> = {
    all: 'T\u00fcm\u00fc',
    active: 'Aktif',
    inactive: 'Pasif',
  };

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
        toast({
          title: 'Senkronizasyon Ba\u015far\u0131l\u0131',
          description: `${data.data.syncedCount} m\u00fc\u015fteri senkronize edildi`,
        });
        mutate();
      } else {
        toast({
          title: 'Senkronizasyon Hata',
          description: data.error || 'Bir hata olu\u015ftu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Senkronizasyon s\u0131ras\u0131nda hata olu\u015ftu',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast, mutate]);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (!confirm('Bu m\u00fc\u015fteriyi silmek istedi\u011finize emin misiniz?')) return;
    try {
      await fetch(`/api/v1/customers/${customerId}`, { method: 'DELETE' });
      toast({
        title: 'M\u00fc\u015fteri Silindi',
        description: 'M\u00fc\u015fteri ba\u015far\u0131yla silindi',
      });
      mutate();
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Silme i\u015flemi s\u0131ras\u0131nda hata olu\u015ftu',
        variant: 'destructive',
      });
    }
  }, [toast, mutate]);

  const handleAddCustomer = useCallback(() => {
    toast({
      title: 'Manuel Ekleme',
      description: 'Yeni m\u00fc\u015fteri ekleme sayfas\u0131na y\u00f6nlendirileceksiniz',
    });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">M\u00fc\u015fteriler</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">M\u00fc\u015fteriler</h1>
        <div className="text-center py-12 text-red-600">
          Veriler y\u00fcklenirken hata olu\u015ftu. L\u00fctfen sayfay\u0131 yenileyin.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">M\u00fc\u015fteriler</h1>

        {/* Top Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search and Filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="M\u00fc\u015fteri ara..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterLabels[filterStatus]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filterStatus === status}
                    onCheckedChange={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
                  >
                    {filterLabels[status]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {isSyncing && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
              Para\u015f\u00fct'ten Senkronize Et
            </Button>
            <Button onClick={handleAddCustomer} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Manuel Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">M\u00fc\u015fteri bulunamad\u0131</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Arama kriterlerinizi de\u011fi\u015ftirin veya yeni m\u00fc\u015fteri ekleyin
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Firma Ad\u0131</TableHead>
                  <TableHead className="whitespace-nowrap">Telefon</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">E-posta</TableHead>
                  <TableHead className="hidden lg:table-cell whitespace-nowrap">\u015eehir</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Bakiye</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Son Sync</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            customer.syncedFromParasut ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        />
                        {customer.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{customer.phone ?? '-'}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{customer.email ?? '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.city ?? '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {(customer.balance || 0).toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                        minimumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="hidden text-xs md:table-cell text-muted-foreground">
                      {customer.lastSyncAt ? new Date(customer.lastSyncAt).toLocaleString('tr-TR') : '\u2014'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="mr-2 h-4 w-4" />
                            D\u00fczenle
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomer(customer.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {pagination.total} m\u00fc\u015fteri \u2022 Sayfa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              \u00d6nceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>{selectedCustomer.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Temel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Firma Ad\u0131</p>
                      <p className="font-medium">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vergi No</p>
                      <p className="font-medium">{selectedCustomer.taxNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">\u015eehir</p>
                      <p className="font-medium">{selectedCustomer.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bakiye</p>
                      <p className="font-medium">
                        {(selectedCustomer.balance || 0).toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold">\u0130leti\u015fim Bilgileri</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Telefon</p>
                      <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">E-posta</p>
                      <p className="font-medium">{selectedCustomer.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Adres</p>
                      <p className="font-medium">{selectedCustomer.address || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Senkronizasyon</h3>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          selectedCustomer.syncedFromParasut ? 'bg-green-500' : 'bg-gray-400'
                        )}
                      />
                      <span className="text-sm font-medium">
                        {selectedCustomer.syncedFromParasut ? 'Para\u015f\u00fct\'ten senkronize' : 'Manuel eklenmi\u015f'}
                      </span>
                    </div>
                    {selectedCustomer.lastSyncAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Son senkronizasyon: {new Date(selectedCustomer.lastSyncAt).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
