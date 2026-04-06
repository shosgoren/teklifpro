'use client'

import {
  FileText,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Building2,
  Shield,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  ChevronDown,
  Sparkles,
  PenTool,
  Landmark,
  Copy,
  CreditCard,
  Download,
} from 'lucide-react'
import { useState } from 'react'
import ProposalActions from './proposal-actions'
import { VoiceNotePlayer } from '@/presentation/components/molecules/VoiceNotePlayer'

interface ProposalContentProps {
  proposal: {
    id: string
    proposalNumber: string
    title: string
    status: string
    currency: string
    description: string | null
    notes: string | null
    paymentTerms: string | null
    deliveryTerms: string | null
    termsConditions: string | null
    rejectionReason: string | null
    revisionNote: string | null
    viewCount: number
    createdDate: string
    expiresDate: string | null
    discountType: string | null
    discountValue: number
  }
  tenant: {
    name: string
    logo: string | null
    address: string | null
    phone: string | null
    email: string | null
    taxNumber: string | null
    bankAccounts: { bankName: string; branchName: string; accountHolder: string; iban: string; currency: string }[]
  }
  customer: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    taxNumber: string | null
  }
  contact: { name: string; title: string | null } | null
  userName: string | null
  voiceNote: { data: string; duration: number | null; senderName: string | null } | null
  signature: { data: string; signerName: string | null; signedAt: string | null } | null
  items: {
    id: string
    name: string
    description: string | null
    quantity: number
    unit: string
    unitPrice: number
    discountRate: number
    vatRate: number
    lineTotal: number
    subtotalAfterDiscount: number
    vat: number
  }[]
  financials: {
    subtotal: number
    totalDiscount: number
    proposalLevelDiscount: number
    totalVat: number
    grandTotal: number
  }
  contacts: { id: string; name: string; title: string | null }[]
  isResponded: boolean
  token: string
}

const statusDisplay: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  ACCEPTED: { label: 'Kabul Edildi', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  REJECTED: { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
  REVISION_REQUESTED: { label: 'Revize Talep Edildi', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: RotateCw },
}

export default function ProposalContent({
  proposal,
  tenant,
  customer,
  contact,
  userName,
  voiceNote,
  signature,
  items,
  financials,
  contacts,
  isResponded,
  token,
}: ProposalContentProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showBankInfo, setShowBankInfo] = useState(false)
  const [copiedIban, setCopiedIban] = useState<string | null>(null)

  const copyIban = (iban: string) => {
    navigator.clipboard.writeText(iban)
    setCopiedIban(iban)
    setTimeout(() => setCopiedIban(null), 2000)
  }

  const fmt = (amount: number) =>
    amount.toLocaleString('tr-TR', { style: 'currency', currency: proposal.currency })

  const currentStatus = statusDisplay[proposal.status]

  const cardClass = "animate-fade-in-up"
  const cardShadow = "shadow-sm hover:shadow-md transition-shadow"

  return (
    <div className="min-h-dvh bg-gray-50">
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in-up:nth-child(1) { animation-delay: 0.1s; }
        .animate-fade-in-up:nth-child(2) { animation-delay: 0.15s; }
        .animate-fade-in-up:nth-child(3) { animation-delay: 0.2s; }
        .animate-fade-in-up:nth-child(4) { animation-delay: 0.25s; }
        .animate-fade-in-up:nth-child(5) { animation-delay: 0.3s; }
        .animate-fade-in-up:nth-child(6) { animation-delay: 0.35s; }
        .animate-fade-in-up:nth-child(7) { animation-delay: 0.4s; }
        .animate-fade-in-up:nth-child(8) { animation-delay: 0.45s; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
        }
        .animate-pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ─── Header ─── */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white overflow-hidden">
        {/* Animated dot pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-8 sm:px-6">
          {/* Tenant branding */}
          <div className="flex items-center gap-3 mb-6">
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-10 object-contain rounded-lg bg-white/10 p-1" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-lg">{tenant.name}</p>
                <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              </div>
              <p className="text-blue-200 text-xs">Teklif Sunumu</p>
            </div>
          </div>

          {/* Proposal title & number */}
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 leading-tight">
            {proposal.title || 'Teklif'}
          </h1>
          <p className="text-blue-200 text-sm font-mono">{proposal.proposalNumber}</p>

          {/* Date & expiry pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {proposal.createdDate}
            </div>
            {proposal.expiresDate && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/30 backdrop-blur-sm border border-white/20 text-sm">
                <Clock className="w-3.5 h-3.5" />
                Geçerli: {proposal.expiresDate}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-2 pb-32 print:pb-8">
        {/* ─── Voice Note ─── */}
        {voiceNote && (
          <div className={`mb-4 ${cardClass}`}>
            <VoiceNotePlayer
              audioData={voiceNote.data}
              duration={voiceNote.duration}
              senderName={voiceNote.senderName ?? tenant.name}
              label={voiceNote.senderName
                ? `${voiceNote.senderName} size sesli mesaj bıraktı`
                : `${tenant.name} size sesli mesaj bıraktı`
              }
            />
          </div>
        )}

        {/* ─── Status Banner ─── */}
        {isResponded && currentStatus && (
          <div className={`mb-4 p-4 rounded-2xl border ${currentStatus.bg} flex items-start gap-3 ${cardClass}`}>
            <currentStatus.icon className={`w-5 h-5 ${currentStatus.color} shrink-0 mt-0.5`} />
            <div>
              <p className={`font-bold text-sm ${currentStatus.color}`}>
                Teklif Durumu: {currentStatus.label}
              </p>
              {proposal.status === 'REJECTED' && proposal.rejectionReason && (
                <p className="text-sm text-red-600 mt-1">{proposal.rejectionReason}</p>
              )}
              {proposal.status === 'REVISION_REQUESTED' && proposal.revisionNote && (
                <p className="text-sm text-amber-600 mt-1">{proposal.revisionNote}</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Signature ─── */}
        {signature && proposal.status === 'ACCEPTED' && (
          <div className={`mb-4 p-5 bg-white rounded-2xl ${cardShadow} border border-emerald-100 ${cardClass}`}>
            <div className="flex items-center gap-2 mb-3">
              <PenTool className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Dijital İmza</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature.data} alt="İmza" className="max-h-24 mx-auto" />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              {signature.signerName && <span className="font-medium">{signature.signerName}</span>}
              {signature.signedAt && (
                <span>{new Date(signature.signedAt).toLocaleString('tr-TR')}</span>
              )}
            </div>
          </div>
        )}

        {/* ─── Customer Card ─── */}
        <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 ${cardClass}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Müşteri</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-blue-200 ring-offset-2">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{customer.name}</p>
              {contact && (
                <p className="text-sm text-gray-500">{contact.name}{contact.title ? ` · ${contact.title}` : ''}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 text-blue-600">
                    <Phone className="w-3 h-3" />{customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1 text-blue-600">
                    <Mail className="w-3 h-3" />{customer.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sender info (collapsible) ─── */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`w-full bg-white rounded-2xl ${cardShadow} border border-gray-100 px-5 py-3 mb-4 flex items-center justify-between text-left ${cardClass}`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Gönderen Firma Bilgileri</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {showDetails && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 space-y-2 text-sm text-gray-600 ${cardClass}`}>
            <p className="font-semibold text-gray-900">{tenant.name}</p>
            {userName && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" />{userName}</div>}
            {tenant.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />{tenant.address}</div>}
            {tenant.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{tenant.phone}</div>}
            {tenant.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /><a href={`mailto:${tenant.email}`} className="text-blue-600">{tenant.email}</a></div>}
            {tenant.taxNumber && <div className="flex items-center gap-2 pt-2 border-t border-gray-100"><Building2 className="w-3.5 h-3.5 text-gray-400" />VKN: {tenant.taxNumber}</div>}
          </div>
        )}

        {/* ─── Items ─── */}
        <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 overflow-hidden mb-4 ${cardClass}`}>
          <div className="px-3 sm:px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-indigo-500" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ürünler / Hizmetler
              </p>
            </div>
            <p className="text-xs text-gray-400 ml-3">{items.length} kalem</p>
          </div>

          {/* Mobile: Card view */}
          <div className="divide-y divide-gray-100 sm:hidden">
            {items.map((item, index) => (
              <div key={item.id} className="px-3 sm:px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-1 ml-7">{item.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {item.discountRate > 0 && (
                      <span className="text-xs text-gray-400 line-through mr-1">{fmt(item.quantity * item.unitPrice)}</span>
                    )}
                    <span className="font-bold text-gray-900 text-sm">{fmt(item.lineTotal)}</span>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-2 ml-0 sm:ml-7 text-xs text-gray-500">
                  <span>{item.quantity} {item.unit}</span>
                  <span>×</span>
                  <span>{fmt(item.unitPrice)}</span>
                  {item.discountRate > 0 && (
                    <span className="text-orange-600 font-semibold">-{item.discountRate}%</span>
                  )}
                  <span className="text-gray-400">KDV {item.vatRate}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Ürün / Hizmet</th>
                  <th className="px-3 py-3 text-center font-semibold w-20">Miktar</th>
                  <th className="px-3 py-3 text-right font-semibold w-24">Birim Fiyat</th>
                  <th className="px-3 py-3 text-center font-semibold w-16">İndirim</th>
                  <th className="px-3 py-3 text-center font-semibold w-14">KDV</th>
                  <th className="px-5 py-3 text-right font-semibold w-28">Toplam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="even:bg-gray-50/50 hover:bg-blue-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-3 py-3.5 text-center">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-3.5 text-right font-medium">{fmt(item.unitPrice)}</td>
                    <td className="px-3 py-3.5 text-center">
                      {item.discountRate > 0 ? (
                        <span className="text-orange-600 font-semibold">{item.discountRate}%</span>
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center">{item.vatRate}%</td>
                    <td className="px-5 py-3.5 text-right">
                      {item.discountRate > 0 && (
                        <span className="text-xs text-gray-400 line-through mr-1">{fmt(item.quantity * item.unitPrice)}</span>
                      )}
                      <span className="font-bold text-gray-900">{fmt(item.lineTotal)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Financial Summary ─── */}
        <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 ${cardClass}`}>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Ara Toplam</span>
              <span className="font-medium">{fmt(financials.subtotal)}</span>
            </div>
            {financials.totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Satır İndirimleri</span>
                <span className="font-medium">-{fmt(financials.totalDiscount)}</span>
              </div>
            )}
            {financials.proposalLevelDiscount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>
                  {proposal.discountType === 'PERCENTAGE'
                    ? `İndirim (${proposal.discountValue}%)`
                    : 'İndirim'}
                </span>
                <span className="font-medium">-{fmt(financials.proposalLevelDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
              <span>KDV</span>
              <span className="font-medium">{fmt(financials.totalVat)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="mt-4 p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl text-white flex items-center justify-between animate-pulse-glow">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Genel Toplam</p>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">{fmt(financials.grandTotal)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ─── Notes & Terms ─── */}
        {(proposal.description || proposal.notes || proposal.paymentTerms || proposal.deliveryTerms || proposal.termsConditions) && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 space-y-4 ${cardClass}`}>
            {proposal.description && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-blue-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Açıklama</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.description}</p>
              </div>
            )}
            {proposal.notes && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notlar</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.notes}</p>
              </div>
            )}
            {proposal.paymentTerms && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ödeme Koşulları</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.paymentTerms}</p>
              </div>
            )}
            {proposal.deliveryTerms && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teslimat Koşulları</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.deliveryTerms}</p>
              </div>
            )}
            {proposal.termsConditions && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Genel Şartlar</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.termsConditions}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── EFT / Havale Bank Info ─── */}
        {tenant.bankAccounts && tenant.bankAccounts.length > 0 && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 overflow-hidden mb-4 ${cardClass}`}>
            <button
              onClick={() => setShowBankInfo(!showBankInfo)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">EFT / Havale ile Ödeme</p>
                  <p className="text-xs text-gray-400">{tenant.bankAccounts.length} banka hesabı</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showBankInfo ? 'rotate-180' : ''}`} />
            </button>

            {showBankInfo && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                <div className="pt-3">
                  <p className="text-xs text-gray-500 mb-3">Aşağıdaki hesaplardan birine ödeme yapabilirsiniz. IBAN&apos;ı kopyalamak için tıklayın.</p>
                </div>
                {tenant.bankAccounts.map((bank, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-sm text-gray-900">{bank.bankName}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{bank.currency}</span>
                    </div>
                    {bank.branchName && (
                      <p className="text-xs text-gray-500">Şube: {bank.branchName}</p>
                    )}
                    <p className="text-xs text-gray-500">Hesap Sahibi: <span className="font-medium text-gray-700">{bank.accountHolder || tenant.name}</span></p>
                    <button
                      onClick={() => copyIban(bank.iban)}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                    >
                      <span className="font-mono text-xs sm:text-sm text-gray-900 tracking-normal sm:tracking-wider break-all">{bank.iban}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-blue-600">
                        {copiedIban === bank.iban ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Kopyalandı</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Kopyala</>
                        )}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Response Info (Rejection/Revision/Acceptance) ─── */}
        {isResponded && proposal.status === 'REJECTED' && proposal.rejectionReason && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-red-100 p-5 mb-4 ${cardClass}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Teklif Reddedildi</p>
                <p className="text-xs text-gray-400">Müşteri yanıtı</p>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-sm text-red-800 whitespace-pre-wrap">{proposal.rejectionReason}</p>
            </div>
          </div>
        )}

        {isResponded && proposal.status === 'REVISION_REQUESTED' && proposal.revisionNote && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-amber-100 p-5 mb-4 ${cardClass}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <RotateCw className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Revize Talep Edildi</p>
                <p className="text-xs text-gray-400">Müşteri yanıtı</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{proposal.revisionNote}</p>
            </div>
          </div>
        )}

        {/* ─── Signature & Acceptance Info ─── */}
        {isResponded && proposal.status === 'ACCEPTED' && signature && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-emerald-100 p-5 mb-4 ${cardClass}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Teklif Kabul Edildi</p>
                <p className="text-xs text-gray-400">E-imza ile onaylandı</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Signer Info */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <User className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{signature.signerName}</p>
                  {signature.signedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(signature.signedAt).toLocaleDateString('tr-TR', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Signature Image */}
              <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signature.data}
                  alt="E-İmza"
                  className="max-h-32 w-auto"
                />
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Bu imza güvenli şekilde şifrelenmiş olarak saklanmaktadır</span>
              </div>

              {/* Signed PDF Download */}
              <a
                href={`/api/proposals/signed-pdf?token=${token}`}
                className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-emerald-500/25 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                İmzalı PDF İndir
              </a>
            </div>
          </div>
        )}

        {/* ─── Trust Footer ─── */}
        <div className="flex items-center justify-center gap-6 py-6 text-xs text-gray-400 print:hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>SSL Güvenli</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
            <Eye className="w-3.5 h-3.5" />
            <span>{proposal.viewCount} görüntülenme</span>
          </div>
        </div>
      </div>

      {/* ─── Sticky Bottom Action Bar ─── */}
      {!isResponded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50 print:hidden">
          <div className="max-w-2xl mx-auto px-4 py-3 sm:px-6">
            <ProposalActions proposalId={proposal.id} contacts={contacts} />
          </div>
        </div>
      )}
    </div>
  )
}
