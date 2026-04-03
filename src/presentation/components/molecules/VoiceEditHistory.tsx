'use client'

import { Undo2, Redo2 } from 'lucide-react'
import { Button } from '@/presentation/components/ui/button'
import { cn } from '@/shared/utils/cn'
import type { VoiceParseResult, VoiceEditChange } from '@/infrastructure/services/voice/types'

interface VoiceEditHistoryProps {
  history: VoiceParseResult[]
  currentIndex: number
  onChange: (index: number) => void
  changes: VoiceEditChange[][]
  className?: string
}

function summarizeChanges(changeSet: VoiceEditChange[]): string {
  if (changeSet.length === 0) return 'Ilk teklif'
  if (changeSet.length === 1) return changeSet[0].description
  return `${changeSet.length} degisiklik`
}

export function VoiceEditHistory({
  history,
  currentIndex,
  onChange,
  changes,
  className,
}: VoiceEditHistoryProps) {
  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-900 px-3 py-2',
        className,
      )}
    >
      {/* Undo */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canUndo}
        onClick={() => onChange(currentIndex - 1)}
        className="shrink-0 gap-1 px-2 text-xs"
        title="Geri Al"
      >
        <Undo2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Geri Al</span>
      </Button>

      {/* Timeline */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {history.map((_, idx) => {
          const isActive = idx === currentIndex
          const changeSet = changes[idx] ?? []
          const label = idx === 0 ? 'Ilk teklif' : summarizeChanges(changeSet)

          return (
            <button
              key={idx}
              onClick={() => onChange(idx)}
              title={label}
              className={cn(
                'shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              <span className="tabular-nums">{idx + 1}</span>
              <span className="hidden sm:inline max-w-[100px] truncate">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Redo */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRedo}
        onClick={() => onChange(currentIndex + 1)}
        className="shrink-0 gap-1 px-2 text-xs"
        title="Ileri Al"
      >
        <span className="hidden sm:inline">Ileri Al</span>
        <Redo2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
