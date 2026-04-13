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
  Truck,
  Wrench,
  CalendarClock,
  Send,
  AlertCircle,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import ProposalActions from './proposal-actions'
import { VoiceNotePlayer } from '@/presentation/components/molecules/VoiceNotePlayer'

interface ProposalContentProps {
  proposal: {
    id: string
    proposalNumber: string
    title: string
    proposalType?: string | null
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
    deliveryDate?: string | null
    installationDate?: string | null
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

const proposalDict = {
  tr: {
    proposalPresentation: 'Teklif Sunumu',
    proposal: 'Teklif',
    validUntil: 'Geçerli:',
    voiceMessageLeft: 'size sesli mesaj bıraktı',
    proposalStatus: 'Teklif Durumu:',
    digitalSignature: 'Dijital İmza',
    signatureAlt: 'İmza',
    customer: 'Müşteri',
    senderCompanyInfo: 'Gönderen Firma Bilgileri',
    taxNumber: 'VKN:',
    productsServices: 'Ürünler / Hizmetler',
    itemCount: 'kalem',
    vat: 'KDV',
    productService: 'Ürün / Hizmet',
    quantity: 'Miktar',
    unitPrice: 'Birim Fiyat',
    discount: 'İndirim',
    total: 'Toplam',
    subtotal: 'Ara Toplam',
    lineDiscounts: 'Satır İndirimleri',
    discountPercent: 'İndirim',
    grandTotal: 'Genel Toplam',
    description: 'Açıklama',
    notes: 'Notlar',
    paymentTerms: 'Ödeme Koşulları',
    deliveryTerms: 'Teslimat Koşulları',
    generalTerms: 'Genel Şartlar',
    bankPayment: 'EFT / Havale ile Ödeme',
    bankAccounts: 'banka hesabı',
    bankPaymentInfo: 'Aşağıdaki hesaplardan birine ödeme yapabilirsiniz. IBAN\u0027ı kopyalamak için tıklayın.',
    branch: 'Şube:',
    accountHolder: 'Hesap Sahibi:',
    copied: 'Kopyalandı',
    copy: 'Kopyala',
    proposalRejected: 'Teklif Reddedildi',
    customerResponse: 'Müşteri yanıtı',
    revisionRequested: 'Revize Talep Edildi',
    proposalAccepted: 'Teklif Kabul Edildi',
    approvedWithEsign: 'E-imza ile onaylandı',
    eSignatureAlt: 'E-İmza',
    signatureSecure: 'Bu imza güvenli şekilde şifrelenmiş olarak saklanmaktadır',
    downloadSignedPdf: 'İmzalı PDF İndir',
    sslSecure: 'SSL Güvenli',
    viewCount: 'görüntülenme',
    draftProposal: 'TASLAK TEKLİF',
    draftProposalNote: 'Bu teklif gayri resmi olup, bilgilendirme amaçlıdır. KDV ve banka bilgileri dahil değildir.',
    deliveryDate: 'Teslim Tarihi',
    installationDate: 'Kurulum Tarihi',
    remainingDays: 'gün kaldı',
    today: 'Bugün',
    passed: 'Geçti',
    dateChangeRequest: 'Tarih Değişikliği Talebi',
    dateChangeDesc: 'Teslim veya kurulum tarihi için değişiklik talep edebilirsiniz.',
    requestType: 'Tarih Türü',
    deliveryDateOption: 'Teslim Tarihi',
    installationDateOption: 'Kurulum Tarihi',
    currentDate: 'Mevcut Tarih',
    newDate: 'Talep Edilen Tarih',
    customerNoteLabel: 'Not (isteğe bağlı)',
    customerNotePlaceholder: 'Neden tarih değişikliği istiyorsunuz?',
    submitRequest: 'Talep Gönder',
    submitting: 'Gönderiliyor...',
    requestSuccess: 'Talebiniz başarıyla gönderildi.',
    requestError: 'Talep gönderilemedi. Lütfen tekrar deneyin.',
    existingRequests: 'Tarih Değişikliği Talepleri',
    statusPending: 'Beklemede',
    statusApproved: 'Onaylandı',
    statusRejected: 'Reddedildi',
    statusCounterOffered: 'Karşı Teklif',
    requestedDateLabel: 'Talep Edilen',
    counterDateLabel: 'Önerilen Tarih',
    adminNote: 'Firma Notu',
    noDateSelected: 'Tarih seçiniz',
  },
  en: {
    proposalPresentation: 'Proposal Presentation',
    proposal: 'Proposal',
    validUntil: 'Valid until:',
    voiceMessageLeft: 'left you a voice message',
    proposalStatus: 'Proposal Status:',
    digitalSignature: 'Digital Signature',
    signatureAlt: 'Signature',
    customer: 'Customer',
    senderCompanyInfo: 'Sender Company Details',
    taxNumber: 'Tax No:',
    productsServices: 'Products / Services',
    itemCount: 'items',
    vat: 'VAT',
    productService: 'Product / Service',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    total: 'Total',
    subtotal: 'Subtotal',
    lineDiscounts: 'Line Discounts',
    discountPercent: 'Discount',
    grandTotal: 'Grand Total',
    description: 'Description',
    notes: 'Notes',
    paymentTerms: 'Payment Terms',
    deliveryTerms: 'Delivery Terms',
    generalTerms: 'General Terms',
    bankPayment: 'EFT / Wire Transfer Payment',
    bankAccounts: 'bank accounts',
    bankPaymentInfo: 'You can make a payment to one of the accounts below. Click on IBAN to copy.',
    branch: 'Branch:',
    accountHolder: 'Account Holder:',
    copied: 'Copied',
    copy: 'Copy',
    proposalRejected: 'Proposal Rejected',
    customerResponse: 'Customer response',
    revisionRequested: 'Revision Requested',
    proposalAccepted: 'Proposal Accepted',
    approvedWithEsign: 'Approved with e-signature',
    eSignatureAlt: 'E-Signature',
    signatureSecure: 'This signature is securely encrypted and stored',
    downloadSignedPdf: 'Download Signed PDF',
    sslSecure: 'SSL Secure',
    viewCount: 'views',
    draftProposal: 'DRAFT PROPOSAL',
    draftProposalNote: 'This is an unofficial proposal for informational purposes only. VAT and bank details are not included.',
    deliveryDate: 'Delivery Date',
    installationDate: 'Installation Date',
    remainingDays: 'days left',
    today: 'Today',
    passed: 'Passed',
    dateChangeRequest: 'Date Change Request',
    dateChangeDesc: 'You can request a change for delivery or installation date.',
    requestType: 'Date Type',
    deliveryDateOption: 'Delivery Date',
    installationDateOption: 'Installation Date',
    currentDate: 'Current Date',
    newDate: 'Requested Date',
    customerNoteLabel: 'Note (optional)',
    customerNotePlaceholder: 'Why do you need a date change?',
    submitRequest: 'Submit Request',
    submitting: 'Submitting...',
    requestSuccess: 'Your request has been submitted successfully.',
    requestError: 'Failed to submit request. Please try again.',
    existingRequests: 'Date Change Requests',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusCounterOffered: 'Counter Offered',
    requestedDateLabel: 'Requested',
    counterDateLabel: 'Proposed Date',
    adminNote: 'Company Note',
    noDateSelected: 'Select a date',
  },
} as const

const statusDisplayDict = {
  tr: {
    ACCEPTED: { label: 'Kabul Edildi', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    REJECTED: { label: 'Reddedildi', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
    REVISION_REQUESTED: { label: 'Revize Talep Edildi', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: RotateCw },
  },
  en: {
    ACCEPTED: { label: 'Accepted', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
    REVISION_REQUESTED: { label: 'Revision Requested', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: RotateCw },
  },
} as const

type ProposalLocale = 'tr' | 'en'

function getProposalLocale(): ProposalLocale {
  if (typeof window !== 'undefined') {
    return navigator.language.startsWith('tr') ? 'tr' : 'en'
  }
  return 'tr'
}

function getLocaleString(locale: ProposalLocale): string {
  return locale === 'tr' ? 'tr-TR' : 'en-US'
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
  const [showDateChangeForm, setShowDateChangeForm] = useState(false)
  const [dateRequestType, setDateRequestType] = useState<'DELIVERY' | 'INSTALLATION'>(
    proposal.deliveryDate ? 'DELIVERY' : 'INSTALLATION'
  )
  const [requestedDate, setRequestedDate] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [dateSubmitting, setDateSubmitting] = useState(false)
  const [dateSubmitResult, setDateSubmitResult] = useState<'success' | 'error' | null>(null)
  const [existingDateRequests, setExistingDateRequests] = useState<Array<{
    id: string
    requestType: string
    currentDate: string
    requestedDate: string
    customerNote: string | null
    status: string
    adminNote: string | null
    counterDate: string | null
    createdAt: string
  }>>([])
  const [disabledDates, setDisabledDates] = useState<string[]>([])
  const [minCalendarDate, setMinCalendarDate] = useState('')
  const proposalLocale = getProposalLocale()
  const localeStr = getLocaleString(proposalLocale)
  const statusDisplay = statusDisplayDict[proposalLocale]
  const t = proposalDict[proposalLocale]

  const copyIban = (iban: string) => {
    navigator.clipboard.writeText(iban)
    setCopiedIban(iban)
    setTimeout(() => setCopiedIban(null), 2000)
  }

  const fmt = (amount: number) =>
    amount.toLocaleString(localeStr, { style: 'currency', currency: proposal.currency })

  const currentStatus = statusDisplay[proposal.status as keyof typeof statusDisplay]
  const isUnofficial = proposal.proposalType === 'UNOFFICIAL'

  const cardClass = "animate-fade-in-up"
  const cardShadow = "shadow-sm hover:shadow-md transition-shadow"

  const hasDateChangeFeature =
    (proposal.deliveryDate || proposal.installationDate) &&
    ['ACCEPTED', 'SENT', 'VIEWED'].includes(proposal.status)

  const fetchDateRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals/date-change?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setExistingDateRequests(data.requests ?? data ?? [])
      }
    } catch {
      // silently fail
    }
  }, [token])

  const fetchDisabledDates = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals/calendar?token=${token}`)
      if (res.ok) {
        const data = await res.json()
        setDisabledDates(data.disabledDates ?? [])
      }
    } catch {
      // silently fail
    }
  }, [token])

  useEffect(() => {
    if (hasDateChangeFeature) {
      fetchDateRequests()
      fetchDisabledDates()
      // Set min date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setMinCalendarDate(tomorrow.toISOString().split('T')[0])
    }
  }, [hasDateChangeFeature, fetchDateRequests, fetchDisabledDates])

  const handleDateChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requestedDate || dateSubmitting) return
    setDateSubmitting(true)
    setDateSubmitResult(null)
    try {
      const res = await fetch('/api/proposals/date-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          requestType: dateRequestType,
          requestedDate,
          customerNote: customerNote.trim() || null,
        }),
      })
      if (res.ok) {
        setDateSubmitResult('success')
        setRequestedDate('')
        setCustomerNote('')
        fetchDateRequests()
      } else {
        setDateSubmitResult('error')
      }
    } catch {
      setDateSubmitResult('error')
    } finally {
      setDateSubmitting(false)
    }
  }

  const getCurrentDateForType = (type: 'DELIVERY' | 'INSTALLATION') => {
    const dateStr = type === 'DELIVERY' ? proposal.deliveryDate : proposal.installationDate
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString(localeStr, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const dateChangeStatusStyles: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: t.statusPending },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: t.statusApproved },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: t.statusRejected },
    COUNTER_OFFERED: { bg: 'bg-blue-100', text: 'text-blue-700', label: t.statusCounterOffered },
  }

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

      {/* ─── UNOFFICIAL Watermark Banner ─── */}
      {isUnofficial && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white py-3 px-4 text-center">
          <p className="text-sm sm:text-base font-extrabold uppercase tracking-widest">{t.draftProposal}</p>
          <p className="text-xs opacity-90 mt-0.5">{t.draftProposalNote}</p>
        </div>
      )}

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
              <p className="text-blue-200 text-xs">{t.proposalPresentation}</p>
            </div>
          </div>

          {/* Proposal title & number */}
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 leading-tight">
            {proposal.title || t.proposal}
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
                {t.validUntil} {proposal.expiresDate}
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
                ? `${voiceNote.senderName} ${t.voiceMessageLeft}`
                : `${tenant.name} ${t.voiceMessageLeft}`
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
                {t.proposalStatus} {currentStatus.label}
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
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t.digitalSignature}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature.data} alt={t.signatureAlt} className="max-h-24 mx-auto" />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              {signature.signerName && <span className="font-medium">{signature.signerName}</span>}
              {signature.signedAt && (
                <span>{new Date(signature.signedAt).toLocaleString(localeStr)}</span>
              )}
            </div>
          </div>
        )}

        {/* ─── Customer Card ─── */}
        <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 ${cardClass}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.customer}</p>
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
            <span className="text-sm font-medium text-gray-600">{t.senderCompanyInfo}</span>
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
            {tenant.taxNumber && <div className="flex items-center gap-2 pt-2 border-t border-gray-100"><Building2 className="w-3.5 h-3.5 text-gray-400" />{t.taxNumber} {tenant.taxNumber}</div>}
          </div>
        )}

        {/* ─── Delivery & Installation Dates ─── */}
        {(proposal.deliveryDate || proposal.installationDate) && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 p-5 mb-4 ${cardClass}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {proposal.deliveryDate && (() => {
                const deliveryDateObj = new Date(proposal.deliveryDate)
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const diffMs = deliveryDateObj.getTime() - now.getTime()
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                const formattedDate = deliveryDateObj.toLocaleDateString(localeStr, { day: '2-digit', month: 'long', year: 'numeric' })
                const badgeColor = diffDays <= 0 ? 'bg-red-100 text-red-700' : diffDays <= 1 ? 'bg-red-100 text-red-700' : diffDays <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                const badgeText = diffDays < 0 ? t.passed : diffDays === 0 ? t.today : `${diffDays} ${t.remainingDays}`
                return (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.deliveryDate}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formattedDate}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                )
              })()}
              {proposal.installationDate && (() => {
                const installDateObj = new Date(proposal.installationDate)
                const now = new Date()
                now.setHours(0, 0, 0, 0)
                const diffMs = installDateObj.getTime() - now.getTime()
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                const formattedDate = installDateObj.toLocaleDateString(localeStr, { day: '2-digit', month: 'long', year: 'numeric' })
                const badgeColor = diffDays <= 0 ? 'bg-red-100 text-red-700' : diffDays <= 1 ? 'bg-red-100 text-red-700' : diffDays <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                const badgeText = diffDays < 0 ? t.passed : diffDays === 0 ? t.today : `${diffDays} ${t.remainingDays}`
                return (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.installationDate}</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formattedDate}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ─── Items ─── */}
        <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 overflow-hidden mb-4 ${cardClass}`}>
          <div className="px-3 sm:px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-indigo-500" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t.productsServices}
              </p>
            </div>
            <p className="text-xs text-gray-400 ml-3">{items.length} {t.itemCount}</p>
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
                  <span className="text-gray-400">{t.vat} {item.vatRate}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">{t.productService}</th>
                  <th className="px-3 py-3 text-center font-semibold w-20">{t.quantity}</th>
                  <th className="px-3 py-3 text-right font-semibold w-24">{t.unitPrice}</th>
                  <th className="px-3 py-3 text-center font-semibold w-16">{t.discount}</th>
                  <th className="px-3 py-3 text-center font-semibold w-14">{t.vat}</th>
                  <th className="px-5 py-3 text-right font-semibold w-28">{t.total}</th>
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
              <span>{t.subtotal}</span>
              <span className="font-medium">{fmt(financials.subtotal)}</span>
            </div>
            {financials.totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>{t.lineDiscounts}</span>
                <span className="font-medium">-{fmt(financials.totalDiscount)}</span>
              </div>
            )}
            {financials.proposalLevelDiscount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>
                  {proposal.discountType === 'PERCENTAGE'
                    ? `${t.discountPercent} (${proposal.discountValue}%)`
                    : t.discountPercent}
                </span>
                <span className="font-medium">-{fmt(financials.proposalLevelDiscount)}</span>
              </div>
            )}
            {!isUnofficial && (
              <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                <span>{t.vat}</span>
                <span className="font-medium">{fmt(financials.totalVat)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="mt-4 p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl text-white flex items-center justify-between animate-pulse-glow">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">{t.grandTotal}</p>
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
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.description}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.description}</p>
              </div>
            )}
            {proposal.notes && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-amber-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.notes}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.notes}</p>
              </div>
            )}
            {proposal.paymentTerms && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-emerald-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.paymentTerms}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.paymentTerms}</p>
              </div>
            )}
            {proposal.deliveryTerms && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-violet-500" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.deliveryTerms}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.deliveryTerms}</p>
              </div>
            )}
            {proposal.termsConditions && (
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1 h-4 rounded-full bg-gray-400" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.generalTerms}</p>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ml-3">{proposal.termsConditions}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── EFT / Havale Bank Info ─── */}
        {!isUnofficial && tenant.bankAccounts && tenant.bankAccounts.length > 0 && (
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
                  <p className="font-bold text-sm text-gray-900">{t.bankPayment}</p>
                  <p className="text-xs text-gray-400">{tenant.bankAccounts.length} {t.bankAccounts}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showBankInfo ? 'rotate-180' : ''}`} />
            </button>

            {showBankInfo && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                <div className="pt-3">
                  <p className="text-xs text-gray-500 mb-3">{t.bankPaymentInfo}</p>
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
                      <p className="text-xs text-gray-500">{t.branch} {bank.branchName}</p>
                    )}
                    <p className="text-xs text-gray-500">{t.accountHolder} <span className="font-medium text-gray-700">{bank.accountHolder || tenant.name}</span></p>
                    <button
                      onClick={() => copyIban(bank.iban)}
                      className="w-full flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                    >
                      <span className="font-mono text-xs sm:text-sm text-gray-900 tracking-normal sm:tracking-wider break-all">{bank.iban}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-blue-600">
                        {copiedIban === bank.iban ? (
                          <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> {t.copied}</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> {t.copy}</>
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
                <p className="font-bold text-sm text-gray-900">{t.proposalRejected}</p>
                <p className="text-xs text-gray-400">{t.customerResponse}</p>
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
                <p className="font-bold text-sm text-gray-900">{t.revisionRequested}</p>
                <p className="text-xs text-gray-400">{t.customerResponse}</p>
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
                <p className="font-bold text-sm text-gray-900">{t.proposalAccepted}</p>
                <p className="text-xs text-gray-400">{t.approvedWithEsign}</p>
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
                      {new Date(signature.signedAt).toLocaleDateString(localeStr, {
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
                  alt={t.eSignatureAlt}
                  className="max-h-32 w-auto"
                />
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.signatureSecure}</span>
              </div>

              {/* Signed PDF Download */}
              <a
                href={`/api/proposals/signed-pdf?token=${token}`}
                className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-emerald-500/25 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                {t.downloadSignedPdf}
              </a>
            </div>
          </div>
        )}

        {/* ─── Date Change Request ─── */}
        {hasDateChangeFeature && (
          <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 overflow-hidden mb-4 ${cardClass}`}>
            <button
              onClick={() => setShowDateChangeForm(!showDateChangeForm)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900">{t.dateChangeRequest}</p>
                  <p className="text-xs text-gray-400">{t.dateChangeDesc}</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showDateChangeForm ? 'rotate-180' : ''}`} />
            </button>

            {showDateChangeForm && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <form onSubmit={handleDateChangeSubmit} className="pt-4 space-y-4">
                  {/* Request type toggle */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                      {t.requestType}
                    </label>
                    <div className="flex gap-2">
                      {proposal.deliveryDate && (
                        <button
                          type="button"
                          onClick={() => setDateRequestType('DELIVERY')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                            dateRequestType === 'DELIVERY'
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                          {t.deliveryDateOption}
                        </button>
                      )}
                      {proposal.installationDate && (
                        <button
                          type="button"
                          onClick={() => setDateRequestType('INSTALLATION')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium border transition-colors ${
                            dateRequestType === 'INSTALLATION'
                              ? 'bg-violet-50 border-violet-300 text-violet-700'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          <Wrench className="w-4 h-4" />
                          {t.installationDateOption}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current date display */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-0.5">{t.currentDate}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getCurrentDateForType(dateRequestType)}
                    </p>
                  </div>

                  {/* New date picker */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                      {t.newDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={requestedDate}
                      onChange={(e) => {
                        const val = e.target.value
                        if (disabledDates.includes(val)) return
                        setRequestedDate(val)
                      }}
                      min={minCalendarDate}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Customer note */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                      {t.customerNoteLabel}
                    </label>
                    <textarea
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      placeholder={t.customerNotePlaceholder}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit result messages */}
                  {dateSubmitResult === 'success' && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-sm text-emerald-700">{t.requestSuccess}</p>
                    </div>
                  )}
                  {dateSubmitResult === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-sm text-red-700">{t.requestError}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={dateSubmitting || !requestedDate}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-amber-500/25 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {dateSubmitting ? t.submitting : t.submitRequest}
                  </button>
                </form>

                {/* Existing requests */}
                {existingDateRequests.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {t.existingRequests}
                    </p>
                    <div className="space-y-3">
                      {existingDateRequests.map((req) => {
                        const style = dateChangeStatusStyles[req.status] ?? {
                          bg: 'bg-gray-100',
                          text: 'text-gray-700',
                          label: req.status,
                        }
                        const reqTypeLabel =
                          req.requestType === 'DELIVERY'
                            ? t.deliveryDateOption
                            : t.installationDateOption
                        const reqIcon =
                          req.requestType === 'DELIVERY' ? Truck : Wrench
                        const ReqIcon = reqIcon
                        return (
                          <div
                            key={req.id}
                            className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ReqIcon className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-900">
                                  {reqTypeLabel}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
                              >
                                {style.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>
                                {t.requestedDateLabel}:{' '}
                                <span className="font-medium text-gray-700">
                                  {new Date(req.requestedDate).toLocaleDateString(localeStr, {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </span>
                              </span>
                            </div>
                            {req.customerNote && (
                              <p className="text-xs text-gray-600 italic">
                                &ldquo;{req.customerNote}&rdquo;
                              </p>
                            )}
                            {req.status === 'COUNTER_OFFERED' && req.counterDate && (
                              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-700">
                                  <span className="font-semibold">{t.counterDateLabel}:</span>{' '}
                                  {new Date(req.counterDate).toLocaleDateString(localeStr, {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            )}
                            {req.adminNote && (
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <p className="text-xs text-gray-600">
                                  <span className="font-semibold">{t.adminNote}:</span>{' '}
                                  {req.adminNote}
                                </p>
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400">
                              {new Date(req.createdAt).toLocaleDateString(localeStr, {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Trust Footer ─── */}
        <div className="flex items-center justify-center gap-6 py-6 text-xs text-gray-400 print:hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.sslSecure}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
            <Eye className="w-3.5 h-3.5" />
            <span>{proposal.viewCount} {t.viewCount}</span>
          </div>
        </div>
      </div>

      {/* ─── Sticky Bottom Action Bar ─── */}
      {!isResponded && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50 print:hidden">
          <div className="max-w-2xl mx-auto px-4 py-3 sm:px-6">
            <ProposalActions proposalId={proposal.id} contacts={contacts} token={token} />
          </div>
        </div>
      )}
    </div>
  )
}
