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
  isResponded: boolean
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
  items,
  financials,
  isResponded,
}: ProposalContentProps) {
  const [showDetails, setShowDetails] = useState(false)

  const fmt = (amount: number) =>
    amount.toLocaleString('tr-TR', { style: 'currency', currency: proposal.currency })

  const currentStatus = statusDisplay[proposal.status]

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 sm:px-6">
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
              <p className="font-bold text-lg">{tenant.name}</p>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {proposal.createdDate}
            </div>
            {proposal.expiresDate && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/30 text-sm">
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
          <div className="mb-4">
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
          <div className={`mb-4 p-4 rounded-2xl border ${currentStatus.bg} flex items-start gap-3`}>
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

        {/* ─── Customer Card ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Müşteri</p>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
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
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-3 mb-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Gönderen Firma Bilgileri</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        {showDetails && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3 space-y-2 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">{tenant.name}</p>
            {userName && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" />{userName}</div>}
            {tenant.address && <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />{tenant.address}</div>}
            {tenant.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{tenant.phone}</div>}
            {tenant.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /><a href={`mailto:${tenant.email}`} className="text-blue-600">{tenant.email}</a></div>}
            {tenant.taxNumber && <div className="flex items-center gap-2 pt-2 border-t border-gray-100"><Building2 className="w-3.5 h-3.5 text-gray-400" />VKN: {tenant.taxNumber}</div>}
          </div>
        )}

        {/* ─── Items ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ürünler / Hizmetler
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{items.length} kalem</p>
          </div>

          {/* Mobile: Card view */}
          <div className="divide-y divide-gray-100 sm:hidden">
            {items.map((item, index) => (
              <div key={item.id} className="px-5 py-4">
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
                  <p className="font-bold text-gray-900 text-sm shrink-0">{fmt(item.lineTotal)}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-gray-500">
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
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
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
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Financial Summary ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3">
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
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-medium">Genel Toplam</p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">{fmt(financials.grandTotal)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ─── Notes & Terms ─── */}
        {(proposal.description || proposal.notes || proposal.paymentTerms || proposal.deliveryTerms || proposal.termsConditions) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3 space-y-4">
            {proposal.description && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Açıklama</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.description}</p>
              </div>
            )}
            {proposal.notes && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notlar</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.notes}</p>
              </div>
            )}
            {proposal.paymentTerms && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Ödeme Koşulları</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.paymentTerms}</p>
              </div>
            )}
            {proposal.deliveryTerms && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Teslimat Koşulları</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.deliveryTerms}</p>
              </div>
            )}
            {proposal.termsConditions && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Genel Şartlar</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{proposal.termsConditions}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Trust Footer ─── */}
        <div className="flex items-center justify-center gap-4 py-4 text-xs text-gray-400 print:hidden">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Güvenli bağlantı
          </div>
          <span>·</span>
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {proposal.viewCount} görüntülenme
          </div>
        </div>
      </div>

      {/* ─── Sticky Bottom Action Bar ─── */}
      {!isResponded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50 print:hidden">
          <div className="max-w-2xl mx-auto px-4 py-3 sm:px-6">
            <ProposalActions proposalId={proposal.id} />
          </div>
        </div>
      )}
    </div>
  )
}
