'use client';

import { useState, useCallback, useEffect } from 'react';
import { Logger } from '@/infrastructure/logger';
import { useConfirm } from '@/shared/components/confirm-dialog';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  MessageCircle,
  Phone,
  Calendar,
  Mail,
  CheckCircle2,
  Star,
  Loader2,
  Plus,
  Pin,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useTranslations } from 'next-intl';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useToast } from '@/shared/components/ui/use-toast';

const logger = new Logger('CustomerTimeline');

// i18n - Çeviriler için placeholder fonksiyonu
const t = (key: string, defaultValue?: string) => {
  const translations: Record<string, string> = {
    'timeline.title': 'Müşteri Aktivite Zaman Çizelgesi',
    'timeline.emptyState': 'Henüz aktivite yok',
    'timeline.addNote': 'Not Ekle',
    'timeline.filters': 'Filtreler',
    'timeline.loadMore': 'Daha Fazla Yükle',
    'timeline.loading': 'Yükleniyor...',
    'timeline.noteType': 'Not Türü',
    'timeline.pinNote': 'Not\'u sabitle',
    'timeline.unpinNote': 'Not\'u kaldır',
    'timeline.delete': 'Sil',
    'timeline.edit': 'Düzenle',
    'timeline.cancel': 'İptal',
    'timeline.save': 'Kaydet',
    'timeline.error': 'Bir hata oluştu',
    'timeline.success': 'Başarıyla kaydedildi',
  };
  return translations[key] || defaultValue || key;
};

// Tip tanımlamaları
type NoteType = 'note' | 'call' | 'meeting' | 'email' | 'task';
type TimelineEventType = 'note' | 'call' | 'meeting' | 'email' | 'task' | 'proposal' | 'status';
type FilterType = 'all' | NoteType | 'proposal' | 'status';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  content: string;
  timestamp: string;
  user: string;
  isPinned?: boolean;
  attachmentsCount?: number;
  metadata?: Record<string, any>;
}

interface CustomerTimelineProps {
  customerId: string;
  className?: string;
  onNoteCreate?: (note: TimelineEvent) => void;
}

// İkon mapping - Not türlerine göre
const getIconByType = (type: TimelineEventType) => {
  const iconProps = {
    className: 'w-5 h-5',
  };

  switch (type) {
    case 'call':
      return <Phone {...iconProps} className="w-5 h-5 text-blue-500" />;
    case 'meeting':
      return <Calendar {...iconProps} className="w-5 h-5 text-purple-500" />;
    case 'email':
      return <Mail {...iconProps} className="w-5 h-5 text-green-500" />;
    case 'task':
      return <CheckCircle2 {...iconProps} className="w-5 h-5 text-orange-500" />;
    case 'proposal':
      return <FileText {...iconProps} className="w-5 h-5 text-indigo-500" />;
    case 'status':
      return <TrendingUp {...iconProps} className="w-5 h-5 text-red-500" />;
    case 'note':
    default:
      return <MessageCircle {...iconProps} className="w-5 h-5 text-gray-500" />;
  }
};

// Badge renkleri - Not türlerine göre
const getBadgeVariant = (type: TimelineEventType) => {
  switch (type) {
    case 'call':
      return 'bg-blue-100 text-blue-800';
    case 'meeting':
      return 'bg-purple-100 text-purple-800';
    case 'email':
      return 'bg-green-100 text-green-800';
    case 'task':
      return 'bg-orange-100 text-orange-800';
    case 'proposal':
      return 'bg-indigo-100 text-indigo-800';
    case 'status':
      return 'bg-red-100 text-red-800';
    case 'note':
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Yazı stil tanımlaması
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const TrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

/**
 * CustomerTimeline Bileşeni
 * Müşteri aktivite zaman çizelgesini gösterir: notlar, teklifler, durum değişiklikleri vb.
 * Sabitlenmiş notlar üst kısımda sarı highlight ile gösterilir
 * Infinite scroll / Daha Fazla Yükle düğmesi ile pagination
 */
export function CustomerTimeline({
  customerId,
  className,
  onNoteCreate,
}: CustomerTimelineProps) {
  const confirm = useConfirm();
  const tl = useTranslations('timeline');
  // Durum yönetimi
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form durumu
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [isPinning, setIsPinning] = useState(false);

  const { toast } = useToast();

  // Zaman çizelgesini yükle
  const loadTimeline = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setIsLoading(true);

        // API çağrısı
        const queryParams = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          ...(filter !== 'all' && { type: filter }),
        });

        const response = await fetch(
          `/api/v1/customers/${customerId}/notes?${queryParams}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          throw new Error('Zaman çizelgesi yüklenemedi');
        }

        const data = await response.json();

        // Sabitlenmiş ve normal notları ayır
        const pinned = data.data.filter((event: TimelineEvent) => event.isPinned);
        const regular = data.data.filter((event: TimelineEvent) => !event.isPinned);

        if (append) {
          setEvents((prev) => [...prev, ...regular]);
          setPinnedEvents(pinned);
        } else {
          setEvents(regular);
          setPinnedEvents(pinned);
        }

        setHasMore(data.pagination.hasNextPage);
        setPage(pageNum);
      } catch (error) {
        logger.error('Zaman cizelgesi yukleme hatasi', error);
        toast({
          title: 'Hata',
          description: t('timeline.error'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [customerId, filter, toast]
  );

  // İlk yükleme ve filter değişiklikleri
  useEffect(() => {
    loadTimeline(1, false);
  }, [filter, customerId]);

  // Not oluştur / güncelle
  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast({
        title: 'Uyarı',
        description: 'Not içeriği boş olamaz',
        variant: 'default',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingId) {
        // Güncelle
        const response = await fetch(
          `/api/v1/customers/${customerId}/notes`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              noteId: editingId,
              content: noteContent,
              isPinned: isPinning,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Not güncellenirken hata oluştu');
        }

        // Zaman çizelgesini yenile
        await loadTimeline(1, false);
        setEditingId(null);
      } else {
        // Yeni not oluştur
        const response = await fetch(
          `/api/v1/customers/${customerId}/notes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: noteContent,
              type: noteType,
              isPinned: isPinning,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Not oluşturulurken hata oluştu');
        }

        const newNote = await response.json();
        onNoteCreate?.(newNote);

        // Zaman çizelgesini yenile
        await loadTimeline(1, false);
      }

      // Form temizle
      setNoteContent('');
      setNoteType('note');
      setIsPinning(false);

      toast({
        title: 'Başarı',
        description: t('timeline.success'),
        variant: 'default',
      });
    } catch (error) {
      logger.error('Not kaydetme hatasi', error);
      toast({
        title: 'Hata',
        description: t('timeline.error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not sil
  const handleDeleteNote = async (noteId: string) => {
    const ok = await confirm({ message: 'Bu notu silmek istediğinizden emin misiniz?', confirmText: 'Sil', variant: 'danger' });
    if (!ok) return;

    try {
      const response = await fetch(
        `/api/v1/customers/${customerId}/notes?noteId=${noteId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Not silinirken hata oluştu');
      }

      await loadTimeline(1, false);

      toast({
        title: 'Başarı',
        description: 'Not başarıyla silindi',
        variant: 'default',
      });
    } catch (error) {
      logger.error('Not silme hatasi', error);
      toast({
        title: 'Hata',
        description: t('timeline.error'),
        variant: 'destructive',
      });
    }
  };

  // Not düzenle
  const handleEditNote = (event: TimelineEvent) => {
    setEditingId(event.id);
    setNoteContent(event.content);
    setNoteType((event.type as NoteType) || 'note');
    setIsPinning(event.isPinned || false);
  };

  // Düzenlemeyi iptal et
  const handleCancelEdit = () => {
    setEditingId(null);
    setNoteContent('');
    setNoteType('note');
    setIsPinning(false);
  };

  // Daha fazla yükle
  const handleLoadMore = () => {
    loadTimeline(page + 1, true);
  };

  // Timeline event kartı render et
  const renderTimelineCard = (event: TimelineEvent, isPinned: boolean = false) => (
    <div
      key={event.id}
      className={cn(
        'group relative',
        isPinned && 'rounded-lg bg-yellow-50 p-4 border-l-4 border-yellow-400'
      )}
    >
      {/* Timeline dot ve çizgi */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-4 ring-white">
            {getIconByType(event.type)}
          </div>
          {/* Çizgi sonraki eleme doğru */}
          <div className="h-8 w-0.5 bg-gray-200" />
        </div>

        {/* İçerik */}
        <div className="flex-1 pb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex gap-2 items-center mb-2">
                <Badge className={getBadgeVariant(event.type)}>
                  {event.type === 'note' ? 'Not' : event.type.toUpperCase()}
                </Badge>
                {isPinned && (
                  <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </div>

              {/* Timestamp ve kullanıcı */}
              <p className="text-sm text-gray-500 mb-2">
                {event.user} •{' '}
                <time title={format(new Date(event.timestamp), 'PPpp', { locale: tr })}>
                  {formatDistanceToNow(new Date(event.timestamp), {
                    locale: tr,
                    addSuffix: true,
                  })}
                </time>
              </p>

              {/* İçerik */}
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.content}
              </p>

              {/* Eki sayısı */}
              {event.attachmentsCount ? (
                <p className="text-xs text-gray-500 mt-2">
                  {event.attachmentsCount} ek dosya
                </p>
              ) : null}
            </div>

            {/* Aksiyonlar */}
            <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditNote(event)}
                disabled={isSubmitting}
              >
                {t('timeline.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => handleDeleteNote(event.id)}
                disabled={isSubmitting}
              >
                {t('timeline.delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('timeline.title')}
        </h2>
      </div>

      {/* Not Ekleme Formu */}
      <Card className="p-6 border-2 border-blue-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {editingId ? 'Notu Düzenle' : t('timeline.addNote')}
        </h3>

        <div className="space-y-4">
          {/* Not İçeriği */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Not İçeriği
            </label>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={tl('notePlaceholder')}
              className="w-full"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Not Türü ve Sabitleme */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('timeline.noteType')}
              </label>
              <Select
                value={noteType}
                onValueChange={(value) => setNoteType(value as NoteType)}
                disabled={isSubmitting || !!editingId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Not</SelectItem>
                  <SelectItem value="call">Arama</SelectItem>
                  <SelectItem value="meeting">Toplantı</SelectItem>
                  <SelectItem value="email">E-posta</SelectItem>
                  <SelectItem value="task">Görev</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinning}
                  onChange={(e) => setIsPinning(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('timeline.pinNote')}
                </span>
              </label>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 justify-end">
            {editingId && (
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                {t('timeline.cancel')}
              </Button>
            )}
            <Button
              onClick={handleSaveNote}
              disabled={isSubmitting || !noteContent.trim()}
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {t('timeline.save')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Filtreler */}
      <div className="flex gap-2 items-center">
        <span className="text-sm font-medium text-gray-700">
          {t('timeline.filters')}:
        </span>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'note', 'call', 'meeting', 'email', 'task', 'proposal', 'status'] as FilterType[]).map(
            (f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                disabled={isLoading}
              >
                {f === 'all'
                  ? 'Tümü'
                  : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Zaman Çizelgesi İçeriği */}
      <div className="relative">
        {isLoading && events.length === 0 ? (
          // Yükleme durumu
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">{t('timeline.loading')}</span>
          </div>
        ) : events.length === 0 && pinnedEvents.length === 0 ? (
          // Boş durum
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('timeline.emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sabitlenmiş notlar */}
            {pinnedEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  Sabitlenmiş Notlar
                </h3>
                <div className="space-y-3">
                  {pinnedEvents.map((event) => renderTimelineCard(event, true))}
                </div>
              </div>
            )}

            {/* Normal zaman çizelgesi */}
            <div>
              {pinnedEvents.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Son Aktiviteler
                </h3>
              )}
              <div className="space-y-0">
                {events.map((event) => renderTimelineCard(event, false))}
              </div>
            </div>

            {/* Daha Fazla Yükle Düğmesi */}
            {hasMore && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('timeline.loading')}
                    </>
                  ) : (
                    t('timeline.loadMore')
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Export named export
export default CustomerTimeline;
