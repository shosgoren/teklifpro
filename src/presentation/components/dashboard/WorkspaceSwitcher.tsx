'use client';

import { Check, ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWorkspace, type Workspace } from './WorkspaceProvider';

/**
 * Bir workspace için kompakt yuvarlak köşeli avatar — gradient arka plan
 * ve workspace adının baş harfini içerir. Sidebar trigger'ında ve dropdown
 * listesinde paylaşılır.
 */
function WorkspaceAvatar({ workspace, size = 34 }: { workspace: Workspace; size?: number }): JSX.Element {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-[9px] text-white font-bold tracking-tight"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${workspace.color}, oklch(0.65 0.10 ${workspace.hue}))`,
        boxShadow: `0 2px 10px ${workspace.color}40`,
        fontSize: size >= 32 ? 14 : 12,
      }}
      aria-hidden="true"
    >
      {workspace.name.charAt(0)}
    </div>
  );
}

/**
 * WorkspaceSwitcher
 *
 * Sidebar üst kısmında aktif çalışma alanını ve değiştirme dropdown'unu gösterir.
 * Seçim yapıldığında setCurrentWorkspace çağrılır → --accent-hue güncellenir →
 * tüm mint tonları yeni renge kayar.
 */
export function WorkspaceSwitcher(): JSX.Element {
  const { workspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dış tık ile kapat
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Çalışma alanı değiştir"
        className={`w-full flex items-center gap-2.5 p-2 rounded-[14px] text-left transition-colors ${
          open ? 'bg-secondary' : 'hover:bg-secondary/60'
        }`}
      >
        <WorkspaceAvatar workspace={workspace} size={34} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-foreground truncate tracking-tight">
            {workspace.name}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {workspace.sub}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-muted-foreground flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Çalışma alanları"
          className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border border-border rounded-[14px] overflow-hidden shadow-[0_16px_40px_rgba(18,38,28,0.14)]"
        >
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Çalışma alanları
          </div>
          {workspaces.map((w) => {
            const isActive = w.id === workspace.id;
            return (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setCurrentWorkspace(w.id);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${
                  isActive ? 'bg-accent' : 'hover:bg-secondary/60'
                }`}
              >
                <WorkspaceAvatar workspace={w} size={26} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">
                    {w.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {w.sub}
                  </div>
                </div>
                {isActive && (
                  <Check size={14} className="text-accent-foreground flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              className="w-full px-2.5 py-2 flex items-center gap-2 rounded-[10px] text-[13px] text-muted-foreground hover:bg-secondary/60 transition-colors"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Yeni çalışma alanı</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
