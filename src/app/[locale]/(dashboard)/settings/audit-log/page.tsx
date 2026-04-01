'use client';

import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { ChevronDown, Download, Search, X, Loader2, AlertCircle, FileText } from 'lucide-react';
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

interface AuditLogUser {
  id: string;
  name: string | null;
  email: string;
}

interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  user: AuditLogUser | null;
  action: ActionType;
  entity: EntityType;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    data: AuditLogEntry[];
    pagination: PaginationInfo;
  };
}

const ACTION_COLORS: Record<ActionType, string> = {
  CREATE: 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 dark:from-emerald-900/40 dark:to-green-900/40 dark:text-emerald-300',
  UPDATE: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/40 dark:to-indigo-900/40 dark:text-blue-300',
  DELETE: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-300',
  SEND: 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-300',
  LOGIN: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-800/40 dark:to-slate-800/40 dark:text-gray-300',
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

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

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

  // Build query string from filters
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(ITEMS_PER_PAGE));

    if (selectedUser !== 'all') params.set('userId', selectedUser);
    if (selectedAction !== 'all') params.set('actionType', selectedAction);
    if (selectedEntity !== 'all') params.set('entityType', selectedEntity);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (searchDetails) params.set('search', searchDetails);

    return params.toString();
  }, [currentPage, selectedUser, selectedAction, selectedEntity, dateFrom, dateTo, searchDetails]);

  const { data, error, isLoading } = useSWR<AuditLogsResponse>(
    `/api/v1/audit-logs?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const logs = data?.data?.data ?? [];
  const pagination = data?.data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;

  // Extract unique users from current page results for user filter
  const uniqueUsers = useMemo(() => {
    if (!logs.length) return [];
    const userMap = new Map<string, string>();
    logs.forEach((log) => {
      if (log.userId && log.user) {
        userMap.set(log.userId, log.user.name || log.user.email);
      }
    });
    return Array.from(userMap.entries());
  }, [logs]);

  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleExportCSV = () => {
    const headers = ['Tarih', 'Kullanıcı', 'İşlem', 'Varlık', 'Detay', 'IP Adresi'];
    const rows = logs.map((log) => [
      new Date(log.createdAt).toLocaleString('tr-TR'),
      log.user?.name || log.user?.email || '-',
      ACTION_LABELS[log.action] || log.action,
      ENTITY_LABELS[log.entity] || log.entity,
      String(log.metadata || ''),
      log.ipAddress || '-',
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

  const getUserDisplayName = (log: AuditLogEntry): string => {
    if (log.user?.name) return log.user.name;
    if (log.user?.email) return log.user.email;
    return '-';
  };

  const hasActiveFilters = dateFrom || dateTo || selectedUser !== 'all' || selectedAction !== 'all' || selectedEntity !== 'all' || searchDetails;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            İşlem Geçmişi
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistem üzerinde yapılan tüm işlemleri görüntüleyin ve takip edin
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          size="sm"
          className="gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 border-0"
          disabled={!logs.length}
        >
          <Download className="h-4 w-4" />
          CSV İndir
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Filtreler</CardTitle>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
                  className="pl-10 rounded-xl bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  className="mt-2 rounded-xl"
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
                  className="mt-2 rounded-xl"
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
                  <SelectTrigger className="mt-2 rounded-xl">
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
                  <SelectTrigger className="mt-2 rounded-xl">
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
                  <SelectTrigger className="mt-2 rounded-xl">
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
      <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {/* Loading State */}
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-5">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <p className="mt-5 text-sm font-medium text-muted-foreground">Yükleniyor...</p>
              <div className="mt-6 w-full max-w-md space-y-3 px-8">
                <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-3 w-4/5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
                <div className="h-3 w-3/5 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 p-5">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="mt-5 text-sm font-medium text-destructive">
                İşlem kayıtları yüklenirken hata oluştu
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error.message}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 p-5">
                <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="mt-5 text-sm font-medium text-muted-foreground">
                Henüz işlem kaydı bulunmuyor
              </p>
            </div>
          )}

          {/* Data Table */}
          {!error && logs.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tarih</TableHead>
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kullanıcı</TableHead>
                    <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">İşlem</TableHead>
                    <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Varlık</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Detay</TableHead>
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">IP Adresi</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors duration-150"
                        onClick={() => toggleRowExpansion(log.id)}
                      >
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                          {new Date(log.createdAt).toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {getUserDisplayName(log)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-lg border-0 font-medium ${ACTION_COLORS[log.action] || ''}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                          {ENTITY_LABELS[log.entity] || log.entity}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {typeof log.metadata === 'string' ? log.metadata : ''}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                              expandedRows[log.id] ? 'rotate-180' : ''
                            }`}
                          />
                        </TableCell>
                      </TableRow>
                      {expandedRows[log.id] && (log.oldData || log.newData) && (
                        <TableRow key={`${log.id}-expanded`} className="hover:bg-transparent">
                          <TableCell colSpan={7} className="p-2">
                            <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950/50 rounded-xl p-4 space-y-4">
                              {log.oldData && (
                                <div className="overflow-hidden rounded-xl border border-red-200/50 dark:border-red-900/30">
                                  <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 px-4 py-2 border-b border-red-200/50 dark:border-red-900/30">
                                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">Eski Veriler</p>
                                  </div>
                                  <pre className="overflow-auto p-4 text-xs bg-white/50 dark:bg-gray-950/50 text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(log.oldData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newData && (
                                <div className="overflow-hidden rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
                                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 px-4 py-2 border-b border-emerald-200/50 dark:border-emerald-900/30">
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Yeni Veriler</p>
                                  </div>
                                  <pre className="overflow-auto p-4 text-xs bg-white/50 dark:bg-gray-950/50 text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(log.newData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              <div className="text-sm text-muted-foreground">
                {pagination.total > 0 && (
                  <>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                    </span>
                    {' / '}
                    {pagination.total} sonuç
                  </>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  Önceki
                </Button>
                <div className="flex items-center gap-1">
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
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-9 w-9 flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md shadow-blue-500/25'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
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
