'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ── Types ─────────────────────────────────────────────────

export interface DetailPanelProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Panel width on desktop. Default: 520px */
  width?: string
}

export interface DetailPanelHeaderProps {
  children: React.ReactNode
  /** Gradient class, e.g. "from-blue-600 to-indigo-600" */
  gradient?: string
  onClose?: () => void
}

export interface DetailPanelSectionProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export interface DetailPanelFooterProps {
  children: React.ReactNode
  className?: string
}

// ── Inline Editable Field ────────────────────────────────

export interface InlineFieldProps {
  label: string
  value: string | number | null | undefined
  onSave?: (value: string) => void | Promise<void>
  type?: 'text' | 'number' | 'email' | 'tel' | 'textarea'
  editable?: boolean
  icon?: React.ReactNode
  placeholder?: string
  suffix?: string
  /** Custom display render (when not editing) */
  display?: React.ReactNode
}

export function InlineField({
  label,
  value,
  onSave,
  type = 'text',
  editable = true,
  icon,
  placeholder,
  suffix,
  display,
}: InlineFieldProps) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(String(value ?? ''))
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  React.useEffect(() => {
    setDraft(String(value ?? ''))
  }, [value])

  React.useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const handleSave = async () => {
    if (!onSave || draft === String(value ?? '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') handleSave()
    if (e.key === 'Escape') { setDraft(String(value ?? '')); setEditing(false) }
  }

  if (editing && editable && onSave) {
    const inputClasses = 'w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50'
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          {type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              rows={3}
              className={cn(inputClasses, 'resize-none')}
              disabled={saving}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={inputClasses}
              disabled={saving}
            />
          )}
          {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group space-y-0.5',
        editable && onSave && 'cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-1 rounded-lg transition-colors'
      )}
      onClick={() => editable && onSave && setEditing(true)}
    >
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <div className="shrink-0">{icon}</div>}
        {display ?? (
          <p className={cn(
            'text-sm font-medium',
            !value && 'text-muted-foreground italic'
          )}>
            {value || placeholder || '-'}
            {suffix && value ? ` ${suffix}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ── DetailPanel Root ──────────────────────────────────────

export function DetailPanel({ open, onClose, children, width = '520px' }: DetailPanelProps) {
  const panelId = React.useId()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          [data-panel-id="${panelId}"] {
            position: fixed;
            z-index: 50;
            top: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            background: hsl(var(--background));
            box-shadow: -4px 0 25px rgba(0,0,0,0.15);
            outline: none;
          }
          @media (min-width: 640px) {
            [data-panel-id="${panelId}"] {
              width: ${width};
              max-width: 90vw;
            }
          }
        `}} />
        <DialogPrimitive.Content
          data-panel-id={panelId}
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:duration-300 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <DialogPrimitive.Title className="sr-only">Detail</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Detail panel</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ── Header ────────────────────────────────────────────────

export function DetailPanelHeader({ children, gradient = 'from-blue-600 to-indigo-600', onClose }: DetailPanelHeaderProps) {
  return (
    <div className={cn('relative shrink-0 bg-gradient-to-br px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5', gradient)}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      )}
      {children}
    </div>
  )
}

// ── Body (scrollable) ────────────────────────────────────

export function DetailPanelBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4', className)}>
      {children}
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────

export function DetailPanelSection({ title, icon, children, className }: DetailPanelSectionProps) {
  return (
    <div className={cn('rounded-2xl bg-gray-50 dark:bg-gray-900/50 p-4', className)}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}

// ── Footer (sticky) ───────────────────────────────────────

export function DetailPanelFooter({ children, className }: DetailPanelFooterProps) {
  return (
    <div className={cn(
      'shrink-0 border-t border-gray-200 dark:border-gray-800 px-5 py-3 sm:px-6 sm:py-4 flex gap-3 bg-background',
      className
    )}>
      {children}
    </div>
  )
}
