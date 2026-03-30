'use client';

import { useState, useMemo, useCallback } from 'react';
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
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  balance: number;
  lastSync: string | null;
  syncedFromParasut: boolean;
  contacts: Contact[];
  address: string;
  taxNumber: string;
  proposalCount: number;
  proposalHistory: Proposal[];
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Proposal {
  id: string;
  date: string;
  amount: number;
  status: string;
}

type FilterStatus = 'Tümü' | 'Aktif' | 'Pasif';

// Mock customer data
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    companyName: 'Acme Yazılım A.Ş.',
    contactName: 'Ahmet Yıldız',
    phone: '0212 555 1001',
    email: 'ahmet@acme.com.tr',
    city: 'İstanbul',
    balance: 15000,
    lastSync: '2024-03-28 14:30',
    syncedFromParasut: true,
    address: 'Maslak Mahallesi, Atatürk Cad. No:123, 34398 İstanbul',
    taxNumber: '1234567890',
    proposalCount: 12,
    contacts: [
      { id: '1-1', name: 'Ahmet Yıldız', email: 'ahmet@acme.com.tr', phone: '0212 555 1001' },
      { id: '1-2', name: 'Zeynep Kaya', email: 'zeynep@acme.com.tr', phone: '0212 555 1002' },
    ],
    proposalHistory: [
      { id: 'p1', date: '2024-03-15', amount: 25000, status: 'Kabul Edildi' },
      { id: 'p2', date: '2024-02-28', amount: 18000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '2',
    companyName: 'TechCore Bilişim Ltd.',
    contactName: 'Mehmet Demir',
    phone: '0216 555 2001',
    email: 'mehmet@techcore.com.tr',
    city: 'Ankara',
    balance: 8500,
    lastSync: '2024-03-27 10:15',
    syncedFromParasut: true,
    address: 'Çankaya Mahallesi, Tunalı Hilmi Cad. No:45, 06680 Ankara',
    taxNumber: '9876543210',
    proposalCount: 8,
    contacts: [
      { id: '2-1', name: 'Mehmet Demir', email: 'mehmet@techcore.com.tr', phone: '0216 555 2001' },
    ],
    proposalHistory: [
      { id: 'p3', date: '2024-03-10', amount: 12000, status: 'Bekleniyor' },
    ],
  },
  {
    id: '3',
    companyName: 'Global İletişim Hizmetleri',
    contactName: 'Şule Başar',
    phone: '0232 555 3001',
    email: 'sule@globalcomm.com.tr',
    city: 'İzmir',
    balance: 22500,
    lastSync: null,
    syncedFromParasut: false,
    address: 'Alsancak Mahallesi, Kıbrıs Şehitleri Cad. No:78, 35210 İzmir',
    taxNumber: '5555555555',
    proposalCount: 5,
    contacts: [
      { id: '3-1', name: 'Şule Başar', email: 'sule@globalcomm.com.tr', phone: '0232 555 3001' },
    ],
    proposalHistory: [
      { id: 'p4', date: '2024-01-20', amount: 35000, status: 'Reddedildi' },
    ],
  },
  {
    id: '4',
    companyName: 'Digital Solutions Türkiye',
    contactName: 'Emre Kılıç',
    phone: '0312 555 4001',
    email: 'emre@digitalsol.com.tr',
    city: 'Ankara',
    balance: 5000,
    lastSync: '2024-03-26 09:45',
    syncedFromParasut: true,
    address: 'Kızılaya Mahallesi, Konur Cad. No:15, 06050 Ankara',
    taxNumber: '1111111111',
    proposalCount: 3,
    contacts: [
      { id: '4-1', name: 'Emre Kılıç', email: 'emre@digitalsol.com.tr', phone: '0312 555 4001' },
    ],
    proposalHistory: [],
  },
  {
    id: '5',
    companyName: 'Premium Danışmanlık Grubu',
    contactName: 'Figen Atalay',
    phone: '0212 555 5001',
    email: 'figen@premiumdanismanlik.com.tr',
    city: 'İstanbul',
    balance: 18750,
    lastSync: '2024-03-28 16:20',
    syncedFromParasut: true,
    address: 'Levent Mahallesi, Nispetiye Cad. No:34, 34330 İstanbul',
    taxNumber: '2222222222',
    proposalCount: 15,
    contacts: [
      { id: '5-1', name: 'Figen Atalay', email: 'figen@premiumdanismanlik.com.tr', phone: '0212 555 5001' },
      { id: '5-2', name: 'Okan Çetin', email: 'okan@premiumdanismanlik.com.tr', phone: '0212 555 5002' },
    ],
    proposalHistory: [
      { id: 'p5', date: '2024-03-20', amount: 45000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '6',
    companyName: 'Endüstri 4.0 Çözümleri',
    contactName: 'Kerem Öztürk',
    phone: '0555 555 6001',
    email: 'kerem@endustri40.com.tr',
    city: 'Bursa',
    balance: 12000,
    lastSync: null,
    syncedFromParasut: false,
    address: 'Osmangazi Mahallesi, Sakarya Cad. No:89, 16010 Bursa',
    taxNumber: '3333333333',
    proposalCount: 7,
    contacts: [
      { id: '6-1', name: 'Kerem Öztürk', email: 'kerem@endustri40.com.tr', phone: '0555 555 6001' },
    ],
    proposalHistory: [
      { id: 'p6', date: '2024-02-14', amount: 28000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '7',
    companyName: 'Cloud Altyapı Merkezi',
    contactName: 'Levent Taşçı',
    phone: '0216 555 7001',
    email: 'levent@cloudaltyapi.com.tr',
    city: 'İstanbul',
    balance: 31500,
    lastSync: '2024-03-28 11:30',
    syncedFromParasut: true,
    address: 'Pendik Mahallesi, Güzeltepe Cad. No:201, 34890 İstanbul',
    taxNumber: '4444444444',
    proposalCount: 22,
    contacts: [
      { id: '7-1', name: 'Levent Taşçı', email: 'levent@cloudaltyapi.com.tr', phone: '0216 555 7001' },
    ],
    proposalHistory: [
      { id: 'p7', date: '2024-03-22', amount: 52000, status: 'Bekleniyor' },
    ],
  },
  {
    id: '8',
    companyName: 'Yaratıcı Ajans Istanbul',
    contactName: 'Mine Yüksek',
    phone: '0212 555 8001',
    email: 'mine@yaratici-ajans.com.tr',
    city: 'İstanbul',
    balance: 9800,
    lastSync: '2024-03-27 15:45',
    syncedFromParasut: true,
    address: 'Beşiktaş Mahallesi, Ortaklar Cad. No:56, 34340 İstanbul',
    taxNumber: '6666666666',
    proposalCount: 18,
    contacts: [
      { id: '8-1', name: 'Mine Yüksek', email: 'mine@yaratici-ajans.com.tr', phone: '0212 555 8001' },
      { id: '8-2', name: 'Cem Aydın', email: 'cem@yaratici-ajans.com.tr', phone: '0212 555 8002' },
    ],
    proposalHistory: [
      { id: 'p8', date: '2024-03-18', amount: 15000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '9',
    companyName: 'Lojistik Plus Şirketi',
    contactName: 'Selim Yaman',
    phone: '0312 555 9001',
    email: 'selim@lojistikplus.com.tr',
    city: 'Ankara',
    balance: 6500,
    lastSync: null,
    syncedFromParasut: false,
    address: 'Balgat Mahallesi, Mevlana Cad. No:42, 06100 Ankara',
    taxNumber: '7777777777',
    proposalCount: 4,
    contacts: [
      { id: '9-1', name: 'Selim Yaman', email: 'selim@lojistikplus.com.tr', phone: '0312 555 9001' },
    ],
    proposalHistory: [],
  },
  {
    id: '10',
    companyName: 'Sağlık Yönetim Sistemleri',
    contactName: 'Ayşe Güler',
    phone: '0232 555 10001',
    email: 'ayse@sagliky-yonetim.com.tr',
    city: 'İzmir',
    balance: 28000,
    lastSync: '2024-03-28 13:00',
    syncedFromParasut: true,
    address: 'Çiğli Mahallesi, Gümrük Cad. No:123, 35620 İzmir',
    taxNumber: '8888888888',
    proposalCount: 11,
    contacts: [
      { id: '10-1', name: 'Ayşe Güler', email: 'ayse@sagliky-yonetim.com.tr', phone: '0232 555 10001' },
    ],
    proposalHistory: [
      { id: 'p9', date: '2024-03-12', amount: 38000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '11',
    companyName: 'Eğitim Teknolojileri Ltd.',
    contactName: 'Tuğba Demir',
    phone: '0212 555 11001',
    email: 'tugba@egitimtek.com.tr',
    city: 'İstanbul',
    balance: 11200,
    lastSync: null,
    syncedFromParasut: false,
    address: 'Kadıköy Mahallesi, Bağdat Cad. No:789, 34710 İstanbul',
    taxNumber: '9999999999',
    proposalCount: 9,
    contacts: [
      { id: '11-1', name: 'Tuğba Demir', email: 'tugba@egitimtek.com.tr', phone: '0212 555 11001' },
    ],
    proposalHistory: [
      { id: 'p10', date: '2024-02-25', amount: 22000, status: 'Bekleniyor' },
    ],
  },
  {
    id: '12',
    companyName: 'Pazarlama Danışmanları Birliği',
    contactName: 'Rüzgar Altındağ',
    phone: '0216 555 12001',
    email: 'ruzgar@pazarlama-danismanlik.com.tr',
    city: 'Istanbul',
    balance: 16800,
    lastSync: '2024-03-26 10:20',
    syncedFromParasut: true,
    address: 'Ümraniye Mahallesi, Eski Londra Asfaltı Cad. No:405, 34764 İstanbul',
    taxNumber: '1010101010',
    proposalCount: 14,
    contacts: [
      { id: '12-1', name: 'Rüzgar Altındağ', email: 'ruzgar@pazarlama-danismanlik.com.tr', phone: '0216 555 12001' },
    ],
    proposalHistory: [
      { id: 'p11', date: '2024-03-08', amount: 32000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '13',
    companyName: 'Üretim Verimlilik Merkezi',
    contactName: 'Eneş Kara',
    phone: '0312 555 13001',
    email: 'enes@uretim-verimlilik.com.tr',
    city: 'Ankara',
    balance: 7200,
    lastSync: '2024-03-27 14:15',
    syncedFromParasut: true,
    address: 'Çayyolu Mahallesi, Dumlupınar Bulvarı No:555, 06100 Ankara',
    taxNumber: '1111222233',
    proposalCount: 6,
    contacts: [
      { id: '13-1', name: 'Eneş Kara', email: 'enes@uretim-verimlilik.com.tr', phone: '0312 555 13001' },
    ],
    proposalHistory: [],
  },
  {
    id: '14',
    companyName: 'Finansal Hizmetler Grubu',
    contactName: 'Müge Eren',
    phone: '0212 555 14001',
    email: 'muge@finansal-hizmetler.com.tr',
    city: 'İstanbul',
    balance: 42000,
    lastSync: '2024-03-28 09:30',
    syncedFromParasut: true,
    address: 'Şişli Mahallesi, Halaskargazi Cad. No:234, 34370 İstanbul',
    taxNumber: '2222333344',
    proposalCount: 25,
    contacts: [
      { id: '14-1', name: 'Müge Eren', email: 'muge@finansal-hizmetler.com.tr', phone: '0212 555 14001' },
      { id: '14-2', name: 'Caner Sayan', email: 'caner@finansal-hizmetler.com.tr', phone: '0212 555 14002' },
    ],
    proposalHistory: [
      { id: 'p12', date: '2024-03-25', amount: 65000, status: 'Kabul Edildi' },
    ],
  },
  {
    id: '15',
    companyName: 'Turizm Bilişim Çözümleri',
    contactName: 'Hande Başkurt',
    phone: '0212 555 15001',
    email: 'hande@turizmit.com.tr',
    city: 'İstanbul',
    balance: 13500,
    lastSync: null,
    syncedFromParasut: false,
    address: 'Fatih Mahallesi, Divanyolu Cad. No:876, 34100 İstanbul',
    taxNumber: '3333444455',
    proposalCount: 10,
    contacts: [
      { id: '15-1', name: 'Hande Başkurt', email: 'hande@turizmit.com.tr', phone: '0212 555 15001' },
    ],
    proposalHistory: [
      { id: 'p13', date: '2024-03-05', amount: 19000, status: 'Bekleniyor' },
    ],
  },
];

export default function CustomersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('Tümü');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCustomers = useMemo(() => {
    return MOCK_CUSTOMERS.filter((customer) => {
      const matchesSearch =
        customer.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery);

      const matchesFilter =
        filterStatus === 'Tümü' ||
        (filterStatus === 'Aktif' && customer.syncedFromParasut) ||
        (filterStatus === 'Pasif' && !customer.syncedFromParasut);

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filterStatus]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

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
          title: 'Senkronizasyon Başarılı',
          description: `${data.data.syncedCount} müşteri senkronize edildi`,
        });
      } else {
        toast({
          title: 'Senkronizasyon Hata',
          description: data.error || 'Bir hata oluştu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Senkronizasyon sırasında hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [toast]);

  const handleDeleteCustomer = useCallback((customerId: string) => {
    toast({
      title: 'Müşteri Silindi',
      description: 'Müşteri başarıyla silindi',
    });
  }, [toast]);

  const handleAddCustomer = useCallback(() => {
    toast({
      title: 'Manuel Ekleme',
      description: 'Yeni müşteri ekleme sayfasına yönlendirileceksiniz',
    });
  }, [toast]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Müşteriler</h1>

        {/* Top Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search and Filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Müşteri ara..."
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
                  {filterStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(['Tümü', 'Aktif', 'Pasif'] as FilterStatus[]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filterStatus === status}
                    onCheckedChange={() => {
                      setFilterStatus(status);
                      setCurrentPage(1);
                    }}
                  >
                    {status}
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
              Paraşüt'ten Senkronize Et
            </Button>
            <Button onClick={handleAddCustomer} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Manuel Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">Müşteri bulunamadı</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Arama kriterlerinizi değiştirin veya yeni müşteri ekleyin
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Firma Adı</TableHead>
                  <TableHead className="whitespace-nowrap">İlgili Kişi</TableHead>
                  <TableHead className="whitespace-nowrap">Telefon</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">E-posta</TableHead>
                  <TableHead className="hidden lg:table-cell whitespace-nowrap">Şehir</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Bakiye</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Son Sync</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
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
                        {customer.companyName}
                      </div>
                    </TableCell>
                    <TableCell>{customer.contactName}</TableCell>
                    <TableCell className="text-sm">{customer.phone}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{customer.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">{customer.city}</TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.balance.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY',
                        minimumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="hidden text-xs md:table-cell text-muted-foreground">
                      {customer.lastSync ? customer.lastSync : '—'}
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
                            Düzenle
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
            Toplam {filteredCustomers.length} müşteri • Sayfa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Önceki
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
                <SheetTitle>{selectedCustomer.companyName}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Temel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Firma Adı</p>
                      <p className="font-medium">{selectedCustomer.companyName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vergi No</p>
                      <p className="font-medium">{selectedCustomer.taxNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Şehir</p>
                      <p className="font-medium">{selectedCustomer.city}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bakiye</p>
                      <p className="font-medium">
                        {selectedCustomer.balance.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-semibold">İletişim Bilgileri</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Telefon</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">E-posta</p>
                      <p className="font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Adres</p>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                  </div>
                </div>

                {/* Contacts List */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Kişiler ({selectedCustomer.contacts.length})</h3>
                  <div className="space-y-2">
                    {selectedCustomer.contacts.map((contact) => (
                      <div key={contact.id} className="rounded-lg border p-3">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proposals */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Teklifler ({selectedCustomer.proposalCount})</h3>
                  {selectedCustomer.proposalHistory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.proposalHistory.map((proposal) => (
                        <div key={proposal.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium">{proposal.date}</p>
                            <Badge variant="outline" className="mt-1">
                              {proposal.status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">
                            {proposal.amount.toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Teklife yok</p>
                  )}
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
                        {selectedCustomer.syncedFromParasut ? 'Paraşüt\'ten senkronize' : 'Manuel eklenmiş'}
                      </span>
                    </div>
                    {selectedCustomer.lastSync && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Son senkronizasyon: {selectedCustomer.lastSync}
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
