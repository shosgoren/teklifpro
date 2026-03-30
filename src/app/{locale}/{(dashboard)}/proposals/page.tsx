'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

interface Proposal {
  id: string;
  number: string;
  customerName: string;
  title: string;
  amount: number;
  status: ProposalStatus;
  createdAt: Date;
  updatedAt: Date;
  viewedAt: Date | null;
  viewCount: number;
}

interface StatCard {
  label: string;
  value: string | number;
  highlight?: boolean;
}

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
  SENT: 'Gönderildi',
  VIEWED: 'Görüntülendi',
  ACCEPTED: 'Kabul',
  REJECTED: 'Red',
  REVISION_REQUESTED: 'Revize',
  EXPIRED: 'Süresi Doldu',
};

// Mock data - 15 sample proposals
const MOCK_PROPOSALS: Proposal[] = [
  {
    id: '1',
    number: 'TKL-2026-001',
    customerName: 'Acme Corporation',
    title: 'Yazılım Geliştirme Hizmetleri',
    amount: 45000,
    status: 'ACCEPTED',
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-25'),
    viewedAt: new Date('2026-03-17'),
    viewCount: 5,
  },
  {
    id: '2',
    number: 'TKL-2026-002',
    customerName: 'Tech Solutions Ltd',
    title: 'Web Tasarımı Projesi',
    amount: 12500,
    status: 'SENT',
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-20'),
    viewedAt: null,
    viewCount: 0,
  },
  {
    id: '3',
    number: 'TKL-2026-003',
    customerName: 'Digital Ventures',
    title: 'Mobil Uygulama Geliştirme',
    amount: 65000,
    status: 'REVISION_REQUESTED',
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-28'),
    viewedAt: new Date('2026-03-12'),
    viewCount: 3,
  },
  {
    id: '4',
    number: 'TKL-2026-004',
    customerName: 'StartUp Hub',
    title: 'Danışmanlık Hizmetleri',
    amount: 8500,
    status: 'VIEWED',
    createdAt: new Date('2026-03-18'),
    updatedAt: new Date('2026-03-22'),
    viewedAt: new Date('2026-03-22'),
    viewCount: 2,
  },
  {
    id: '5',
    number: 'TKL-2026-005',
    customerName: 'Enterprise Global',
    title: 'Sistem Entegrasyonu',
    amount: 125000,
    status: 'DRAFT',
    createdAt: new Date('2026-03-28'),
    updatedAt: new Date('2026-03-29'),
    viewedAt: null,
    viewCount: 0,
  },
  {
    id: '6',
    number: 'TKL-2026-006',
    customerName: 'Innovation Labs',
    title: 'API Geliştirme',
    amount: 35000,
    status: 'ACCEPTED',
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-02-28'),
    viewedAt: new Date('2026-02-17'),
    viewCount: 4,
  },
  {
    id: '7',
    number: 'TKL-2026-007',
    customerName: 'Business Partners Inc',
    title: 'Veri Analitik Çözümü',
    amount: 55000,
    status: 'REJECTED',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-08'),
    viewedAt: new Date('2026-03-02'),
    viewCount: 1,
  },
  {
    id: '8',
    number: 'TKL-2026-008',
    customerName: 'Cloud Services Co',
    title: 'Altyapı Kurulumu',
    amount: 95000,
    status: 'SENT',
    createdAt: new Date('2026-03-25'),
    updatedAt: new Date('2026-03-26'),
    viewedAt: null,
    viewCount: 0,
  },
  {
    id: '9',
    number: 'TKL-2026-009',
    customerName: 'Marketing Pro',
    title: 'Dijital Pazarlama Kampanyası',
    amount: 18500,
    status: 'VIEWED',
    createdAt: new Date('2026-03-12'),
    updatedAt: new Date('2026-03-19'),
    viewedAt: new Date('2026-03-19'),
    viewCount: 3,
  },
  {
    id: '10',
    number: 'TKL-2026-010',
    customerName: 'Retail Solutions',
    title: 'E-ticaret Platformu',
    amount: 145000,
    status: 'DRAFT',
    createdAt: new Date('2026-03-27'),
    updatedAt: new Date('2026-03-29'),
    viewedAt: null,
    viewCount: 0,
  },
  {
    id: '11',
    number: 'TKL-2026-011',
    customerName: 'Financial Group',
    title: 'Siber Güvenlik Çözümü',
    amount: 78000,
    status: 'ACCEPTED',
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-03-05'),
    viewedAt: new Date('2026-02-22'),
    viewCount: 6,
  },
  {
    id: '12',
    number: 'TKL-2026-012',
    customerName: 'Manufacturing Ltd',
    title: 'ERP Sistemi Kurulumu',
    amount: 210000,
    status: 'VIEWED',
    createdAt: new Date('2026-03-08'),
    updatedAt: new Date('2026-03-16'),
    viewedAt: new Date('2026-03-16'),
    viewCount: 4,
  },
  {
    id: '13',
    number: 'TKL-2026-013',
    customerName: 'Healthcare Plus',
    title: 'Hastane Yönetim Sistemi',
    amount: 185000,
    status: 'EXPIRED',
    createdAt: new Date('2025-12-15'),
    updatedAt: new Date('2026-01-15'),
    viewedAt: new Date('2026-01-01'),
    viewCount: 2,
  },
  {
    id: '14',
    number: 'TKL-2026-014',
    customerName: 'Logistics Network',
    title: 'Lojistik Takip Sistemi',
    amount: 75000,
    status: 'SENT',
    createdAt: new Date('2026-03-22'),
    updatedAt: new Date('2026-03-23'),
    viewedAt: null,
    viewCount: 0,
  },
  {
    id: '15',
    number: 'TKL-2026-015',
    customerName: 'Education Board',
    title: 'Öğrenci Yönetim Sistemi',
    amount: 52000,
    status: 'DRAFT',
    createdAt: new Date('2026-03-29'),
    updatedAt: new Date('2026-03-29'),
    viewedAt: null,
    viewCount: 0,
  },
];

const ITEMS_PER_PAGE = 10;

export default function ProposalsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProposals = useMemo(() => {
    return MOCK_PROPOSALS.filter((proposal) => {
      const matchesSearch =
        proposal.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.title.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || proposal.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredProposals.length / ITEMS_PER_PAGE);
  const paginatedProposals = filteredProposals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats: StatCard[] = [
    {
      label: 'Toplam Teklif',
      value: MOCK_PROPOSALS.length,
    },
    {
      label: 'Bekleyen',
      value: MOCK_PROPOSALS.filter((p) => p.status === 'SENT').length,
    },
    {
      label: 'Kabul Edilen',
      value: MOCK_PROPOSALS.filter((p) => p.status === 'ACCEPTED').length,
      highlight: true,
    },
    {
      label: 'Toplam Değer',
      value: `₺${(MOCK_PROPOSALS.reduce((sum, p) => sum + p.amount, 0) / 1000).toFixed(1)}K`,
    },
  ];

  const handleRowClick = (id: string) => {
    router.push(`/proposals/${id}`);
  };

  const handleCopyLink = (e: React.MouseEvent, number: string) => {
    e.stopPropagation();
    const link = `${window.location.origin}/proposals/${number}`;
    navigator.clipboard.writeText(link);
    alert('Link kopyalandı!');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Bu teklifi silmek istediğinizden emin misiniz?')) {
      alert(`Teklif ${id} silindi`);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent, customerName: string) => {
    e.stopPropagation();
    alert(`${customerName} için WhatsApp mesajı gönderme sayfasına yönlendirileceksiniz`);
  };

  const formatDate = (date: Date) => {
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
                  placeholder="Teklif No, Müşteri, Başlık..."
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
                    {statusFilter === 'ALL' ? 'Tümü' : STATUS_LABELS[statusFilter as ProposalStatus]}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}>
                    Tümü
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
              onClick={() => router.push('/proposals/new')}
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Müşteri</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Başlık</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Tutar</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Durum</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Oluşturulma</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Son Güncelleme</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Görüntülenme</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProposals.length > 0 ? (
                paginatedProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    onClick={() => handleRowClick(proposal.id)}
                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{proposal.number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proposal.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{proposal.title}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatAmount(proposal.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className={`${STATUS_COLORS[proposal.status]}`}>
                        {STATUS_LABELS[proposal.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(proposal.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(proposal.updatedAt)}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{proposal.viewCount}</td>
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
                            Görüntüle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/proposals/${proposal.id}/edit`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert(`Teklif ${proposal.id} kopyalanıyor...`)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Kopyala
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleWhatsApp(e, proposal.customerName)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp Gönder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => handleCopyLink(e, proposal.number)}>
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
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Teklif bulunamadı
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
              {paginatedProposals.length > 0 && (
                <>
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProposals.length)} / {filteredProposals.length}
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
