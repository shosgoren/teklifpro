'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Workspace tanımı — her çalışma alanının kendi accent tonu vardır.
 * Hue ölçeği: 165 = yeşil, 230 = mavi, 30 = turuncu, 280 = mor.
 */
export interface Workspace {
  id: string;
  name: string;
  sub: string;
  hue: number;
  color: string;
}

/**
 * Varsayılan çalışma alanları (prototip tokens.js ile birebir).
 * Her workspace seçildiğinde --accent-hue CSS değişkeni güncellenir
 * ve mint tokenları otomatik olarak yeni tona kayar.
 */
export const WORKSPACES: Workspace[] = [
  { id: 'tk', name: 'Teknik İklim', sub: 'tekniklim.com.tr', hue: 165, color: 'oklch(0.56 0.14 165)' },
  { id: 'es', name: 'Eskişehir Şubesi', sub: 'sube@tekniklim', hue: 230, color: 'oklch(0.55 0.15 230)' },
  { id: 'pe', name: 'Personal demo', sub: 'sandbox', hue: 30, color: 'oklch(0.60 0.13 30)' },
  { id: 'mz', name: 'Mavi Zemin A.Ş.', sub: 'mavizemin.com', hue: 280, color: 'oklch(0.55 0.16 280)' },
];

const STORAGE_KEY = 'tp-workspace-id';
const DEFAULT_WORKSPACE_ID = 'tk';

interface WorkspaceContextValue {
  workspace: Workspace;
  workspaces: Workspace[];
  setCurrentWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * WorkspaceProvider
 *
 * Aktif çalışma alanını localStorage'da saklar ve her değişiklikte
 * <html> kök öğesi üzerindeki --accent-hue CSS değişkenini günceller.
 * Bu sayede globals.css'teki mint-* tokenları otomatik olarak yeni
 * tona kayar — bileşenler ekstra bir şey yapmak zorunda kalmaz.
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps): JSX.Element {
  const [workspaceId, setWorkspaceId] = useState<string>(DEFAULT_WORKSPACE_ID);

  // Mount sırasında localStorage'dan oku
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && WORKSPACES.some((w) => w.id === stored)) {
        setWorkspaceId(stored);
      }
    } catch {
      // localStorage erişilemediğinde sessizce varsayılana düş
    }
  }, []);

  const workspace = useMemo<Workspace>(
    () => WORKSPACES.find((w) => w.id === workspaceId) ?? WORKSPACES[0],
    [workspaceId]
  );

  // Aktif workspace değiştiğinde CSS değişkenini ve localStorage'ı güncelle
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--accent-hue', String(workspace.hue));
    try {
      localStorage.setItem(STORAGE_KEY, workspace.id);
    } catch {
      // sessizce yoksay
    }
  }, [workspace.hue, workspace.id]);

  const setCurrentWorkspace = useCallback((id: string) => {
    if (WORKSPACES.some((w) => w.id === id)) {
      setWorkspaceId(id);
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspace, workspaces: WORKSPACES, setCurrentWorkspace }),
    [workspace, setCurrentWorkspace]
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

/**
 * useWorkspace — aktif çalışma alanına ve switcher'a erişim sağlar.
 * Provider dışında çağrıldığında açıklayıcı bir hata fırlatır.
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return ctx;
}
