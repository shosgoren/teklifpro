'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import { Plus, Search, ChevronDown, Eye, Edit, Copy, MessageCircle, Link, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'EXPIRED';

interface StatCard {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  VIEWED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
  EXPIRED: 'bg-slate-700 text-white',
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: 'Taslak',
  SENT: 'G\u00f6nderildi',
  VIEWED: 'G\u00f6r\u00fcnt\u00fclendi',
  ACCEPTED: 'Kabul',
  REJECTED: 'Red',
  REVISION_REQUESTED: 'Revize',
  EXPIRED: 'S\u00fcresi Doldu',
};

const ITEMS_PER_PAGE = 10;

export default function ProposalsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    limit: ITEMS_PER_PAGE.toString(),
    ...(searchTerm && { search: searchTerm }),
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  });

  const { data, error, isLoading, mutate } = useSWR(
    `/api/v1/proposals?${queryParams.toString()}`,
    fetcher
  );

  const proposals = data?.data?.proposals ?? [];
  const pagination = data?.data?.pagination ?? { total: 0, totalPages: 1, page: 1 };
  const totalPages = pagination.totalPages;

  const stats: StatCard[] = [
    {
      label: 'Toplam Teklif',
      value: pagination.total,
    },
    {
      label: 'Bekleyen',
      value: proposals.filter((p: any) => p.status === 'SENT').length,
    },
    {
      label: 'Kabul Edilen',
      value: proposals.filter((p: any) => p.status === 'ACCEPTED').length,
      highlight: true,
    },
    {
      label: 'Toplam De\u011fer',
      value: `\u20ba${(proposals.reduce((sum: number, p: any) => sum + (Number(p.grandTotal) || 0), 0) / 1000).toFixed(1)}K`,
    },
  ];

  const handleRowClick = (id: string) => {
    router.push(`/${locale}/proposals/${id}`);
  };

  const handleCopyLink = (e: React.MouseEvent, number: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/proposals/${number}`;
    navigator.clipboard.writeText(link);
    alert('Link kopyaland\u0131!');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Bu teklifi silmek istedi\u011finizden emin misiniz?')) return;
    try {
      await fetch(`/api/v1/proposals/${id}`, { method: 'DELETE' });
      mutate();
    } catch (err) {
      console.error('Silme hatas\u0131:', err);
      alert('Silme i\u015flemi s\u0131ras\u0131nda hata olu\u015ftu.');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, customerName: string) => {
    e.stopPropagation();
    alert(`${customerName} i\u00e7in WhatsApp mesaj\u0131 g\u00f6nderme sayfas\u0131na y\u00f6nlendirileceksiniz`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Teklifler</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 border-0 bg-white">
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mb-2" />
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              </Card>
            ))}
          </div>
          <Card className="border border-gray-200 overflow-hidden">
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="text-center py-12 text-red-600">
          Veriler y\u00fcklenirken hata olu\u015ftu. L\u00fctfen sayfay\u0131 yenileyin.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Teklifler</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <Card
              key={idx}
              className={`p-4 border-0 ${stat.highlight ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-white'}`}
            >
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.highlight ? 'text-blue-600' : 'text-gray-900'}`}>
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Teklif No, M\u00fc\u015fteri, Ba\u015fl\u0131k..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {statusFilter === 'ALL' ? 'T\u00fcm\u00fc' : STATUS_LABELS[statusFilter as ProposalStatus]}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}>
                    T\u00fcm\u00fc
                  </DropdownMenuItem>
                  {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map((status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                    >
                      {STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* New Proposal Button */}
            <Button
              onClick={() => router.push(`/${locale}/proposals/new`)}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Teklif
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Teklif No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">M\u00fc\u015fteri</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ba\u015fl\u0131k</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Tutar</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Durum</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Olu\u015fturulma</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Son G\u00fcncelleme</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">\u0130\u015flemler</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length > 0 ? (
                proposals.map((proposal: any) => (
                  <tr
                    key={proposal.id}
                    onClick={() => handleRowClick(proposal.id)}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{proposal.proposalNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proposal.customer?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proposal.title}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatAmount(Number(proposal.grandTotal) || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={`${STATUS_COLORS[proposal.status as ProposalStatus] || ''}`}>
                        {STATUS_LABELS[proposal.status as ProposalStatus] || proposal.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(proposal.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(proposal.updatedAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(proposal.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            G\u00f6r\u00fcnt\u00fcle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/${locale}/proposals/${proposal.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            D\u00fczenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert(`Teklif ${proposal.id} kopyalan\u0131yor...`)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleWhatsApp(e, proposal.customer?.name ?? '')}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp G\u00f6nder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyLink(e, proposal.proposalNumber)}>
                            <Link className="h-4 w-4 mr-2" />
                            Link Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(e, proposal.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Teklif bulunamad\u0131
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {proposals.length > 0 && (
                <>
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} / {pagination.total}
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
