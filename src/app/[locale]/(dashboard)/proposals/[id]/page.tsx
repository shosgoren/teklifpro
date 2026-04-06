'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import useSWR from 'swr';
import { useConfirm } from '@/shared/components/confirm-dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Logger } from '@/infrastructure/logger';
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
  User,
  Phone,
  QrCode,
  X,
  CloudUpload,
  RefreshCw,
  ExternalLink,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { toast } from 'sonner';

const logger = new Logger('ProposalDetailPage');

type ProposalStatus = 'DRAFT' | 'READY' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'EXPIRED' | 'INVOICED';

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }).then(data => {
    if (!data.success) throw new Error(data.error || 'API error');
    return data;
  });

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  READY: 'bg-cyan-100 text-cyan-800',
  SENT: 'bg-blue-100 text-blue-800',
  VIEWED: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
  EXPIRED: 'bg-slate-700 text-white',
  INVOICED: 'bg-indigo-100 text-indigo-800',
};


interface ProposalItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | string;
  discountRate: number | string;
  vatRate: number | string;
  lineTotal: number | string;
}

interface ProposalActivity {
  id: string;
  type: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const ACTIVITY_ICON_COLORS: Record<string, string> = {
  CREATED: 'from-blue-500 to-blue-600',
  READY: 'from-cyan-500 to-cyan-600',
  SENT: 'from-indigo-500 to-indigo-600',
  VIEWED: 'from-amber-500 to-amber-600',
  ACCEPTED: 'from-emerald-500 to-emerald-600',
  REJECTED: 'from-red-500 to-red-600',
  REVISION_REQUESTED: 'from-orange-500 to-orange-600',
  UPDATED: 'from-violet-500 to-violet-600',
  CANCELLED: 'from-gray-500 to-gray-600',
  INVOICED: 'from-indigo-500 to-indigo-600',
  E_FATURA_SENT: 'from-teal-500 to-teal-600',
  E_ARSIV_SENT: 'from-teal-500 to-teal-600',
};

const getActivityIcon = (type: string) => {
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
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'CREATED': return 'Oluşturuldu';
    case 'SENT': return 'Gönderildi';
    case 'VIEWED': return 'Görüntülendi';
    case 'ACCEPTED': return 'Kabul Edildi';
    case 'REJECTED': return 'Reddedildi';
    case 'REVISION_REQUESTED': return 'Revize İstendi';
    case 'UPDATED': return 'Güncellendi';
    case 'CANCELLED': return 'Silindi';
    default: return type;
  }
};

export default function ProposalDetailPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('proposals');
  const confirm = useConfirm();
  const params = useParams();
  const proposalId = params.id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- next-intl dynamic translation key
  const statusLabel = (s: string) => t(`status.${s}` as Parameters<typeof t>[0]) || s;

  const { data, error, isLoading } = useSWR(
    proposalId ? `/api/v1/proposals/${proposalId}` : null,
    fetcher,
    { refreshInterval: 10000 } // Auto-refresh every 10s for realtime status updates
  );

  const proposal = data?.data;
  const [showQR, setShowQR] = useState(false);
  const [parasutLoading, setParasutLoading] = useState<string | null>(null); // 'push' | 'pull' | 'pdf' | 'share'

  // Parasut integration handlers
  const handleParasutPush = async () => {
    setParasutLoading('push');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast.success('Teklif Paraşüt\'e gönderildi!');
        window.location.reload();
      } else {
        toast.error(result.error || 'Paraşüt\'e gönderme başarısız');
      }
    } catch {
      toast.error('Paraşüt bağlantı hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutPull = async () => {
    setParasutLoading('pull');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut`);
      const result = await res.json();
      if (result.success) {
        toast.success(`Paraşüt durumu: ${result.data.parasutStatus}`);
        if (result.data.teklifproStatus !== proposal?.status) {
          window.location.reload();
        }
      } else {
        toast.error(result.error || 'Durum çekme başarısız');
      }
    } catch {
      toast.error('Paraşüt bağlantı hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutPdf = async () => {
    setParasutLoading('pdf');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut/pdf`, { method: 'POST' });
      const result = await res.json();
      if (result.success && result.data.pdfUrl) {
        window.open(result.data.pdfUrl, '_blank');
        toast.success('PDF hazır!');
      } else if (result.success) {
        toast.info('PDF hazırlanıyor, lütfen birkaç saniye sonra tekrar deneyin');
      } else {
        toast.error(result.error || 'PDF oluşturulamadı');
      }
    } catch {
      toast.error('PDF oluşturma hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutShare = async () => {
    if (!proposal?.customer?.email) {
      toast.error('Müşteri e-posta adresi bulunamadı');
      return;
    }
    setParasutLoading('share');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: proposal.customer.email }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Teklif ${proposal.customer.email} adresine gönderildi!`);
      } else {
        toast.error(result.error || 'E-posta gönderilemedi');
      }
    } catch {
      toast.error('E-posta gönderme hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutInvoice = async () => {
    setParasutLoading('invoice');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut/invoice`, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        toast.success('Fatura oluşturuldu!');
        window.location.reload();
      } else {
        toast.error(result.error || 'Fatura oluşturulamadı');
      }
    } catch {
      toast.error('Fatura oluşturma hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutInvoiceStatus = async () => {
    setParasutLoading('invoiceStatus');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut/invoice`);
      const result = await res.json();
      if (result.success) {
        const d = result.data;
        const statusText = d.paymentStatus === 'paid' ? 'Ödendi' : d.paymentStatus === 'overdue' ? 'Vadesi Geçmiş' : 'Ödenmedi';
        const eDocText = d.eDocumentStatus ? ` | E-Belge: ${d.eDocumentStatus}` : '';
        toast.success(`Fatura: ${statusText}${eDocText}`);
      } else {
        toast.error(result.error || 'Fatura durumu çekilemedi');
      }
    } catch {
      toast.error('Fatura durum hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const handleParasutEFatura = async (type: 'e_invoice' | 'e_archive') => {
    setParasutLoading('efatura');
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}/parasut/efatura`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.data.message);
      } else {
        toast.error(result.error || 'E-belge gönderilemedi');
      }
    } catch {
      toast.error('E-belge gönderme hatası');
    } finally {
      setParasutLoading(null);
    }
  };

  const proposalLink = proposal?.publicToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/proposal/${proposal.publicToken}`
    : '';

  const handleEdit = () => {
    router.push(`/${locale}/proposals/${proposalId}/edit`);
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: 'Bu teklifi silmek istediğinizden emin misiniz?', confirmText: 'Sil', variant: 'danger' });
    if (!ok) return;
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push(`/${locale}/proposals`);
      } else {
        toast.error('Silme işlemi sırasında hata oluştu.');
      }
    } catch {
      toast.error('Silme işlemi sırasında hata oluştu.');
    }
  };

  const handleMakeReady = async () => {
    try {
      toast.loading('Teklif hazırlanıyor...', { id: 'make-ready' });
      const res = await fetch(`/api/v1/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Durum değiştirilemedi');
      }
      toast.success('Teklif hazır durumuna getirildi!', { id: 'make-ready' });
      router.refresh();
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hata oluştu', { id: 'make-ready' });
    }
  };

  const handleSendWhatsApp = async () => {
    if (!proposal?.customer?.phone) {
      toast.error('Müşteri telefon numarası bulunamadı');
      return;
    }
    try {
      toast.loading('WhatsApp mesajı gönderiliyor...', { id: 'whatsapp-send' });
      const res = await fetch(`/api/v1/proposals/${proposalId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'whatsapp' }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gönderim başarısız');
      }
      toast.success('WhatsApp mesajı gönderildi!', { id: 'whatsapp-send' });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'WhatsApp gönderilemedi', { id: 'whatsapp-send' });
    }
  };

  const handleSendEmail = () => {
    if (proposal?.customer?.email) {
      window.open(`mailto:${proposal.customer.email}?subject=Teklif: ${proposal.proposalNumber}`);
    }
  };

  const handleCopyLink = () => {
    if (!proposal?.publicToken) return;
    const link = `${window.location.origin}/proposal/${proposal.publicToken}`;
    navigator.clipboard.writeText(link);
    toast.success('Link kopyalandı!');
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('PDF oluşturuluyor...', { id: 'pdf-download' });
      const res = await fetch(`/api/v1/proposals/${proposalId}/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${proposal?.proposalNumber || 'teklif'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('PDF indirildi!', { id: 'pdf-download' });
      } else {
        const errorData = await res.json().catch(() => ({}));
        logger.error('PDF download failed', { status: res.status, errorData });
        toast.error(`PDF indirme başarısız (${res.status})`, { id: 'pdf-download' });
      }
    } catch (err) {
      logger.error('PDF download error', err);
      toast.error('PDF indirme sırasında hata oluştu.', { id: 'pdf-download' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
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

  // --- Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 shadow-lg">
            <div className="h-4 w-32 bg-white/20 rounded-full animate-pulse mb-4" />
            <div className="h-8 w-72 bg-white/20 rounded-2xl animate-pulse mb-2" />
            <div className="h-5 w-48 bg-white/20 rounded-2xl animate-pulse mb-6" />
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 w-10 bg-white/20 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-96 bg-white dark:bg-gray-900 rounded-2xl shadow-lg animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-white dark:bg-gray-900 rounded-2xl shadow-lg animate-pulse" />
              <div className="h-48 bg-white dark:bg-gray-900 rounded-2xl shadow-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-medium text-red-600 dark:text-red-400">
              {error?.message === 'HTTP 404' ? 'Teklif bulunamadi.' : 'Veriler yuklenirken hata olustu. Lutfen sayfayi yenileyin.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const status = proposal.status as ProposalStatus;
  const items = proposal.items || [];
  const activities = proposal.activities || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-36 md:pb-6">
      {/* ===== Gradient Header ===== */}
      <div className="relative overflow-hidden rounded-b-3xl md:rounded-b-none">
        <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 mx-4 mt-4 md:mx-6 md:mt-6 shadow-lg">
          {/* Decorative circle */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-6" />

          {/* Breadcrumb */}
          <div className="relative z-10 mb-4 flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push(`/${locale}/proposals`)}
              className="text-white/60 hover:text-white transition-colors"
            >
              Teklifler
            </button>
            <ChevronRight className="h-4 w-4 text-white/40" />
            <span className="text-white/90 font-medium">{proposal.proposalNumber}</span>
          </div>

          {/* Title & Status */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{proposal.proposalNumber}</h1>
              {proposal.title && (
                <p className="text-white/70 text-sm md:text-base">{proposal.title}</p>
              )}
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1 text-sm font-medium w-fit">
              {statusLabel(status) || status}
            </Badge>
          </div>

          {/* Desktop Action Buttons */}
          <div className="relative z-10 hidden md:flex flex-wrap gap-2">
            {status === 'DRAFT' && (
              <button
                onClick={handleMakeReady}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-xl backdrop-blur-sm transition-colors text-sm font-medium"
                title="Hazırla"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Hazırla</span>
              </button>
            )}
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors text-sm font-medium"
              title="Düzenle"
            >
              <Edit className="h-4 w-4" />
              <span>Düzenle</span>
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
              title="WhatsApp Gönder"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={handleSendEmail}
              className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
              title="E-posta Gönder"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
              title="Link Kopyala"
            >
              <Link className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
              title="QR Kod"
            >
              <QrCode className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm transition-colors"
              title="PDF İndir"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center justify-center w-10 h-10 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl backdrop-blur-sm transition-colors ml-auto"
              title="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Proposal Preview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-6 md:p-8">
                {/* Company Header */}
                <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Teklifpro</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">www.teklifpro.com | info@teklifpro.com</p>
                </div>

                {/* Proposal Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Teklif Tarihi</p>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatDate(proposal.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Teklif No</p>
                    <p className="text-gray-900 dark:text-white font-semibold text-sm">{proposal.proposalNumber}</p>
                  </div>
                  {proposal.expiresAt && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Geçerlilik</p>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{formatDate(proposal.expiresAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Durum</p>
                    <Badge className={`${STATUS_COLORS[status] || ''} w-fit text-xs`}>
                      {statusLabel(status) || status}
                    </Badge>
                  </div>
                </div>

                {/* Customer Info in Preview */}
                {proposal.customer && (
                  <div className="mb-8">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Müşteri</p>
                    <p className="text-gray-900 dark:text-white font-semibold">{proposal.customer.name}</p>
                    {proposal.customer.email && <p className="text-gray-500 dark:text-gray-400 text-sm">{proposal.customer.email}</p>}
                    {proposal.customer.phone && <p className="text-gray-500 dark:text-gray-400 text-sm">{proposal.customer.phone}</p>}
                  </div>
                )}

                {/* Line Items - Desktop Table */}
                <div className="mb-8">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Kalemler</p>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ürün/Hizmet</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Miktar</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Birim Fiyat</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İskonto</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">KDV</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item: ProposalItem, idx: number) => (
                          <tr
                            key={item.id}
                            className={`border-t border-gray-100 dark:border-gray-800 ${
                              idx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.name}</td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{formatAmount(Number(item.unitPrice) || 0)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">%{Number(item.discountRate) || 0}</td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">%{Number(item.vatRate) || 0}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              {formatAmount(Number(item.lineTotal) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {items.map((item: ProposalItem) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 p-4"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">{item.name}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-400 text-xs">Miktar</span>
                            <p className="text-gray-700 dark:text-gray-300">{item.quantity}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">Birim Fiyat</span>
                            <p className="text-gray-700 dark:text-gray-300">{formatAmount(Number(item.unitPrice) || 0)}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">İskonto</span>
                            <p className="text-gray-700 dark:text-gray-300">%{Number(item.discountRate) || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-xs">KDV</span>
                            <p className="text-gray-700 dark:text-gray-300">%{Number(item.vatRate) || 0}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Toplam</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatAmount(Number(item.lineTotal) || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                  <div className="w-full md:w-72 space-y-2">
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Ara Toplam:</span>
                      <span>{formatAmount(Number(proposal.subtotal) || 0)}</span>
                    </div>
                    {Number(proposal.discountAmount) > 0 && (
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>İskonto:</span>
                        <span>-{formatAmount(Number(proposal.discountAmount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>KDV:</span>
                      <span>{formatAmount(Number(proposal.vatTotal) || 0)}</span>
                    </div>
                    {/* Grand total with gradient bg */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 mt-2">
                      <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                        <span>Genel Toplam:</span>
                        <span>{formatAmount(Number(proposal.grandTotal) || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {proposal.notes && (
                  <div className="mb-6 p-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Notlar</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{proposal.notes}</p>
                  </div>
                )}

                {/* Terms */}
                {(proposal.paymentTerms || proposal.deliveryTerms) && (
                  <div className="p-4 bg-gray-50/80 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Sartlar</p>
                    {proposal.paymentTerms && <p className="text-sm text-gray-700 dark:text-gray-300">Odeme: {proposal.paymentTerms}</p>}
                    {proposal.deliveryTerms && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Teslimat: {proposal.deliveryTerms}</p>}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ===== Sidebar ===== */}
          <div className="space-y-6">
            {/* View Analytics */}
            <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-5">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{t('analytics.title')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                    <Eye className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{proposal.viewCount || 0}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.views')}</p>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                    <Clock className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {proposal.totalViewDuration
                        ? proposal.totalViewDuration >= 60
                          ? `${Math.floor(proposal.totalViewDuration / 60)}m`
                          : `${proposal.totalViewDuration}s`
                        : '0s'}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.duration')}</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                    <FileText className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {proposal.viewedAt ? new Date(proposal.viewedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('analytics.lastView')}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Digital Signature */}
            {proposal.signatureData && proposal.status === 'ACCEPTED' && (
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{t('signature.title')}</h3>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proposal.signatureData} alt="Signature" className="max-h-20 mx-auto" />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    {proposal.signerName && <span className="font-medium text-gray-700 dark:text-gray-300">{proposal.signerName}</span>}
                    {proposal.signedAt && <span>{new Date(proposal.signedAt).toLocaleString('tr-TR')}</span>}
                  </div>
                </div>
              </Card>
            )}

            {/* Parasut Integration Card */}
            <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden border-t-4 border-t-emerald-500">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Paraşüt Entegrasyonu</h3>
                  {proposal.parasutOfferId && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
                      Bağlı
                    </Badge>
                  )}
                </div>

                {proposal.parasutOfferId ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paraşüt Teklif ID</p>
                      <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{proposal.parasutOfferId}</p>
                      {proposal.parasutLastSyncAt && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Son sync: {new Date(proposal.parasutLastSyncAt).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!!parasutLoading}
                        onClick={handleParasutPull}
                      >
                        {parasutLoading === 'pull' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Durum Çek
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!!parasutLoading}
                        onClick={handleParasutPush}
                      >
                        {parasutLoading === 'push' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CloudUpload className="h-3 w-3 mr-1" />}
                        Güncelle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!!parasutLoading}
                        onClick={handleParasutPdf}
                      >
                        {parasutLoading === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={!!parasutLoading || !proposal.customer?.email}
                        onClick={handleParasutShare}
                      >
                        {parasutLoading === 'share' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                        E-posta
                      </Button>
                    </div>

                    {/* Invoice Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Fatura</p>
                      {proposal.parasutInvoiceId ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fatura ID</p>
                            <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{proposal.parasutInvoiceId}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={!!parasutLoading}
                              onClick={handleParasutInvoiceStatus}
                            >
                              {parasutLoading === 'invoiceStatus' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                              Fatura Durum
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={!!parasutLoading}
                              onClick={() => handleParasutEFatura('e_invoice')}
                            >
                              {parasutLoading === 'efatura' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                              E-Fatura
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs col-span-2"
                              disabled={!!parasutLoading}
                              onClick={() => handleParasutEFatura('e_archive')}
                            >
                              {parasutLoading === 'efatura' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                              E-Arşiv Fatura
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                          disabled={!!parasutLoading || (proposal.status !== 'ACCEPTED' && proposal.status !== 'INVOICED')}
                          onClick={handleParasutInvoice}
                        >
                          {parasutLoading === 'invoice' ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CloudUpload className="h-4 w-4 mr-2" />
                          )}
                          Faturaya Dönüştür
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Bu teklif henüz Paraşüt ile senkronize edilmemiş.
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                      disabled={!!parasutLoading}
                      onClick={handleParasutPush}
                    >
                      {parasutLoading === 'push' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CloudUpload className="h-4 w-4 mr-2" />
                      )}
                      Paraşüt&apos;e Gönder
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden">
              <div className="p-5">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">Faaliyet Geçmişi</h3>
                <div className="space-y-0">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Henuz faaliyet yok.</p>
                  ) : (
                    activities.map((activity: ProposalActivity, idx: number) => (
                      <div key={activity.id} className="flex gap-3">
                        {/* Timeline column */}
                        <div className="flex flex-col items-center">
                          <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${ACTIVITY_ICON_COLORS[activity.type] || 'from-gray-400 to-gray-500'} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                            {getActivityIcon(activity.type)}
                          </div>
                          {idx < activities.length - 1 && (
                            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-4 pt-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{getActivityLabel(activity.type)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(activity.createdAt)}</p>
                          {activity.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Customer Info Card */}
            {proposal.customer && (
              <Card className="rounded-2xl border-0 shadow-lg bg-white dark:bg-gray-900 overflow-hidden border-t-4 border-t-blue-500">
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">Müşteri Bilgileri</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{proposal.customer.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Müşteri</p>
                      </div>
                    </div>
                    {proposal.customer.email && (
                      <div className="flex items-center gap-3 pl-1">
                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                        <a href={`mailto:${proposal.customer.email}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm truncate">
                          {proposal.customer.email}
                        </a>
                      </div>
                    )}
                    {proposal.customer.phone && (
                      <div className="flex items-center gap-3 pl-1">
                        <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                        <a href={`tel:${proposal.customer.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                          {proposal.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ===== QR Code Dialog ===== */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{t('qrCode')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {proposalLink && (
              <div className="p-4 bg-white rounded-2xl shadow-inner">
                <QRCodeSVG
                  value={proposalLink}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>
            )}
            <p className="text-sm text-gray-500 text-center max-w-xs">
              {t('qrCodeDesc')}
            </p>
            <p className="text-xs text-gray-400 font-mono break-all text-center px-4">
              {proposal?.proposalNumber}
            </p>
            <button
              onClick={() => {
                if (!proposalLink) return;
                navigator.clipboard.writeText(proposalLink);
                toast.success(t('linkCopied'));
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              <Link className="h-4 w-4" />
              {t('copyLink')}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Mobile Sticky Bottom Bar ===== */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {status === 'DRAFT' && (
          <button
            onClick={handleMakeReady}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors text-sm font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            Hazırla
          </button>
        )}
        <button
          onClick={handleEdit}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium"
        >
          <Edit className="h-4 w-4" />
          Duzenle
        </button>
        <button
          onClick={handleSendWhatsApp}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
        <button
          onClick={handleSendEmail}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="E-posta"
        >
          <Mail className="h-4 w-4" />
        </button>
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="Link Kopyala"
        >
          <Link className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowQR(true)}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="QR Kod"
        >
          <QrCode className="h-4 w-4" />
        </button>
        <button
          onClick={handleDownloadPDF}
          className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
          title="PDF"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center justify-center w-10 h-10 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-colors"
          title="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
