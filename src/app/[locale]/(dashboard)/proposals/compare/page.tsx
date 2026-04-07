'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { swrDefaultOptions } from '@/shared/utils/swrConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { X, Plus, Printer, Loader2, AlertCircle, Search, BarChart3, TrendingDown, FileText, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Checkbox } from '@/shared/components/ui/checkbox';

// Types matching API response
type ProposalStatus = 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'EXPIRED' | 'INVOICED';

interface ProposalItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Proposal {
  id: string;
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  grandTotal: number;
  subtotal: number;
  vatTotal: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  customer: { name: string };
  items: ProposalItem[];
}

// Fetcher
const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

// Turkish locale formatter
const formatCurrency = (value: number, currency = 'TRY'): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr));
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  READY: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  VIEWED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  EXPIRED: 'bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-200',
  INVOICED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: 'Taslak',
  READY: 'Hazir',
  SENT: 'Gonderildi',
  VIEWED: 'Goruntulendi',
  ACCEPTED: 'Kabul',
  REJECTED: 'Red',
  REVISION_REQUESTED: 'Revize',
  EXPIRED: 'Suresi Doldu',
  INVOICED: 'Faturalandi',
};

const getStatusBadge = (status: ProposalStatus) => {
  return (
    <Badge className={`rounded-lg ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
};

// Highlight differences between proposals
const highlightDifference = (value: number, otherValues: number[]): string => {
  const allValues = [value, ...otherValues].filter((v) => v !== null && v !== undefined);
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  if (value === max && max !== min) return 'bg-red-50 dark:bg-red-950/20';
  if (value === min && max !== min) return 'bg-green-50 dark:bg-green-950/20';
  return '';
};

// Proposal selection dialog
function SelectProposalsDialog({
  isOpen,
  onClose,
  allProposals,
  selectedIds,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  allProposals: Proposal[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    if (!searchTerm) return allProposals;
    const q = searchTerm.toLowerCase();
    return allProposals.filter(
      (p) =>
        p.proposalNumber.toLowerCase().includes(q) ||
        p.customer.name.toLowerCase().includes(q) ||
        (p.title && p.title.toLowerCase().includes(q))
    );
  }, [allProposals, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl bg-white dark:bg-gray-900 border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Karsilastirilacak Teklifleri Secin
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Teklif numarasi, musteri adi veya baslik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.size} teklif secildi (en az 2 gerekli)
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filtered.length > 0 ? (
              filtered.map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => onToggle(proposal.id)}
                  className={`w-full text-left p-3 rounded-2xl border-2 hover:shadow-lg transition-all duration-200 flex items-center gap-3 ${
                    selectedIds.has(proposal.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(proposal.id)}
                    onCheckedChange={() => onToggle(proposal.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{proposal.proposalNumber}</span>
                      {getStatusBadge(proposal.status)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {proposal.customer.name}
                      {proposal.title && ` - ${proposal.title}`}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                      {formatCurrency(Number(proposal.grandTotal), proposal.currency)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Sonuc bulunamadi
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Proposal detail column - fetches full proposal with items
function ProposalColumn({
  proposalId,
  onRemove,
  allTotals,
}: {
  proposalId: string;
  onRemove: (id: string) => void;
  allTotals: { grandTotal: number; id: string }[];
}) {
  const { data, error, isLoading } = useSWR(
    `/api/v1/proposals/${proposalId}`,
    fetcher,
    swrDefaultOptions
  );

  const proposal: Proposal | null = data?.data?.proposal ?? null;

  if (isLoading) {
    return (
      <Card className="flex-shrink-0 w-full min-w-[300px] rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-2xl w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-2xl w-1/2"></div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full mt-4"></div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-2xl w-2/3"></div>
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full mt-4"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !proposal) {
    return (
      <Card className="flex-shrink-0 w-full min-w-[300px] rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Teklif yuklenemedi</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onRemove(proposalId)} className="mt-2 dark:text-gray-300 dark:hover:bg-gray-800">
            Kaldir
          </Button>
        </CardHeader>
      </Card>
    );
  }

  const lowestTotal = Math.min(...allTotals.map((t) => t.grandTotal));
  const isBest = Number(proposal.grandTotal) === lowestTotal && allTotals.length > 1;

  return (
    <Card className={`flex-shrink-0 w-full min-w-[300px] relative rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 transition-all duration-300 hover:shadow-xl ${isBest ? 'ring-2 ring-green-500 dark:ring-green-400' : ''}`}>
      {isBest && (
        <div className="absolute top-3 right-3">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-md border-0">
            En uygun fiyat
          </Badge>
        </div>
      )}

      <button
        onClick={() => onRemove(proposal.id)}
        className="absolute top-3 left-3 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        title="Kaldir"
      >
        <X className="w-4 h-4" />
      </button>

      <CardHeader className="pb-2">
        <div className="pt-6">
          <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">{proposal.proposalNumber}</CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{proposal.customer.name}</div>
          {proposal.title && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{proposal.title}</div>
          )}
          <div className="mt-2">{getStatusBadge(proposal.status)}</div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* General info */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">Genel Bilgiler</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Teklif No:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{proposal.proposalNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tarih:</span>
              <span className="text-gray-700 dark:text-gray-300">{formatDate(proposal.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Musteri:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{proposal.customer.name}</span>
            </div>
            {proposal.expiresAt && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Son Tarih:</span>
                <span className="text-gray-700 dark:text-gray-300">{formatDate(proposal.expiresAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">
            Urunler ({proposal.items?.length || 0})
          </h4>
          <div className="space-y-2">
            {proposal.items?.map((item, idx) => (
              <div key={item.id || idx} className="text-sm rounded-xl p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>
                    {item.quantity} x {formatCurrency(Number(item.unitPrice), proposal.currency)}
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(Number(item.lineTotal), proposal.currency)}</span>
                </div>
              </div>
            ))}
            {(!proposal.items || proposal.items.length === 0) && (
              <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Urun bulunmuyor</div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
          <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-gray-100">Fiyat Ozeti</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Ara Toplam:</span>
              <span className="text-gray-700 dark:text-gray-300">{formatCurrency(Number(proposal.subtotal), proposal.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">KDV:</span>
              <span className="text-gray-700 dark:text-gray-300">{formatCurrency(Number(proposal.vatTotal), proposal.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <span className="text-gray-900 dark:text-gray-100">Toplam:</span>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(Number(proposal.grandTotal), proposal.currency)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Summary KPI card
function SummaryCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} shadow-lg`}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Main comparison page
export default function ProposalComparePage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all proposals for the selection list
  const { data, error, isLoading } = useSWR(
    '/api/v1/proposals?limit=50',
    fetcher,
    swrDefaultOptions
  );

  const allProposals: Proposal[] = data?.data?.proposals ?? [];

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemove = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProposals = allProposals.filter((p) => selectedIds.has(p.id));
  const allTotals = selectedProposals.map((p) => ({
    id: p.id,
    grandTotal: Number(p.grandTotal),
  }));

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Teklif Karsilastirma
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse bg-gray-200 dark:bg-gray-800 h-24 shadow-lg"></div>
          ))}
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">Teklifler yukleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Teklif Karsilastirma
          </h1>
        </div>
        <Card className="text-center py-12 rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
          <CardContent>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold mb-2 text-lg">Teklifler yuklenirken hata olustu</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state - no proposals at all
  if (allProposals.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Teklif Karsilastirma
          </h1>
        </div>
        <Card className="text-center py-16 rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Karsilastirmak icin en az 2 teklif gerekli. Henuz teklif bulunmuyor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedArray = Array.from(selectedIds);

  // Compute summary stats
  const avgTotal = selectedProposals.length > 0
    ? selectedProposals.reduce((sum, p) => sum + Number(p.grandTotal), 0) / selectedProposals.length
    : 0;
  const lowestTotal = selectedProposals.length > 0
    ? Math.min(...selectedProposals.map((p) => Number(p.grandTotal)))
    : 0;
  const uniqueCustomers = new Set(selectedProposals.map((p) => p.customer.name)).size;
  const totalItems = selectedProposals.reduce((sum, p) => sum + (p.items?.length ?? 0), 0);
  const summaryCurrency = selectedProposals[0]?.currency ?? 'TRY';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Teklif Karsilastirma
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Teklifleri yan yana karsilastirin ve en uygun secimi yapin
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-900 dark:text-gray-200"
          >
            <Plus className="w-4 h-4" />
            Teklif Sec ({selectedIds.size})
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-900 dark:text-gray-200"
            disabled={selectedIds.size < 2}
          >
            <Printer className="w-4 h-4" />
            Yazdir
          </Button>
        </div>
      </div>

      {selectedIds.size < 2 ? (
        <Card className="text-center py-16 rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-800/30 flex items-center justify-center">
              <BarChart3 className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-lg">
              {selectedIds.size === 0
                ? 'Karsilastirmak icin en az 2 teklif secin'
                : '1 teklif secildi. Karsilastirma icin en az 2 teklif gerekli.'}
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Teklif Sec
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={FileText}
              label="Karsilastirilan Teklif"
              value={`${selectedProposals.length} teklif`}
              gradient="bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800"
            />
            <SummaryCard
              icon={TrendingDown}
              label="En Dusuk Fiyat"
              value={formatCurrency(lowestTotal, summaryCurrency)}
              gradient="bg-gradient-to-br from-green-500 to-emerald-700 dark:from-green-600 dark:to-emerald-800"
            />
            <SummaryCard
              icon={BarChart3}
              label="Ortalama Fiyat"
              value={formatCurrency(avgTotal, summaryCurrency)}
              gradient="bg-gradient-to-br from-purple-500 to-indigo-700 dark:from-purple-600 dark:to-indigo-800"
            />
            <SummaryCard
              icon={Users}
              label="Musteri / Urun"
              value={`${uniqueCustomers} musteri, ${totalItems} urun`}
              gradient="bg-gradient-to-br from-orange-500 to-rose-600 dark:from-orange-600 dark:to-rose-700"
            />
          </div>

          {/* Pricing comparison table */}
          <Card className="mb-8 rounded-2xl overflow-hidden shadow-lg border-0 bg-white dark:bg-gray-900">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 w-32">Detay</th>
                    {selectedProposals.map((p) => (
                      <th key={p.id} className="text-right p-4 font-semibold min-w-[160px] text-gray-700 dark:text-gray-300">
                        {p.proposalNumber}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Musteri</td>
                    {selectedProposals.map((p) => (
                      <td key={p.id} className="p-4 text-right text-gray-600 dark:text-gray-400">
                        {p.customer.name}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Ara Toplam</td>
                    {selectedProposals.map((p) => (
                      <td
                        key={p.id}
                        className={`p-4 text-right font-medium text-gray-900 dark:text-gray-100 ${highlightDifference(
                          Number(p.subtotal),
                          selectedProposals.filter((o) => o.id !== p.id).map((o) => Number(o.subtotal))
                        )}`}
                      >
                        {formatCurrency(Number(p.subtotal), p.currency)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">KDV</td>
                    {selectedProposals.map((p) => (
                      <td
                        key={p.id}
                        className={`p-4 text-right font-medium text-gray-900 dark:text-gray-100 ${highlightDifference(
                          Number(p.vatTotal),
                          selectedProposals.filter((o) => o.id !== p.id).map((o) => Number(o.vatTotal))
                        )}`}
                      >
                        {formatCurrency(Number(p.vatTotal), p.currency)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <td className="p-4 text-gray-900 dark:text-gray-100 font-bold">TOPLAM</td>
                    {selectedProposals.map((p) => {
                      const total = Number(p.grandTotal);
                      const totals = selectedProposals.map((o) => Number(o.grandTotal));
                      const min = Math.min(...totals);
                      const max = Math.max(...totals);
                      return (
                        <td
                          key={p.id}
                          className={`p-4 text-right font-bold text-lg ${
                            total === min && min !== max
                              ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                              : total === max && min !== max
                              ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {formatCurrency(total, p.currency)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Urun Sayisi</td>
                    {selectedProposals.map((p) => (
                      <td key={p.id} className="p-4 text-right text-gray-600 dark:text-gray-400">
                        {p.items?.length ?? 0}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">Durum</td>
                    {selectedProposals.map((p) => (
                      <td key={p.id} className="p-4 text-right">
                        {getStatusBadge(p.status)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Proposal detail columns */}
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(selectedArray.length, 4)}, 1fr)` }}>
            {selectedArray.map((id) => (
              <ProposalColumn
                key={id}
                proposalId={id}
                onRemove={handleRemove}
                allTotals={allTotals}
              />
            ))}
          </div>
        </>
      )}

      {/* Selection dialog */}
      <SelectProposalsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        allProposals={allProposals}
        selectedIds={selectedIds}
        onToggle={handleToggle}
      />
    </div>
  );
}
