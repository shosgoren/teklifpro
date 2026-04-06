import { FileX, Clock, XCircle } from 'lucide-react'

interface ProposalUnavailableProps {
  reason: 'deleted' | 'expired' | 'cancelled'
}

const MESSAGES = {
  deleted: {
    icon: FileX,
    title: 'Teklif Kaldırıldı',
    description: 'Bu teklif artık mevcut değil. Gönderen firma tarafından kaldırılmış olabilir.',
    suggestion: 'Detaylı bilgi için teklifi gönderen firma ile iletişime geçebilirsiniz.',
  },
  expired: {
    icon: Clock,
    title: 'Teklifin Süresi Doldu',
    description: 'Bu teklifin geçerlilik süresi sona ermiştir.',
    suggestion: 'Güncel bir teklif almak için firma ile iletişime geçebilirsiniz.',
  },
  cancelled: {
    icon: XCircle,
    title: 'Teklif İptal Edildi',
    description: 'Bu teklif iptal edilmiştir.',
    suggestion: 'Detaylı bilgi için teklifi gönderen firma ile iletişime geçebilirsiniz.',
  },
}

export default function ProposalUnavailable({ reason }: ProposalUnavailableProps) {
  const { icon: Icon, title, description, suggestion } = MESSAGES[reason]

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
        <p className="text-gray-300 text-xs mt-6">TeklifPro</p>
      </div>
    </div>
  )
}
