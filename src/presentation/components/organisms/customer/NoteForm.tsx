'use client';

import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { NoteFormProps, NoteType } from './types';

export function NoteForm({
  noteContent,
  noteType,
  isPinning,
  isSubmitting,
  editingId,
  onNoteContentChange,
  onNoteTypeChange,
  onIsPinningChange,
  onSave,
  onCancelEdit,
  tl,
}: NoteFormProps) {
  const t = useTranslations('customerTimeline');
  return (
    <Card className="p-6 border-2 border-blue-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Plus className="w-5 h-5" />
        {editingId ? t('editNote') : t('addNote')}
      </h3>

      <div className="space-y-4">
        {/* Note content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('noteContent')}
          </label>
          <Textarea
            value={noteContent}
            onChange={(e) => onNoteContentChange(e.target.value)}
            placeholder={tl('notePlaceholder')}
            className="w-full"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {/* Note type and pinning */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('noteType')}
            </label>
            <Select
              value={noteType}
              onValueChange={(value) => onNoteTypeChange(value as NoteType)}
              disabled={isSubmitting || !!editingId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">{t('typeNote')}</SelectItem>
                <SelectItem value="call">{t('typeCall')}</SelectItem>
                <SelectItem value="meeting">{t('typeMeeting')}</SelectItem>
                <SelectItem value="email">{t('typeEmail')}</SelectItem>
                <SelectItem value="task">{t('typeTask')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinning}
                onChange={(e) => onIsPinningChange(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">
                {t('pinNote')}
              </span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          {editingId && (
            <Button
              variant="outline"
              onClick={onCancelEdit}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
          )}
          <Button
            onClick={onSave}
            disabled={isSubmitting || !noteContent.trim()}
          >
            {isSubmitting && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {t('save')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
