"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "@/lib/icons";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-[var(--sb-success)]/40 text-[var(--sb-success)]",
  error: "border-[var(--sb-danger)]/40 text-[var(--sb-danger)]",
  info: "border-[var(--sb-info)]/40 text-[var(--sb-info)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "sb-fade-in pointer-events-auto flex items-start gap-3 rounded-[var(--sb-radius-md)] border bg-[var(--sb-bg-panel)] p-3.5 shadow-lg shadow-black/40",
                VARIANT_STYLES[toast.variant],
              )}
            >
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--sb-text)]">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-[var(--sb-text-muted)]">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(toast.id)}
                className="text-[var(--sb-text-faint)] hover:text-[var(--sb-text)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}
