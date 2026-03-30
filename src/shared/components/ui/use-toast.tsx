'use client';

import * as React from 'react';

type ToastVariant = 'default' | 'destructive';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
}

let listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  const newToast = { ...toast, id };
  memoryState = { toasts: [...memoryState.toasts, newToast] };
  listeners.forEach((listener) => listener(memoryState));

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    memoryState = {
      toasts: memoryState.toasts.filter((t) => t.id !== id),
    };
    listeners.forEach((listener) => listener(memoryState));
  }, 5000);
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return {
    ...state,
    toast: (props: Omit<Toast, 'id'>) => dispatch(props),
    dismiss: (toastId?: string) => {
      memoryState = {
        toasts: toastId
          ? memoryState.toasts.filter((t) => t.id !== toastId)
          : [],
      };
      listeners.forEach((listener) => listener(memoryState));
    },
  };
}

export { useToast, type Toast };
