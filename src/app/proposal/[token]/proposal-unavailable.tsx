'use client'

import { useMemo } from 'react'
import { FileX, Clock, XCircle } from 'lucide-react'

interface ProposalUnavailableProps {
  reason: 'deleted' | 'expired' | 'cancelled'
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    deletedTitle: 'Teklif Kald\u0131r\u0131ld\u0131',
    deletedDesc: 'Bu teklif art\u0131k mevcut de\u011fil. G\u00f6nderen firma taraf\u0131ndan kald\u0131r\u0131lm\u0131\u015f olabilir.',
    deletedSuggestion: 'Detayl\u0131 bilgi i\u00e7in teklifi g\u00f6nderen firma ile ileti\u015fime ge\u00e7ebilirsiniz.',
    expiredTitle: 'Teklifin S\u00fcresi Doldu',
    expiredDesc: 'Bu teklifin ge\u00e7erlilik s\u00fcresi sona ermi\u015ftir.',
    expiredSuggestion: 'G\u00fcncel bir teklif almak i\u00e7in firma ile ileti\u015fime ge\u00e7ebilirsiniz.',
    cancelledTitle: 'Teklif \u0130ptal Edildi',
    cancelledDesc: 'Bu teklif iptal edilmi\u015ftir.',
    cancelledSuggestion: 'Detayl\u0131 bilgi i\u00e7in teklifi g\u00f6nderen firma ile ileti\u015fime ge\u00e7ebilirsiniz.',
    footer: 'TeklifPro',
  },
  en: {
    deletedTitle: 'Proposal Removed',
    deletedDesc: 'This proposal is no longer available. It may have been removed by the sending company.',
    deletedSuggestion: 'Please contact the sending company for more information.',
    expiredTitle: 'Proposal Expired',
    expiredDesc: 'The validity period of this proposal has ended.',
    expiredSuggestion: 'Please contact the company for an updated proposal.',
    cancelledTitle: 'Proposal Cancelled',
    cancelledDesc: 'This proposal has been cancelled.',
    cancelledSuggestion: 'Please contact the sending company for more information.',
    footer: 'TeklifPro',
  },
}

function detectLocale(): string {
  if (typeof window === 'undefined') return 'tr'
  const path = window.location.pathname
  if (path.startsWith('/en')) return 'en'
  return 'tr'
}

const ICONS = {
  deleted: FileX,
  expired: Clock,
  cancelled: XCircle,
}

export default function ProposalUnavailable({ reason }: ProposalUnavailableProps) {
  const locale = useMemo(detectLocale, [])
  const t = (key: string) => translations[locale]?.[key] ?? translations.tr[key] ?? key

  const Icon = ICONS[reason]
  const title = t(`${reason}Title`)
  const description = t(`${reason}Desc`)
  const suggestion = t(`${reason}Suggestion`)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Icon className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500 text-sm mb-4">{description}</p>
          <p className="text-gray-400 text-xs">{suggestion}</p>
        </div>
        <p className="text-gray-300 text-xs mt-6">{t('footer')}</p>
      </div>
    </div>
  )
}
