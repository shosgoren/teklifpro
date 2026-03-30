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

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  listPrice: number;
  vatRate: number;
  stock: number;
  isActive: boolean;
  syncedFromParasut: boolean;
  lastSync: string | null;
  description: string;
  costPrice: number;
}

type FilterCategory = 'Tümü' | 'Yazılım' | 'Hizmet' | 'Donanım';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    code: 'WEB-001',
    name: 'Web Sitesi Tasarım ve Geliştirme',
    category: 'Yazılım',
    unit: 'Proje',
    listPrice: 15000,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 14:30',
    description: 'Profesyonel web sitesi tasarım ve geliştirme hizmeti',
    costPrice: 8000,
  },
  {
    id: '2',
    code: 'MOB-001',
    name: 'Mobil Uygulama Geliştirme',
    category: 'Yazılım',
    unit: 'Proje',
    listPrice: 25000,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-27 10:15',
    description: 'iOS ve Android mobil uygulama geliştirme',
    costPrice: 12000,
  },
  {
    id: '3',
    code: 'CRM-001',
    name: 'CRM Sistemi Kurulumu',
    category: 'Yazılım',
    unit: 'Proje',
    listPrice: 12000,
    vatRate: 18,
    stock: 50,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: 'İşletme için özel CRM sistemi kurulumu ve konfigürasyonu',
    costPrice: 6000,
  },
  {
    id: '4',
    code: 'CONS-001',
    name: 'İş Danışmanlığı',
    category: 'Hizmet',
    unit: 'Saat',
    listPrice: 250,
    vatRate: 18,
    stock: 200,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-26 09:45',
    description: 'Stratejik iş danışmanlığı ve planlama hizmeti',
    costPrice: 100,
  },
  {
    id: '5',
    code: 'TRAIN-001',
    name: 'Yazılım Eğitimi',
    category: 'Hizmet',
    unit: 'Saat',
    listPrice: 300,
    vatRate: 18,
    stock: 150,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 16:20',
    description: 'Özel yazılım eğitimi ve beceri geliştirme programı',
    costPrice: 150,
  },
  {
    id: '6',
    code: 'MAINT-001',
    name: 'Yazılım Bakım ve Destek',
    category: 'Hizmet',
    unit: 'Aylık',
    listPrice: 2000,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: 'Yazılım sistemi bakım, güncellemeler ve teknik destek',
    costPrice: 800,
  },
  {
    id: '7',
    code: 'SRV-002',
    name: 'Veri Analizi Hizmeti',
    category: 'Hizmet',
    unit: 'Proje',
    listPrice: 8000,
    vatRate: 18,
    stock: 75,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-27 14:15',
    description: 'Veri analizi, raporlama ve business intelligence çözümleri',
    costPrice: 3500,
  },
  {
    id: '8',
    code: 'HW-001',
    name: 'Sunucu Bilgisayar',
    category: 'Donanım',
    unit: 'Adet',
    listPrice: 8500,
    vatRate: 18,
    stock: 5,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 11:30',
    description: 'Endüstriyel sunucu bilgisayar - Intel Xeon işlemci',
    costPrice: 5000,
  },
  {
    id: '9',
    code: 'HW-002',
    name: 'Ağ Anahtarı',
    category: 'Donanım',
    unit: 'Adet',
    listPrice: 3500,
    vatRate: 18,
    stock: 12,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: 'Kurumsal ağ anahtarı - 48 port gigabit',
    costPrice: 2000,
  },
  {
    id: '10',
    code: 'HW-003',
    name: 'Güvenlik Duvarı',
    category: 'Donanım',
    unit: 'Adet',
    listPrice: 6500,
    vatRate: 18,
    stock: 3,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-26 10:20',
    description: 'Kurumsal güvenlik duvarı - 1Gbps kapasitesi',
    costPrice: 3800,
  },
  {
    id: '11',
    code: 'WEB-002',
    name: 'E-Ticaret Platformu',
    category: 'Yazılım',
    unit: 'Proje',
    listPrice: 35000,
    vatRate: 18,
    stock: 50,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 13:00',
    description: 'Tam özellikli e-ticaret platformu geliştirme ve kurulumu',
    costPrice: 18000,
  },
  {
    id: '12',
    code: 'API-001',
    name: 'API Geliştirme',
    category: 'Yazılım',
    unit: 'Proje',
    listPrice: 10000,
    vatRate: 18,
    stock: 100,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: 'RESTful API geliştirme ve dokümantasyon',
    costPrice: 5000,
  },
  {
    id: '13',
    code: 'CONS-002',
    name: 'Siber Güvenlik Danışmanlığı',
    category: 'Hizmet',
    unit: 'Proje',
    listPrice: 20000,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-27 15:45',
    description: 'Kurumsal siber güvenlik değerlendirmesi ve iyileştirme',
    costPrice: 10000,
  },
  {
    id: '14',
    code: 'HW-004',
    name: 'Yedekleme Cihazı',
    category: 'Donanım',
    unit: 'Adet',
    listPrice: 4500,
    vatRate: 18,
    stock: 8,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 09:30',
    description: 'Kurumsal yedekleme cihazı - 12TB kapasite',
    costPrice: 2800,
  },
  {
    id: '15',
    code: 'CLOUD-001',
    name: 'Bulut Depolama Hizmeti',
    category: 'Hizmet',
    unit: 'Aylık',
    listPrice: 500,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: '100GB bulut depolama ve yönetim hizmeti',
    costPrice: 200,
  },
  {
    id: '16',
    code: 'DOC-001',
    name: 'Sistem Dokümantasyonu',
    category: 'Hizmet',
    unit: 'Proje',
    listPrice: 5000,
    vatRate: 18,
    stock: 60,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 14:00',
    description: 'Teknik sistem dokümantasyonu hazırlama',
    costPrice: 2000,
  },
  {
    id: '17',
    code: 'QUAL-001',
    name: 'Yazılım Test ve QA',
    category: 'Hizmet',
    unit: 'Saat',
    listPrice: 200,
    vatRate: 18,
    stock: 300,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: 'Yazılım test, QA ve kalite güvence hizmeti',
    costPrice: 100,
  },
  {
    id: '18',
    code: 'HW-005',
    name: 'Sanal Sunucu Lisansı',
    category: 'Donanım',
    unit: 'Aylık',
    listPrice: 1500,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-27 10:00',
    description: 'Kurumsal sanal sunucu - 8CPU, 16GB RAM',
    costPrice: 800,
  },
  {
    id: '19',
    code: 'DEV-001',
    name: 'Özel Yazılım Geliştirme',
    category: 'Yazılım',
    unit: 'Saat',
    listPrice: 350,
    vatRate: 18,
    stock: 200,
    isActive: true,
    syncedFromParasut: true,
    lastSync: '2024-03-28 12:30',
    description: 'Özel gereksinime göre yazılım geliştirme',
    costPrice: 150,
  },
  {
    id: '20',
    code: 'MONI-001',
    name: 'Sistem Monitoring',
    category: 'Hizmet',
    unit: 'Aylık',
    listPrice: 1000,
    vatRate: 18,
    stock: 99,
    isActive: true,
    syncedFromParasut: false,
    lastSync: null,
    description: '24/7 sistem izleme ve uyarı hizmeti',
    costPrice: 400,
  },
];

export default function ProductsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('Tümü');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory === 'Tümü' || product.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, filterCategory]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/parasut/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: ['products'] }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Senkronizasyon Başarılı',
          description: `${data.data.syncedCount} ürün senkronize edildi`,
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

  const handleDeleteProduct = useCallback((productId: string) => {
    toast({
      title: 'Ürün Silindi',
      description: 'Ürün başarıyla silindi',
    });
  }, [toast]);

  const handleAddProduct = useCallback(() => {
    toast({
      title: 'Manuel Ekleme',
      description: 'Yeni ürün ekleme sayfasına yönlendirileceksiniz',
    });
  }, [toast]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Ürünler</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ürün ara..."
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
                  {filterCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(['Tümü', 'Yazılım', 'Hizmet', 'Donanım'] as FilterCategory[]).map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filterCategory === category}
                    onCheckedChange={() => {
                      setFilterCategory(category);
                      setCurrentPage(1);
                    }}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
            <Button onClick={handleAddProduct} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Manuel Ekle
            </Button>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">Ürün bulunamadı</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Arama kriterlerinizi değiştirin veya yeni ürün ekleyin
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Ürün Kodu</TableHead>
                  <TableHead className="whitespace-nowrap">Ürün Adı</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Kategori</TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">Birim</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Liste Fiyatı</TableHead>
                  <TableHead className="hidden lg:table-cell text-center whitespace-nowrap">KDV %</TableHead>
                  <TableHead className="hidden lg:table-cell text-right whitespace-nowrap">Stok</TableHead>
                  <TableHead className="hidden md:table-cell whitespace-nowrap">Durum</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <TableCell className="font-medium text-sm">{product.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            product.syncedFromParasut ? 'bg-green-500' : 'bg-gray-300'
                          )}
                        />
                        <span className="max-w-xs truncate">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{product.category}</TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{product.unit}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatPrice(product.listPrice)}</TableCell>
                    <TableCell className="hidden text-center text-sm lg:table-cell">%{product.vatRate}</TableCell>
                    <TableCell className="hidden text-right text-sm lg:table-cell">
                      <Badge variant={product.stock > 10 ? 'secondary' : 'outline'}>
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>
                        {product.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
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
                              handleDeleteProduct(product.id);
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Toplam {filteredProducts.length} ürün • Sayfa {currentPage} / {totalPages}
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

      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>{selectedProduct.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">Temel Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Ürün Kodu</p>
                      <p className="font-medium">{selectedProduct.code}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Kategori</p>
                      <p className="font-medium">{selectedProduct.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Birim</p>
                      <p className="font-medium">{selectedProduct.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Durum</p>
                      <Badge variant={selectedProduct.isActive ? 'default' : 'secondary'}>
                        {selectedProduct.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Açıklama</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Fiyatlandırma</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Maliyet Fiyatı</p>
                      <p className="font-medium">{formatPrice(selectedProduct.costPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Liste Fiyatı</p>
                      <p className="font-medium text-lg">{formatPrice(selectedProduct.listPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KDV Oranı</p>
                      <p className="font-medium">%{selectedProduct.vatRate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">KDV Dahil Fiyat</p>
                      <p className="font-medium">
                        {formatPrice(selectedProduct.listPrice * (1 + selectedProduct.vatRate / 100))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Stok Bilgisi</h3>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Mevcut Stok</p>
                        <p className="text-2xl font-bold">{selectedProduct.stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Stok Değeri</p>
                        <p className="text-xl font-semibold">
                          {formatPrice(selectedProduct.stock * selectedProduct.costPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Kar Marjı</h3>
                  <div className="rounded-lg border p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brüt Kar</span>
                        <span className="font-medium">
                          {formatPrice(selectedProduct.listPrice - selectedProduct.costPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kar Marjı</span>
                        <span className="font-medium">
                          %
                          {(
                            ((selectedProduct.listPrice - selectedProduct.costPrice) /
                              selectedProduct.listPrice) *
                            100
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Senkronizasyon</h3>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          selectedProduct.syncedFromParasut ? 'bg-green-500' : 'bg-gray-400'
                        )}
                      />
                      <span className="text-sm font-medium">
                        {selectedProduct.syncedFromParasut ? 'Paraşüt\'ten senkronize' : 'Manuel eklenmiş'}
                      </span>
                    </div>
                    {selectedProduct.lastSync && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Son senkronizasyon: {selectedProduct.lastSync}
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
