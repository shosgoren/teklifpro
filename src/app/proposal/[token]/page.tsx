import { notFound } from 'next/navigation'
import { prisma } from '@/shared/utils/prisma'
import ProposalActions from './proposal-actions'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  FileText,
  Calendar,
  User,
  MapPin,
  Phone,
  Mail,
  Building2,
} from 'lucide-react'

/**
 * PUBLIC PROPOSAL VIEWING PAGE
 * Accessible via unique public token (from WhatsApp link)
 * No authentication required
 */

interface ProposalPageProps {
  params: {
    token: string
  }
}

export async function generateMetadata({ params }: ProposalPageProps) {
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: params.token },
    include: {
      customer: true,
      tenant: true,
    },
  })

  if (!proposal) {
    return {
      title: 'Teklif Bulunamadı',
    }
  }

  return {
    title: `${proposal.proposalNumber} - ${proposal.title}`,
    description: `${proposal.customer.name} için teklif belgesi`,
  }
}

export default async function ProposalPage({ params }: ProposalPageProps) {
  // Fetch proposal with all relations
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: params.token },
    include: {
      tenant: true,
      customer: true,
      contact: true,
      user: true,
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!proposal) {
    notFound()
  }

  // Track view - increment view count and log activity
  const updatedProposal = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      viewCount: { increment: 1 },
      viewedAt: new Date(),
      status: proposal.status === 'SENT' ? 'VIEWED' : proposal.status,
    },
    include: {
      tenant: true,
      customer: true,
      contact: true,
      user: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  // Log view activity
  await prisma.proposalActivity.create({
    data: {
      proposalId: proposal.id,
      type: 'VIEWED',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    },
  })

  // Calculate line totals for items
  const itemsWithTotals = updatedProposal.items.map((item) => {
    const subtotal = Number(item.quantity) * Number(item.unitPrice)
    const discountAmount = (subtotal * Number(item.discountRate)) / 100
    const subtotalAfterDiscount = subtotal - discountAmount
    const vat = (subtotalAfterDiscount * Number(item.vatRate)) / 100
    const lineTotal = subtotalAfterDiscount + vat

    return {
      ...item,
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      vat,
      lineTotal,
    }
  })

  // Calculate totals
  const subtotal = itemsWithTotals.reduce(
    (sum, item) => sum + item.subtotal,
    0
  )
  const totalDiscount = itemsWithTotals.reduce(
    (sum, item) => sum + item.discountAmount,
    0
  )
  const subtotalAfterDiscount = subtotal - totalDiscount

  // Apply proposal-level discount if applicable
  let proposalLevelDiscount = 0
  if (updatedProposal.discountType === 'PERCENTAGE') {
    proposalLevelDiscount =
      (subtotalAfterDiscount * Number(updatedProposal.discountValue)) / 100
  } else if (updatedProposal.discountType === 'FIXED') {
    proposalLevelDiscount = Number(updatedProposal.discountValue) || 0
  }

  const finalSubtotal = subtotalAfterDiscount - proposalLevelDiscount
  const totalVat = itemsWithTotals.reduce(
    (sum, item) => sum + item.vat,
    0
  )
  const grandTotal = finalSubtotal + totalVat

  // Determine if proposal is already responded
  const isResponded =
    updatedProposal.status === 'ACCEPTED' ||
    updatedProposal.status === 'REJECTED' ||
    updatedProposal.status === 'REVISION_REQUESTED'

  const statusDisplay = {
    ACCEPTED: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800' },
    REVISION_REQUESTED: {
      label: 'Revize Talep Edildi',
      color: 'bg-yellow-100 text-yellow-800',
    },
  }

  const currentStatus =
    statusDisplay[updatedProposal.status as keyof typeof statusDisplay]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Status Banner - Show if already responded */}
        {isResponded && currentStatus && (
          <div
            className={`mb-6 p-4 rounded-lg ${currentStatus.color} border-2 border-current`}
          >
            <p className="font-semibold text-sm sm:text-base">
              Teklif Durumu: {currentStatus.label}
            </p>
            {updatedProposal.status === 'REJECTED' &&
              updatedProposal.rejectionReason && (
                <p className="text-sm mt-2">
                  Sebep: {updatedProposal.rejectionReason}
                </p>
              )}
            {updatedProposal.status === 'REVISION_REQUESTED' &&
              updatedProposal.revisionNote && (
                <p className="text-sm mt-2">Not: {updatedProposal.revisionNote}</p>
              )}
          </div>
        )}

        {/* Main Proposal Document */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Header Section */}
          <div className="border-b-2 border-gray-200 p-8 print:p-12">
            <div className="flex justify-between items-start gap-8">
              {/* Left: Company Logo & Info */}
              <div className="flex-1">
                {updatedProposal.tenant.logo && (
                  <img
                    src={updatedProposal.tenant.logo}
                    alt={updatedProposal.tenant.name}
                    className="h-16 object-contain mb-4"
                  />
                )}
                <div className="not-printed">
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {updatedProposal.tenant.name}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Teklif Sunumu
                  </p>
                </div>
              </div>

              {/* Right: Proposal Details */}
              <div className="text-right text-sm">
                <div className="mb-4">
                  <p className="text-gray-500 text-xs uppercase font-semibold">
                    Teklif No
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {updatedProposal.proposalNumber}
                  </p>
                </div>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-center justify-end gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {format(new Date(updatedProposal.createdAt), 'dd MMMM yyyy', {
                        locale: tr,
                      })}
                    </span>
                  </div>
                  {updatedProposal.expiresAt && (
                    <div className="flex items-center justify-end gap-2 text-orange-600 font-semibold">
                      <FileText className="w-4 h-4" />
                      <span>
                        Geçerli:{' '}
                        {format(new Date(updatedProposal.expiresAt), 'dd MMMM yyyy', {
                          locale: tr,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* From/To Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b-2 border-gray-200 print:p-12">
            {/* From */}
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">
                Gönderen Firma
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">
                  {updatedProposal.tenant.name}
                </div>
                {updatedProposal.user && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{updatedProposal.user.name}</span>
                  </div>
                )}
                {updatedProposal.tenant.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{updatedProposal.tenant.address}</span>
                  </div>
                )}
                {updatedProposal.tenant.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{updatedProposal.tenant.phone}</span>
                  </div>
                )}
                {updatedProposal.tenant.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a
                      href={`mailto:${updatedProposal.tenant.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {updatedProposal.tenant.email}
                    </a>
                  </div>
                )}
                {updatedProposal.tenant.taxNumber && (
                  <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>VKN: {updatedProposal.tenant.taxNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* To */}
            <div>
              <h3 className="text-sm font-bold uppercase text-gray-500 mb-4">
                Müşteri
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="font-semibold text-gray-900">
                  {updatedProposal.customer.name}
                </div>
                {updatedProposal.contact && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>{updatedProposal.contact.name}</div>
                      {updatedProposal.contact.title && (
                        <div className="text-xs text-gray-500">
                          {updatedProposal.contact.title}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {updatedProposal.customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{updatedProposal.customer.address}</span>
                  </div>
                )}
                {updatedProposal.customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a
                      href={`tel:${updatedProposal.customer.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {updatedProposal.customer.phone}
                    </a>
                  </div>
                )}
                {updatedProposal.customer.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a
                      href={`mailto:${updatedProposal.customer.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {updatedProposal.customer.email}
                    </a>
                  </div>
                )}
                {updatedProposal.customer.taxNumber && (
                  <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>VKN: {updatedProposal.customer.taxNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto p-8 print:p-12">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                {/* Table Header */}
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      Ürün / Hizmet
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      Miktar
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-24">
                      Birim
                    </th>
                    <th className="px-4 py-3 text-right font-semibold w-24">
                      Birim Fiyat
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-20">
                      İndirim
                    </th>
                    <th className="px-4 py-3 text-center font-semibold w-16">
                      KDV
                    </th>
                    <th className="px-4 py-3 text-right font-semibold w-24">
                      Toplam
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {itemsWithTotals.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`border-t border-gray-200 ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center font-medium">
                        {Number(item.quantity).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600">
                        {item.unit}
                      </td>
                      <td className="px-4 py-4 text-right font-medium">
                        {Number(item.unitPrice).toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: updatedProposal.currency,
                        })}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {Number(item.discountRate) > 0 ? (
                          <span className="text-orange-600 font-semibold">
                            {Number(item.discountRate).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center font-medium">
                        {Number(item.vatRate).toFixed(0)}%
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {item.lineTotal.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: updatedProposal.currency,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-t-2 border-gray-200 print:p-12">
            {/* Left: Notes & Terms */}
            <div className="space-y-6">
              {updatedProposal.description && (
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
                    Açıklama
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {updatedProposal.description}
                  </p>
                </div>
              )}

              {updatedProposal.notes && (
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
                    Notlar
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {updatedProposal.notes}
                  </p>
                </div>
              )}

              {updatedProposal.paymentTerms && (
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
                    Ödeme Koşulları
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {updatedProposal.paymentTerms}
                  </p>
                </div>
              )}

              {updatedProposal.deliveryTerms && (
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
                    Teslimat Koşulları
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {updatedProposal.deliveryTerms}
                  </p>
                </div>
              )}

              {updatedProposal.termsConditions && (
                <div>
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
                    Genel Şartlar
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {updatedProposal.termsConditions}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Financial Summary */}
            <div className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-gray-600">Ara Toplam</span>
                <span className="font-semibold text-gray-900">
                  {subtotal.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: updatedProposal.currency,
                  })}
                </span>
              </div>

              {/* Item-level Discounts */}
              {totalDiscount > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span>Satır İndirimleri</span>
                  <span className="font-semibold">
                    -{totalDiscount.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: updatedProposal.currency,
                    })}
                  </span>
                </div>
              )}

              {/* Proposal-level Discount */}
              {proposalLevelDiscount > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <span>
                    {updatedProposal.discountType === 'PERCENTAGE'
                      ? `İndirim (${updatedProposal.discountValue}%)`
                      : 'İndirim'}
                  </span>
                  <span className="font-semibold">
                    -{proposalLevelDiscount.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: updatedProposal.currency,
                    })}
                  </span>
                </div>
              )}

              {/* VAT */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-gray-600">KDV</span>
                <span className="font-semibold text-gray-900">
                  {totalVat.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: updatedProposal.currency,
                  })}
                </span>
              </div>

              {/* Grand Total - Highlighted */}
              <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-lg">
                <span>GENEL TOPLAM</span>
                <span>
                  {grandTotal.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: updatedProposal.currency,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons or Status Display */}
          <div className="border-t-2 border-gray-200 p-8 bg-gray-50 print:hidden">
            {!isResponded ? (
              <ProposalActions proposalId={updatedProposal.id} />
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">
                  Bu teklife zaten yanıt verilmiştir.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* View Count Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 print:hidden">
          <p>
            Bu teklif {updatedProposal.viewCount} kez görüntülenmiştir.
          </p>
        </div>
      </div>

    </div>
  )
}
