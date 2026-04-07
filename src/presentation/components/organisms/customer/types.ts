export type NoteType = 'note' | 'call' | 'meeting' | 'email' | 'task';
export type TimelineEventType = 'note' | 'call' | 'meeting' | 'email' | 'task' | 'proposal' | 'status';
export type FilterType = 'all' | NoteType | 'proposal' | 'status';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  content: string;
  timestamp: string;
  user: string;
  isPinned?: boolean;
  attachmentsCount?: number;
  metadata?: Record<string, any>;
}

export interface CustomerTimelineProps {
  customerId: string;
  className?: string;
  onNoteCreate?: (note: TimelineEvent) => void;
}

export interface NoteFormProps {
  noteContent: string;
  noteType: NoteType;
  isPinning: boolean;
  isSubmitting: boolean;
  editingId: string | null;
  onNoteContentChange: (content: string) => void;
  onNoteTypeChange: (type: NoteType) => void;
  onIsPinningChange: (isPinning: boolean) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  tl: (key: string) => string;
}

export interface TimelineFiltersProps {
  filter: FilterType;
  isLoading: boolean;
  onFilterChange: (filter: FilterType) => void;
}

export interface TimelineItemProps {
  event: TimelineEvent;
  isPinned: boolean;
  isSubmitting: boolean;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (noteId: string) => void;
}
