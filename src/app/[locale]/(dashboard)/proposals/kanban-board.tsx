'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical, User, Calendar, Banknote } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/shared/utils/cn';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUESTED' | 'EXPIRED' | 'INVOICED';

interface Proposal {
  id: string;
  title: string;
  proposalNumber: string;
  status: ProposalStatus;
  grandTotal: number;
  createdAt: string;
  customer?: { name: string; email?: string };
  publicToken?: string;
}

interface KanbanBoardProps {
  proposals: Proposal[];
  onStatusChange: (proposalId: string, newStatus: ProposalStatus) => Promise<void>;
  mutate: () => void;
}

const KANBAN_COLUMNS: { status: ProposalStatus; label: string; color: string; dotColor: string; bgColor: string; borderColor: string }[] = [
  { status: 'DRAFT', label: 'Taslak', color: 'text-slate-600 dark:text-slate-300', dotColor: 'bg-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/50', borderColor: 'border-slate-200 dark:border-slate-700' },
  { status: 'SENT', label: 'Gönderildi', color: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500', bgColor: 'bg-blue-50/50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800' },
  { status: 'VIEWED', label: 'Görüntülendi', color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50/50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800' },
  { status: 'REVISION_REQUESTED', label: 'Revize', color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50/50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800' },
  { status: 'ACCEPTED', label: 'Kabul Edildi', color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
  { status: 'REJECTED', label: 'Reddedildi', color: 'text-red-600 dark:text-red-400', dotColor: 'bg-red-500', bgColor: 'bg-red-50/50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800' },
  { status: 'INVOICED', label: 'Faturalandı', color: 'text-indigo-600 dark:text-indigo-400', dotColor: 'bg-indigo-500', bgColor: 'bg-indigo-50/50 dark:bg-indigo-950/30', borderColor: 'border-indigo-200 dark:border-indigo-800' },
];

const formatAmount = (amount: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

// ─── Draggable Card ───
function ProposalCard({ proposal, isDragging }: { proposal: Proposal; isDragging?: boolean }) {
  const router = useRouter();
  const locale = useLocale();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ id: proposal.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/50 p-3.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer',
        isDragging && 'opacity-40 scale-95'
      )}
      onClick={() => router.push(`/${locale}/proposals/${proposal.id}`)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {proposal.title || proposal.proposalNumber}
          </p>
          <p className="text-[11px] font-mono text-gray-400 mt-0.5">{proposal.proposalNumber}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {proposal.customer?.name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{proposal.customer.name}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(proposal.createdAt)}
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
            <Banknote className="h-3.5 w-3.5 text-gray-400" />
            {formatAmount(Number(proposal.grandTotal) || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overlay Card (shown while dragging) ───
function OverlayCard({ proposal }: { proposal: Proposal }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-violet-400 dark:border-violet-500 p-3.5 shadow-2xl shadow-violet-500/20 w-[260px] rotate-2">
      <p className="text-sm font-semibold truncate">{proposal.title || proposal.proposalNumber}</p>
      <p className="text-[11px] font-mono text-gray-400 mt-0.5">{proposal.proposalNumber}</p>
      {proposal.customer?.name && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
          <User className="h-3 w-3" />
          <span className="truncate">{proposal.customer.name}</span>
        </div>
      )}
      <p className="text-sm font-bold mt-2">{formatAmount(Number(proposal.grandTotal) || 0)}</p>
    </div>
  );
}

// ─── Droppable Column ───
function KanbanColumn({
  column,
  proposals,
  activeId,
}: {
  column: typeof KANBAN_COLUMNS[0];
  proposals: Proposal[];
  activeId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl border transition-all duration-200 min-w-[260px] w-[280px] shrink-0',
        column.borderColor,
        isOver ? 'ring-2 ring-violet-400 dark:ring-violet-500 bg-violet-50/30 dark:bg-violet-950/20 scale-[1.01]' : column.bgColor
      )}
    >
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-inherit">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('h-2.5 w-2.5 rounded-full', column.dotColor)} />
            <span className={cn('text-sm font-semibold', column.color)}>{column.label}</span>
          </div>
          <span className="text-xs font-medium bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 shadow-sm">
            {proposals.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[120px] scrollbar-thin">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            isDragging={activeId === proposal.id}
          />
        ))}
        {proposals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-6 w-6 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 dark:text-gray-500">Teklif yok</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ───
export default function KanbanBoard({ proposals, onStatusChange, mutate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const t = useTranslations('proposals');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const groupedProposals = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = proposals.filter((p) => p.status === col.status);
    return acc;
  }, {} as Record<ProposalStatus, Proposal[]>);

  const activeProposal = activeId ? proposals.find((p) => p.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const proposalId = active.id as string;
    const newStatus = over.id as ProposalStatus;

    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal || proposal.status === newStatus) return;

    try {
      await onStatusChange(proposalId, newStatus);
      toast.success(`Durum güncellendi: ${KANBAN_COLUMNS.find(c => c.status === newStatus)?.label}`);
      mutate();
    } catch {
      toast.error('Durum güncellenirken hata oluştu');
    }
  }, [proposals, onStatusChange, mutate]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            column={column}
            proposals={groupedProposals[column.status] || []}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProposal ? <OverlayCard proposal={activeProposal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
