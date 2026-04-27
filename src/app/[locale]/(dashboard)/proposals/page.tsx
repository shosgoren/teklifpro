'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useConfirm } from '@/shared/components/confirm-dialog';
import useSWR from 'swr';
import { swrDefaultOptions } from '@/shared/utils/swrConfig';
import { Plus, Search, ChevronDown, Eye, Edit, Copy, MessageCircle, Link, Trash2, ChevronLeft, ChevronRight, FileText, List, Columns3, Calendar, User, ExternalLink, DollarSign, RefreshCw } from 'lucide-react';
import { FilterEmptyState } from '@/shared/components/FilterEmptyState';
import { useCurrency } from '@/shared/hooks/useCurrency';
import KanbanBoard from './kanban-board';
import ProposalDetailPanel from './components/ProposalDetailPanel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

type ProposalStatus = 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'REVISED' | 'EXPIRED' | 'CANCELLED' | 'INVOICED';

type ProposalType = 'OFFICIAL' | 'UNOFFICIAL';

interface Proposal {
  id: string;
  title?: string;
  proposalNumber: string;
  proposalType?: ProposalType;
  status: ProposalStatus;
  grandTotal: number | string;
  subtotal?: number | string;
  vatTotal?: number | string;
  discountAmount?: number | string;
  currency?: string;
  createdAt: string;
  expiresAt?: string;
  sentAt?: string;
  viewedAt?: string;
  viewCount?: number;
  publicToken: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  validityDays?: number;
  customer?: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number | string;
    vatRate?: number;
    discountRate?: number;
  }>;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

const STATUS_CONFIG: Record<ProposalStatus, { color: string; dot: string; border: string }> = {
  DRAFT: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400', border: 'border-l-slate-400' },
  READY: { color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300', dot: 'bg-cyan-500', border: 'border-l-cyan-500' },
  SENT: { color: 'bg-mint-100 text-mint-700 dark:bg-mint-900 dark:text-mint-300', dot: 'bg-mint-500', border: 'border-l-mint-500' },
  VIEWED: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', dot: 'bg-amber-500', border: 'border-l-amber-500' },
  ACCEPTED: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
  REJECTED: { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-500', border: 'border-l-red-500' },
  REVISION_REQUESTED: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', dot: 'bg-orange-500', border: 'border-l-orange-500' },
  REVISED: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', dot: 'bg-purple-500', border: 'border-l-purple-500' },
  EXPIRED: { color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400', border: 'border-l-gray-400' },
  CANCELLED: { color: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400', border: 'border-l-gray-400' },
  INVOICED: { color: 'bg-mint-100 text-mint-700 dark:bg-mint-900 dark:text-mint-300', dot: 'bg-mint-500', border: 'border-l-mint-500' },
};

const ITEMS_PER_PAGE = 10;

export default function ProposalsPage() {
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const t = useTranslations('proposals');
  const tc = useTranslations('common');
  const confirm = useConfirm();
  const { formatCurrency: formatCurrencyFn } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ProposalType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem('teklifpro-proposals-view') as 'list' | 'kanban' | null;
    if (stored === 'list' || stored === 'kanban') {
      setViewMode(stored);
    }
  }, [mounted]);

  const toggleViewMode = (mode: 'list' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('teklifpro-proposals-view', mode);
  };

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: ITEMS_PER_PAGE.toString(),
    ...(searchTerm && { search: searchTerm }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(typeFilter !== 'ALL' && { proposalType: typeFilter }),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/proposals?${queryParams.toString()}`,
    fetcher,
    {
      ...swrDefaultOptions,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Kanban: fetch all proposals (no pagination, no filter)
  const kanbanParams = new URLSearchParams({ page: '1', limit: '100', ...(searchTerm && { search: searchTerm }) });
  const { data: kanbanData, isLoading: isKanbanLoading, mutate: kanbanMutate } = useSWR(
    viewMode === 'kanban' ? `/api/v1/proposals?${kanbanParams.toString()}` : null,
    fetcher,
    swrDefaultOptions
  );
  const kanbanProposals = kanbanData?.data?.proposals ?? [];

  const handleStatusChange = async (proposalId: string, newStatus: ProposalStatus) => {
    await fetch(`/api/v1/proposals/${proposalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(res => {
      if (!res.ok) throw new Error('Status update failed');
      return res.json();
    });
  };

  const proposals = data?.data?.proposals ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, totalPages: 1, page: 1 };
  const totalPages = pagination.totalPages;

  const handleRowClick = (id: string) => {
    const p = proposals.find((p: Proposal) => p.id === id) ?? null;
    setSelectedProposal(p);
  };

  const handleCopyLink = (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/proposal/${token}`;
    navigator.clipboard.writeText(link);
    toast.success(t('linkCopied'));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirm({ message: t('confirmDelete'), confirmText: tc('delete'), variant: 'danger' });
    if (!ok) return;
    try {
      await fetch(`/api/v1/proposals/${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      mutate();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo', { count: diffDays });
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const formatAmount = (amount: number) => formatCurrencyFn(amount);

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-mint-600 to-mint-700 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="h-4 w-72 bg-white/10 animate-pulse rounded-lg" />
            <div className="h-11 bg-white/10 animate-pulse rounded-xl" />
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white dark:bg-gray-900 shadow-sm" />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-white dark:bg-gray-900 animate-pulse rounded-xl shadow-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
        <div className="md:shrink-0 bg-gradient-to-br from-mint-600 to-mint-700 pb-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <p className="text-white/70 text-sm">{t('heroSubtitle')}</p>
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20 mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <p className="text-base font-semibold text-red-700 dark:text-red-400">{t('errorLoading')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('errorLoadingHint')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => mutate()}
              >
                <RefreshCw className="h-4 w-4" />
                {tc('retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute stats
  const acceptedCount = proposals.filter((p: Proposal) => p.status === 'ACCEPTED').length;
  const pendingCount = proposals.filter((p: Proposal) => ['SENT', 'VIEWED'].includes(p.status)).length;
  const revisionCount = proposals.filter((p: Proposal) => p.status === 'REVISION_REQUESTED').length;
  const totalValue = proposals.reduce((sum: number, p: Proposal) => sum + (Number(p.grandTotal) || 0), 0);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="h-full overflow-y-auto md:overflow-hidden md:flex md:flex-col">
      {/* ─── Gradient Hero ─── */}
      <div className="md:shrink-0 relative overflow-hidden bg-gradient-to-br from-mint-600 to-mint-700 pb-6 px-4 md:px-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative max-w-7xl mx-auto space-y-4">
          {/* Subtitle + Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-white/70 text-sm">{t('heroSubtitle')}</p>
            <div className="flex gap-2 items-center">
              {/* View Toggle */}
              <div className="hidden md:flex items-center border border-white/20 rounded-xl overflow-hidden" role="group" aria-label={t('viewMode')}>
                <button
                  onClick={() => toggleViewMode('list')}
                  className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
                  aria-label={t('listView')}
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleViewMode('kanban')}
                  className={cn('p-2.5 transition-colors', viewMode === 'kanban' ? 'bg-white/30 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white')}
                  aria-label={t('kanbanView')}
                  aria-pressed={viewMode === 'kanban'}
                >
                  <Columns3 className="h-4 w-4" />
                </button>
              </div>
              <Button
                onClick={() => router.push(`/${locale}/proposals/new`)}
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white shadow-lg shadow-black/10 backdrop-blur-sm border border-white/20 h-11 px-6"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('new')}
              </Button>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 focus:border-white/30 h-11"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl min-w-[120px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20 h-11" aria-label={t('filterByStatus')}>
                  {statusFilter === 'ALL' ? t('allStatuses') : t(`status.${statusFilter}` as Parameters<typeof t>[0])}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}>
                  {t('allStatuses')}
                </DropdownMenuItem>
                {(Object.keys(STATUS_CONFIG) as ProposalStatus[]).map((status) => (
                  <DropdownMenuItem key={status} onClick={() => { setStatusFilter(status); setCurrentPage(1); }}>
                    <div className={cn('h-2 w-2 rounded-full mr-2', STATUS_CONFIG[status].dot)} />
                    {t(`status.${status}` as Parameters<typeof t>[0])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl min-w-[120px] justify-between bg-white/10 border border-white/20 text-white hover:bg-white/20 h-11" aria-label={t('proposalType')}>
                  {typeFilter === 'ALL' ? t('proposalType') : t(typeFilter === 'OFFICIAL' ? 'proposalTypeOfficial' : 'proposalTypeUnofficial')}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => { setTypeFilter('ALL'); setCurrentPage(1); }}>
                  {t('proposalType')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('OFFICIAL'); setCurrentPage(1); }}>
                  <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                  {t('proposalTypeOfficial')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setTypeFilter('UNOFFICIAL'); setCurrentPage(1); }}>
                  <Eye className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  {t('proposalTypeUnofficial')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ─── Mini Stats (glass cards on gradient) ─── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-white border border-white/10">
              <p className="text-xs font-medium text-white/70">{t('totalCount')}</p>
              <p className="text-2xl font-bold mt-1">{pagination.total}</p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-white border border-white/10">
              <p className="text-xs font-medium text-white/70">{t('pending')}</p>
              <p className="text-2xl font-bold mt-1">{pendingCount}</p>
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'REVISION_REQUESTED' ? 'ALL' : 'REVISION_REQUESTED')}
              className={cn(
                'rounded-2xl p-4 text-white text-left transition-all border',
                statusFilter === 'REVISION_REQUESTED'
                  ? 'bg-white/30 border-white/40 ring-2 ring-white/50'
                  : 'bg-white/15 backdrop-blur-sm border-white/10 hover:bg-white/25'
              )}
            >
              <p className="text-xs font-medium text-white/70">{t('revision')}</p>
              <p className="text-2xl font-bold mt-1">{revisionCount}</p>
              {revisionCount > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-white border border-white/10">
              <p className="text-xs font-medium text-white/70">{t('accepted')}</p>
              <p className="text-2xl font-bold mt-1">{acceptedCount}</p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-4 text-white border border-white/10 col-span-2 md:col-span-1">
              <p className="text-xs font-medium text-white/70">{t('totalValue')}</p>
              <p className="text-xl font-bold mt-1 truncate">{formatAmount(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content (scrollable on desktop) ─── */}
      <div className="md:flex-1 md:overflow-y-auto md:min-h-0 bg-gray-50/50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6" aria-live="polite">

        {/* ─── Kanban or List View ─── */}
        {viewMode === 'kanban' ? (
          isKanbanLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label={tc('loading')} role="status">
              {Array.from({ length: 4 }).map((_, colIdx) => (
                <div key={colIdx} className="space-y-3">
                  <div className="h-10 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl" />
                  {Array.from({ length: colIdx < 2 ? 3 : 2 }).map((_, cardIdx) => (
                    <div key={cardIdx} className="space-y-2 p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
                      <div className="h-4 w-3/4 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
                      <div className="h-3 w-1/2 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
                      <div className="h-3 w-1/3 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <KanbanBoard
              proposals={kanbanProposals}
              onStatusChange={handleStatusChange}
              mutate={() => { kanbanMutate(); mutate(); }}
            />
          )
        ) : proposals.length === 0 ? (
        (searchTerm || statusFilter !== 'ALL') ? (
          <FilterEmptyState
            onClearFilters={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 shadow-lg shadow-mint-500/20 mb-5">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <p className="text-base font-semibold">{t('noProposals')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('noProposalsHint')}</p>
            <Button
              onClick={() => router.push(`/${locale}/proposals/new`)}
              className="mt-6 rounded-xl bg-gradient-to-r from-mint-600 to-mint-600 hover:from-mint-700 hover:to-mint-700 text-white shadow-lg shadow-mint-500/25 h-11 px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirst')}
            </Button>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-card overflow-clip shadow-sm">
          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('proposal')}</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('customer')}</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('amount')}</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('list.status')}</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('date')}</th>
                <th className="px-5 py-3.5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {proposals.map((proposal: Proposal) => {
                const status = STATUS_CONFIG[proposal.status as ProposalStatus] ?? STATUS_CONFIG.DRAFT;
                return (
                  <tr
                    key={proposal.id}
                    onClick={() => setSelectedProposal(proposal)}
                    className="hover:bg-mint-50/50 dark:hover:bg-mint-950/30 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold">{proposal.title || proposal.proposalNumber}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{proposal.proposalNumber}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-foreground/80">{proposal.customer?.name ?? '-'}</td>
                    <td className="px-5 py-4 text-sm font-bold text-right tabular-nums">
                      {formatAmount(Number(proposal.grandTotal) || 0)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={cn('text-xs font-medium rounded-lg px-2.5 py-0.5', status.color)}>
                          {t(`status.${proposal.status}` as Parameters<typeof t>[0]) || proposal.status}
                        </Badge>
                        {proposal.proposalType === 'UNOFFICIAL' && (
                          <Badge className="text-[10px] rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {t('proposalTypeUnofficial')}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground text-right">
                      {formatDate(proposal.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleRowClick(proposal.id)}>
                            <Eye className="h-4 w-4 mr-2" /> {t('view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyLink(e, proposal.publicToken)}>
                            <Link className="h-4 w-4 mr-2" /> {t('copyLink')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleDelete(e, proposal.id)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" /> {tc('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 md:hidden">
            {proposals.map((proposal: Proposal) => {
              const status = STATUS_CONFIG[proposal.status as ProposalStatus] ?? STATUS_CONFIG.DRAFT;
              return (
                <button
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className={cn(
                    'flex items-center gap-3 p-4 w-full text-left transition-colors duration-150',
                    'border-l-4 hover:bg-mint-50/50 dark:hover:bg-mint-950/30',
                    status.border
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {proposal.title || proposal.proposalNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {proposal.customer?.name ?? '-'} · {formatDate(proposal.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums">{formatAmount(Number(proposal.grandTotal) || 0)}</p>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <Badge className={cn('text-[10px] rounded-md', status.color)}>{t(`status.${proposal.status}` as Parameters<typeof t>[0]) || proposal.status}</Badge>
                      {proposal.proposalType === 'UNOFFICIAL' && (
                        <Badge className="text-[9px] rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">G.R.</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="border-t border-gray-100 dark:border-gray-800 px-5 py-3.5 flex items-center justify-between" role="navigation" aria-label={t('pagination')}>
              <p className="text-xs text-muted-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} / {pagination.total}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('previousPage')}
                  aria-disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.length <= 7 ? (
                  pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-label={t('goToPage', { page })}
                      aria-current={currentPage === page ? 'page' : undefined}
                      className={cn(
                        'h-8 min-w-[2rem] px-2 rounded-full text-xs font-medium transition-all',
                        currentPage === page
                          ? 'bg-gradient-to-r from-mint-600 to-mint-600 text-white shadow-md shadow-mint-500/25'
                          : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  <>
                    {[1, 2].map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        aria-label={t('goToPage', { page })}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={cn(
                          'h-8 min-w-[2rem] px-2 rounded-full text-xs font-medium transition-all',
                          currentPage === page
                            ? 'bg-gradient-to-r from-mint-600 to-mint-600 text-white shadow-md shadow-mint-500/25'
                            : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                    {currentPage > 3 && <span className="text-xs text-muted-foreground px-1" aria-hidden="true">...</span>}
                    {currentPage > 2 && currentPage < totalPages - 1 && (
                      <button
                        onClick={() => setCurrentPage(currentPage)}
                        aria-label={t('goToPage', { page: currentPage })}
                        aria-current="page"
                        className="h-8 min-w-[2rem] px-2 rounded-full text-xs font-medium bg-gradient-to-r from-mint-600 to-mint-600 text-white shadow-md shadow-mint-500/25"
                      >
                        {currentPage}
                      </button>
                    )}
                    {currentPage < totalPages - 2 && <span className="text-xs text-muted-foreground px-1" aria-hidden="true">...</span>}
                    {[totalPages - 1, totalPages].filter(p => p > 2).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        aria-label={t('goToPage', { page })}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={cn(
                          'h-8 min-w-[2rem] px-2 rounded-full text-xs font-medium transition-all',
                          currentPage === page
                            ? 'bg-gradient-to-r from-mint-600 to-mint-600 text-white shadow-md shadow-mint-500/25'
                            : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        {page}
                      </button>
                    ))}
                  </>
                )}
                <Button
                  variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label={t('nextPage')}
                  aria-disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}
      </div>
      </div>

      {/* ─── Detail Panel ─── */}
      <ProposalDetailPanel
        proposal={selectedProposal}
        open={!!selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onMutate={() => { mutate(); kanbanMutate?.(); }}
      />
    </div>
  );
}

