'use client';

import { useState, useCallback, useEffect } from 'react';
import { Logger } from '@/infrastructure/logger';
import { useConfirm } from '@/shared/components/confirm-dialog';
import { Button } from '@/shared/components/ui/button';
import {
  MessageCircle,
  Star,
  Loader2,
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useTranslations } from 'next-intl';
import { useToast } from '@/shared/components/ui/use-toast';
import type { TimelineEvent, NoteType, FilterType, CustomerTimelineProps } from './customer/types';
import { TimelineItem } from './customer/TimelineItem';
import { TimelineFilters } from './customer/TimelineFilters';
import { NoteForm } from './customer/NoteForm';

const logger = new Logger('CustomerTimeline');

/**
 * CustomerTimeline Component
 * Shows customer activity timeline: notes, proposals, status changes, etc.
 * Pinned notes are shown at the top with yellow highlight.
 * Pagination via "Load More" button.
 */
export function CustomerTimeline({
  customerId,
  className,
  onNoteCreate,
}: CustomerTimelineProps) {
  const confirm = useConfirm();
  const t = useTranslations('customerTimeline');
  const tl = useTranslations('timeline');
  // State management
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [pinnedEvents, setPinnedEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [isPinning, setIsPinning] = useState(false);

  const { toast } = useToast();

  // Load timeline
  const loadTimeline = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        setIsLoading(true);

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
          throw new Error(t('errorLoadTimeline'));
        }

        const data = await response.json();

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
        logger.error('Timeline load error', error);
        toast({
          title: t('toastErrorTitle'),
          description: t('error'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [customerId, filter, toast, t]
  );

  // Initial load and filter changes
  useEffect(() => {
    loadTimeline(1, false);
  }, [filter, customerId]);

  // Create / update note
  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast({
        title: t('toastWarningTitle'),
        description: t('noteContentEmpty'),
        variant: 'default',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingId) {
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
          throw new Error(t('errorUpdateNote'));
        }

        await loadTimeline(1, false);
        setEditingId(null);
      } else {
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
          throw new Error(t('errorCreateNote'));
        }

        const newNote = await response.json();
        onNoteCreate?.(newNote);

        await loadTimeline(1, false);
      }

      // Clear form
      setNoteContent('');
      setNoteType('note');
      setIsPinning(false);

      toast({
        title: t('toastSuccessTitle'),
        description: t('success'),
        variant: 'default',
      });
    } catch (error) {
      logger.error('Note save error', error);
      toast({
        title: t('toastErrorTitle'),
        description: t('error'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    const ok = await confirm({ message: t('confirmDeleteNote'), confirmText: t('delete'), variant: 'danger' });
    if (!ok) return;

    try {
      const response = await fetch(
        `/api/v1/customers/${customerId}/notes?noteId=${noteId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(t('errorDeleteNote'));
      }

      await loadTimeline(1, false);

      toast({
        title: t('toastSuccessTitle'),
        description: t('noteDeleted'),
        variant: 'default',
      });
    } catch (error) {
      logger.error('Note delete error', error);
      toast({
        title: t('toastErrorTitle'),
        description: t('error'),
        variant: 'destructive',
      });
    }
  };

  // Edit note
  const handleEditNote = (event: TimelineEvent) => {
    setEditingId(event.id);
    setNoteContent(event.content);
    setNoteType((event.type as NoteType) || 'note');
    setIsPinning(event.isPinned || false);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setNoteContent('');
    setNoteType('note');
    setIsPinning(false);
  };

  // Load more
  const handleLoadMore = () => {
    loadTimeline(page + 1, true);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('title')}
        </h2>
      </div>

      {/* Note Form */}
      <NoteForm
        noteContent={noteContent}
        noteType={noteType}
        isPinning={isPinning}
        isSubmitting={isSubmitting}
        editingId={editingId}
        onNoteContentChange={setNoteContent}
        onNoteTypeChange={setNoteType}
        onIsPinningChange={setIsPinning}
        onSave={handleSaveNote}
        onCancelEdit={handleCancelEdit}
        tl={tl}
      />

      {/* Filters */}
      <TimelineFilters
        filter={filter}
        isLoading={isLoading}
        onFilterChange={setFilter}
      />

      {/* Timeline Content */}
      <div className="relative">
        {isLoading && events.length === 0 ? (
          // Loading state
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">{t('loading')}</span>
          </div>
        ) : events.length === 0 && pinnedEvents.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('emptyState')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned notes */}
            {pinnedEvents.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {t('pinnedNotes')}
                </h3>
                <div className="space-y-3">
                  {pinnedEvents.map((event) => (
                    <TimelineItem
                      key={event.id}
                      event={event}
                      isPinned={true}
                      isSubmitting={isSubmitting}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular timeline */}
            <div>
              {pinnedEvents.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  {t('recentActivities')}
                </h3>
              )}
              <div className="space-y-0">
                {events.map((event) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    isPinned={false}
                    isSubmitting={isSubmitting}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            </div>

            {/* Load More Button */}
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
                      {t('loading')}
                    </>
                  ) : (
                    t('loadMore')
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
