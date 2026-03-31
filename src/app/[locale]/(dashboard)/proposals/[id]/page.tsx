'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  Edit,
  MessageCircle,
  Mail,
  Link,
  Download,
  Trash2,
  ChevronRight,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'EXPIRED';

interface ProposalItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
}

interface Activity {
  id: string;
  type: 'CREATED' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED';
  timestamp: Date;
  description: string;
}

interface ProposalDetail {
  id: string;
  number: string;
  status: ProposalStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;
  description: string;
  items: ProposalItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  notes: string;
  terms: string;
  createdAt: Date;
  updatedAt: Date;
  activities: Activity[];
  revisionRequest?: {
    note: string;
    requestedAt: Date;
  };
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

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'CREATED':
      return <FileText className="h-4 w-4" />;
    case 'SENT':
      return <Mail className="h-4 w-4" />;
    case 'VIEWED':
      return <Eye className="h-4 w-4" />;
    case 'ACCEPTED':
      return <CheckCircle className="h-4 w-4" />;
    case 'REJECTED':
      return <XCircle className="h-4 w-4" />;
    case 'REVISION_REQUESTED':
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getActivityLabel = (type: Activity['type']) => {
  switch (type) {
    case 'CREATED':
      return 'Oluşturuldu';
    case 'SENT':
      return 'Gönderildi';
    case 'VIEWED':
      return 'Görüntülendi';
    case 'ACCEPTED':
      return 'Kabul Edildi';
    case 'REJECTED':
      return 'Reddedildi';
    case 'REVISION_REQUESTED':
      return 'Revize İstendi';
  }
};

// Mock detailed proposal data
const MOCK_PROPOSAL: ProposalDetail = {
  id: '3',
  number: 'TKL-2026-003',
  status: 'REVISION_REQUESTED',
  customerName: 'Digital Ventures',
  customerEmail: 'contact@digitalventures.com',
  customerPhone: '+90 212 555 0123',
  title: 'Mobil Uygulama Geliştirme',
  description: 'Full-stack mobil uygulama geliştirme projesi - iOS ve Android',
  items: [
    {
      id: '1',
      productName: 'Mobil Uygulama Geliştirme - Backend',
      quantity: 1,
      unitPrice: 25000,
      discount: 0,
      vatRate: 18,
    },
    {
      id: '2',
      productName: 'Mobil Uygulama Geliştirme - iOS',
      quantity: 1,
      unitPrice: 20000,
      discount: 0,
      vatRate: 18,
    },
    {
      id: '3',
      productName: 'Mobil Uygulama Geliştirme - Android',
      quantity: 1,
      unitPrice: 20000,
      discount: 0,
      vatRate: 18,
    },
  ],
  subtotal: 65000,
  discount: 0,
  vat: 11700,
  total: 76700,
  notes: 'Proje, 16 haftalık geliştirme dönemini kapsamaktadır.',
  terms: '50% ön ödeme, 50% teslim sırasında ödeme. Destekleme hizmeti ilk 3 ay ücretsiz olacaktır.',
  createdAt: new Date('2026-03-10'),
  updatedAt: new Date('2026-03-28'),
  activities: [
    {
      id: '1',
      type: 'CREATED',
      timestamp: new Date('2026-03-10T10:00:00'),
      description: 'Teklif oluşturuldu',
    },
    {
      id: '2',
      type: 'SENT',
      timestamp: new Date('2026-03-10T14:30:00'),
      description: 'Teklif müşteriye gönderildi',
    },
    {
      id: '3',
      type: 'VIEWED',
      timestamp: new Date('2026-03-12T09:15:00'),
      description: 'Müşteri tarafından görüntülendi',
    },
    {
      id: '4',
      type: 'VIEWED',
      timestamp: new Date('2026-03-15T16:45:00'),
      description: 'Müşteri tarafından görüntülendi',
    },
    {
      id: '5',
      type: 'VIEWED',
      timestamp: new Date('2026-03-20T11:20:00'),
      description: 'Müşteri tarafından görüntülendi',
    },
    {
      id: '6',
      type: 'REVISION_REQUESTED',
      timestamp: new Date('2026-03-28T13:45:00'),
      description: 'Müşteri revize isteğinde bulundu',
    },
  ],
  revisionRequest: {
    note: 'Backend ve frontend tasarımlarında küçük değişikliklerin yapılması gerekmektedir. Ayrıca geliştirme takvimi hakkında daha detaylı bilgi istiyoruz.',
    requestedAt: new Date('2026-03-28T13:45:00'),
  },
};

export default function ProposalDetailPage() {
  const router = useRouter();
  const locale = useLocale();
  const [proposal] = useState<ProposalDetail>(MOCK_PROPOSAL);

  const handleEdit = () => {
    router.push(`/${locale}/proposals/${proposal.id}/edit`);
  };

  const handleDelete = () => {
    if (confirm('Bu teklifi silmek istediğinizden emin misiniz?')) {
      alert('Teklif silindi');
      router.push(`/${locale}/proposals`);
    }
  };

  const handleSendWhatsApp = () => {
    const message = `Merhaba, ${proposal.number} numaralı teklif hakkında konuşmak istiyorum.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${proposal.customerPhone.replace(/\D/g, '')}?text=${encodedMessage}`);
  };

  const handleSendEmail = () => {
    alert(`E-posta gönderi sayfasına yönlendirileceksiniz - ${proposal.customerEmail}`);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/proposals/${proposal.number}`;
    navigator.clipboard.writeText(link);
    alert('Link kopyalandı!');
  };

  const handleDownloadPDF = () => {
    alert('PDF indirme başlatılacak...');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateLineTotal = (item: ProposalItem) => {
    const priceAfterDiscount = item.unitPrice * (1 - item.discount / 100);
    const subtotal = priceAfterDiscount * item.quantity;
    return subtotal;
  };

  const calculateLineWithVAT = (item: ProposalItem) => {
    const lineTotal = calculateLineTotal(item);
    return lineTotal * (1 + item.vatRate / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
        <button
          onClick={() => router.push(`/${locale}/proposals`)}
          className="hover:text-gray-900"
        >
          Teklifler
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{proposal.number}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{proposal.number}</h1>
            <p className="text-gray-600">{proposal.title}</p>
          </div>
          <Badge className={`${STATUS_COLORS[proposal.status]} h-fit`}>
            {STATUS_LABELS[proposal.status]}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
          <Button variant="outline" onClick={handleSendWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp Gönder
          </Button>
          <Button variant="outline" onClick={handleSendEmail}>
            <Mail className="h-4 w-4 mr-2" />
            E-posta Gönder
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            <Link className="h-4 w-4 mr-2" />
            Link Kopyala
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF İndir
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revision Notice */}
          {proposal.status === 'REVISION_REQUESTED' && proposal.revisionRequest && (
            <Card className="border-2 border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 mb-2">Revize İsteği</h3>
                  <p className="text-orange-800 text-sm mb-3">{proposal.revisionRequest.note}</p>
                  <p className="text-xs text-orange-700 mb-3">
                    {formatDateTime(proposal.revisionRequest.requestedAt)}
                  </p>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Edit className="h-4 w-4 mr-2" />
                    Revize Et
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Proposal Preview */}
          <Card className="border border-gray-200 p-8 bg-white">
            {/* Company Header */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Teklifpro</h2>
              <p className="text-gray-600 text-sm">www.teklifpro.com | info@teklifpro.com</p>
            </div>

            {/* Invoice/Proposal Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Teklif Tarihi</p>
                <p className="text-gray-900 font-semibold">{formatDate(proposal.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Teklif No</p>
                <p className="text-gray-900 font-semibold">{proposal.number}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Geçerlilik</p>
                <p className="text-gray-900 font-semibold">30 Gün</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Durum</p>
                <Badge className={`${STATUS_COLORS[proposal.status]} w-fit`}>
                  {STATUS_LABELS[proposal.status]}
                </Badge>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Fatura Adresi</p>
              <p className="text-gray-900 font-semibold">{proposal.customerName}</p>
              <p className="text-gray-600 text-sm">{proposal.customerEmail}</p>
              <p className="text-gray-600 text-sm">{proposal.customerPhone}</p>
            </div>

            {/* Line Items */}
            <div className="mb-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Ürün/Hizmet</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">Miktar</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">Birim Fiyat</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">İskonto</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">KDV</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-900">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-gray-900">{item.productName}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatAmount(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">%{item.discount}</td>
                      <td className="px-3 py-2 text-right text-gray-600">%{item.vatRate}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatAmount(calculateLineWithVAT(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Ara Toplam:</span>
                  <span>{formatAmount(proposal.subtotal)}</span>
                </div>
                {proposal.discount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>İskonto:</span>
                    <span>-{formatAmount(proposal.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>KDV (Ort. %18):</span>
                  <span>{formatAmount(proposal.vat)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Genel Toplam:</span>
                  <span>{formatAmount(proposal.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {proposal.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Notlar</p>
                <p className="text-sm text-gray-700">{proposal.notes}</p>
              </div>
            )}

            {proposal.terms && (
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Şartlar</p>
                <p className="text-sm text-gray-700">{proposal.terms}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card className="border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Faaliyet Geçmişi</h3>
            <div className="space-y-4">
              {proposal.activities.map((activity, idx) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                      {getActivityIcon(activity.type)}
                    </div>
                    {idx < proposal.activities.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-medium text-gray-900">{getActivityLabel(activity.type)}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(activity.timestamp)}</p>
                    {activity.description && (
                      <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Customer Info Card */}
          <Card className="border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Müşteri Bilgileri</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Ad</p>
                <p className="text-gray-900">{proposal.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">E-posta</p>
                <a href={`mailto:${proposal.customerEmail}`} className="text-blue-600 hover:underline text-sm">
                  {proposal.customerEmail}
                </a>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Telefon</p>
                <a href={`tel:${proposal.customerPhone}`} className="text-blue-600 hover:underline text-sm">
                  {proposal.customerPhone}
                </a>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Hızlı İstatistikler</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Görüntülenme Sayısı</p>
                <p className="font-semibold text-gray-900">3</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Son Görüntüleme</p>
                <p className="text-xs text-gray-900">20 Mart</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Gönderildikten Sonra Geçen Süre</p>
                <p className="text-xs text-gray-900">18 gün</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
