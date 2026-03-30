'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, Download, Search, X } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import { Input } from '@/presentation/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/presentation/components/ui/select';
import { Badge } from '@/presentation/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/presentation/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SEND' | 'LOGIN';
type EntityType = 'PROPOSAL' | 'CUSTOMER' | 'PRODUCT' | 'USER' | 'SETTING';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  actionType: ActionType;
  entityType: EntityType;
  entityId: string;
  details: string;
  ipAddress: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

const ACTION_COLORS: Record<ActionType, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  SEND: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-gray-100 text-gray-800',
};

const ACTION_LABELS: Record<ActionType, string> = {
  CREATE: 'Oluşturma',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
  SEND: 'Gönderim',
  LOGIN: 'Giriş',
};

const ENTITY_LABELS: Record<EntityType, string> = {
  PROPOSAL: 'Teklif',
  CUSTOMER: 'Müşteri',
  PRODUCT: 'Ürün',
  USER: 'Kullanıcı',
  SETTING: 'Ayar',
};

// Mock data
const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'CREATE',
    entityType: 'PROPOSAL',
    entityId: 'prop-123',
    details: 'Yeni teklif oluşturuldu: #2024-001',
    ipAddress: '192.168.1.100',
    newData: { number: '2024-001', clientName: 'Acme Corp', amount: 5000 },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    userId: 'user-2',
    userName: 'Fatma Kaya',
    actionType: 'UPDATE',
    entityType: 'CUSTOMER',
    entityId: 'cust-456',
    details: 'Müşteri bilgileri güncellendi',
    ipAddress: '192.168.1.101',
    oldData: { email: 'old@example.com' },
    newData: { email: 'new@example.com' },
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'SEND',
    entityType: 'PROPOSAL',
    entityId: 'prop-124',
    details: 'Teklif e-posta ile gönderildi',
    ipAddress: '192.168.1.100',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    userId: 'user-3',
    userName: 'Mehmet Demir',
    actionType: 'DELETE',
    entityType: 'PRODUCT',
    entityId: 'prod-789',
    details: 'Ürün silindi: Yazılım Lisansı',
    ipAddress: '192.168.1.102',
    oldData: { name: 'Yazılım Lisansı', price: 1500 },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    userId: 'user-4',
    userName: 'Seda Çelik',
    actionType: 'LOGIN',
    entityType: 'USER',
    entityId: 'user-4',
    details: 'Sistem girişi yapılmıştır',
    ipAddress: '192.168.1.103',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 1000 * 60 * 150),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'UPDATE',
    entityType: 'PROPOSAL',
    entityId: 'prop-125',
    details: 'Teklif durumu güncellendi',
    ipAddress: '192.168.1.100',
    oldData: { status: 'DRAFT' },
    newData: { status: 'SENT' },
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 1000 * 60 * 200),
    userId: 'user-2',
    userName: 'Fatma Kaya',
    actionType: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: 'cust-457',
    details: 'Yeni müşteri oluşturuldu: Beta Ltd',
    ipAddress: '192.168.1.101',
    newData: { name: 'Beta Ltd', phone: '+905551234567' },
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 1000 * 60 * 250),
    userId: 'user-3',
    userName: 'Mehmet Demir',
    actionType: 'UPDATE',
    entityType: 'SETTING',
    entityId: 'settings-1',
    details: 'Sistem ayarları güncellendi',
    ipAddress: '192.168.1.102',
    oldData: { currency: 'TRY' },
    newData: { currency: 'USD' },
  },
  {
    id: '9',
    timestamp: new Date(Date.now() - 1000 * 60 * 300),
    userId: 'user-4',
    userName: 'Seda Çelik',
    actionType: 'CREATE',
    entityType: 'PRODUCT',
    entityId: 'prod-790',
    details: 'Yeni ürün eklendi: Danışmanlık Hizmeti',
    ipAddress: '192.168.1.103',
    newData: { name: 'Danışmanlık Hizmeti', price: 2500 },
  },
  {
    id: '10',
    timestamp: new Date(Date.now() - 1000 * 60 * 350),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'SEND',
    entityType: 'PROPOSAL',
    entityId: 'prop-126',
    details: 'Teklif e-posta ile gönderildi',
    ipAddress: '192.168.1.100',
  },
  {
    id: '11',
    timestamp: new Date(Date.now() - 1000 * 60 * 400),
    userId: 'user-2',
    userName: 'Fatma Kaya',
    actionType: 'DELETE',
    entityType: 'CUSTOMER',
    entityId: 'cust-458',
    details: 'Müşteri silindi: Gamma Inc',
    ipAddress: '192.168.1.101',
    oldData: { name: 'Gamma Inc' },
  },
  {
    id: '12',
    timestamp: new Date(Date.now() - 1000 * 60 * 450),
    userId: 'user-3',
    userName: 'Mehmet Demir',
    actionType: 'CREATE',
    entityType: 'PROPOSAL',
    entityId: 'prop-127',
    details: 'Yeni teklif oluşturuldu: #2024-002',
    ipAddress: '192.168.1.102',
    newData: { number: '2024-002', clientName: 'Delta Corp', amount: 7500 },
  },
  {
    id: '13',
    timestamp: new Date(Date.now() - 1000 * 60 * 500),
    userId: 'user-4',
    userName: 'Seda Çelik',
    actionType: 'UPDATE',
    entityType: 'PRODUCT',
    entityId: 'prod-791',
    details: 'Ürün fiyatı güncellendi',
    ipAddress: '192.168.1.103',
    oldData: { price: 1000 },
    newData: { price: 1200 },
  },
  {
    id: '14',
    timestamp: new Date(Date.now() - 1000 * 60 * 550),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'LOGIN',
    entityType: 'USER',
    entityId: 'user-1',
    details: 'Sistem girişi yapılmıştır',
    ipAddress: '192.168.1.100',
  },
  {
    id: '15',
    timestamp: new Date(Date.now() - 1000 * 60 * 600),
    userId: 'user-2',
    userName: 'Fatma Kaya',
    actionType: 'UPDATE',
    entityType: 'PROPOSAL',
    entityId: 'prop-128',
    details: 'Teklif bilgileri güncellendi',
    ipAddress: '192.168.1.101',
    oldData: { discount: 0 },
    newData: { discount: 10 },
  },
  {
    id: '16',
    timestamp: new Date(Date.now() - 1000 * 60 * 650),
    userId: 'user-3',
    userName: 'Mehmet Demir',
    actionType: 'CREATE',
    entityType: 'SETTING',
    entityId: 'settings-2',
    details: 'Yeni sistem ayarı eklendi',
    ipAddress: '192.168.1.102',
    newData: { key: 'invoicePrefix', value: 'INV' },
  },
  {
    id: '17',
    timestamp: new Date(Date.now() - 1000 * 60 * 700),
    userId: 'user-4',
    userName: 'Seda Çelik',
    actionType: 'DELETE',
    entityType: 'PRODUCT',
    entityId: 'prod-792',
    details: 'Ürün silindi: Eski Hizmet',
    ipAddress: '192.168.1.103',
    oldData: { name: 'Eski Hizmet', price: 500 },
  },
  {
    id: '18',
    timestamp: new Date(Date.now() - 1000 * 60 * 750),
    userId: 'user-1',
    userName: 'Ahmet Yılmaz',
    actionType: 'SEND',
    entityType: 'PROPOSAL',
    entityId: 'prop-129',
    details: 'Teklif e-posta ile gönderildi',
    ipAddress: '192.168.1.100',
  },
  {
    id: '19',
    timestamp: new Date(Date.now() - 1000 * 60 * 800),
    userId: 'user-2',
    userName: 'Fatma Kaya',
    actionType: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: 'cust-459',
    details: 'Yeni müşteri oluşturuldu: Epsilon Ltd',
    ipAddress: '192.168.1.101',
    newData: { name: 'Epsilon Ltd', email: 'info@epsilon.com' },
  },
  {
    id: '20',
    timestamp: new Date(Date.now() - 1000 * 60 * 850),
    userId: 'user-3',
    userName: 'Mehmet Demir',
    actionType: 'UPDATE',
    entityType: 'CUSTOMER',
    entityId: 'cust-460',
    details: 'Müşteri bilgileri güncellendi',
    ipAddress: '192.168.1.102',
    oldData: { phone: '+905551111111' },
    newData: { phone: '+905552222222' },
  },
];

interface ExpandedRow {
  id: string;
  expanded: boolean;
}

export default function AuditLogPage() {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchDetails, setSearchDetails] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const ITEMS_PER_PAGE = 25;

  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((log) => {
      const logDate = log.timestamp.getTime();
      const fromDate = dateFrom ? new Date(dateFrom).getTime() : 0;
      const toDate = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;

      const dateMatch = logDate >= fromDate && logDate <= toDate;
      const userMatch = selectedUser === 'all' || log.userId === selectedUser;
      const actionMatch = selectedAction === 'all' || log.actionType === selectedAction;
      const entityMatch = selectedEntity === 'all' || log.entityType === selectedEntity;
      const detailsMatch =
        searchDetails === '' ||
        log.details.toLowerCase().includes(searchDetails.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchDetails.toLowerCase());

      return dateMatch && userMatch && actionMatch && entityMatch && detailsMatch;
    });
  }, [dateFrom, dateTo, selectedUser, selectedAction, selectedEntity, searchDetails]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueUsers = Array.from(
    new Map(MOCK_AUDIT_LOGS.map((log) => [log.userId, log.userName])).entries()
  );

  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleExportCSV = () => {
    const headers = ['Tarih', 'Kullanıcı', 'İşlem', 'Varlık', 'Detay', 'IP Adresi'];
    const rows = filteredLogs.map((log) => [
      log.timestamp.toLocaleString('tr-TR'),
      log.userName,
      ACTION_LABELS[log.actionType],
      ENTITY_LABELS[log.entityType],
      log.details,
      log.ipAddress,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(','));
    const content = csv.join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedUser('all');
    setSelectedAction('all');
    setSelectedEntity('all');
    setSearchDetails('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İşlem Geçmişi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistem üzerinde yapılan tüm işlemleri görüntüleyin ve takip edin
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtreler</CardTitle>
            {(dateFrom || dateTo || selectedUser !== 'all' || selectedAction !== 'all' || selectedEntity !== 'all' || searchDetails) && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
              >
                <X className="h-3 w-3" />
                Temizle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div>
              <label className="text-sm font-medium">Arama</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Detay, kullanıcı adı ara..."
                  className="pl-10"
                  value={searchDetails}
                  onChange={(e) => {
                    setSearchDetails(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Date From */}
              <div>
                <label className="text-sm font-medium">Başlangıç Tarihi</label>
                <Input
                  type="date"
                  className="mt-2"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium">Bitiş Tarihi</label>
                <Input
                  type="date"
                  className="mt-2"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* User Select */}
              <div>
                <label className="text-sm font-medium">Kullanıcı</label>
                <Select value={selectedUser} onValueChange={(value) => {
                  setSelectedUser(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    {uniqueUsers.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Type Select */}
              <div>
                <label className="text-sm font-medium">İşlem Türü</label>
                <Select value={selectedAction} onValueChange={(value) => {
                  setSelectedAction(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="CREATE">Oluşturma</SelectItem>
                    <SelectItem value="UPDATE">Güncelleme</SelectItem>
                    <SelectItem value="DELETE">Silme</SelectItem>
                    <SelectItem value="SEND">Gönderim</SelectItem>
                    <SelectItem value="LOGIN">Giriş</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entity Type Select */}
              <div>
                <label className="text-sm font-medium">Varlık Türü</label>
                <Select value={selectedEntity} onValueChange={(value) => {
                  setSelectedEntity(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="PROPOSAL">Teklif</SelectItem>
                    <SelectItem value="CUSTOMER">Müşteri</SelectItem>
                    <SelectItem value="PRODUCT">Ürün</SelectItem>
                    <SelectItem value="USER">Kullanıcı</SelectItem>
                    <SelectItem value="SETTING">Ayar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Tarih</TableHead>
                  <TableHead className="w-32">Kullanıcı</TableHead>
                  <TableHead className="w-24">İşlem</TableHead>
                  <TableHead className="w-24">Varlık</TableHead>
                  <TableHead>Detay</TableHead>
                  <TableHead className="w-32">IP Adresi</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <div key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRowExpansion(log.id)}
                      >
                        <TableCell className="text-sm">
                          {log.timestamp.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.actionType]}>
                            {ACTION_LABELS[log.actionType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{ENTITY_LABELS[log.entityType]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.details}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedRows[log.id] ? 'rotate-180' : ''
                            }`}
                          />
                        </TableCell>
                      </TableRow>
                      {expandedRows[log.id] && (log.oldData || log.newData) && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-4">
                              {log.oldData && (
                                <div>
                                  <p className="mb-2 text-xs font-semibold text-red-600">Eski Veriler:</p>
                                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                                    {JSON.stringify(log.oldData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newData && (
                                <div>
                                  <p className="mb-2 text-xs font-semibold text-green-600">Yeni Veriler:</p>
                                  <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                                    {JSON.stringify(log.newData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </div>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <p className="text-muted-foreground">Sonuç bulunamadı</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                {filteredLogs.length > 0 && (
                  <>
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} /{' '}
                    {filteredLogs.length} sonuç
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Önceki
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
