"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast("success", title, message, duration),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast("error", title, message, duration),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast("info", title, message, duration),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) =>
      showToast("warning", title, message, duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-200 animate-in slide-in-from-bottom-3 fade-in font-sans",
                toast.type === "success" &&
                  "bg-zinc-950/95 border-emerald-500/30 text-zinc-100 shadow-emerald-950/20",
                toast.type === "error" &&
                  "bg-zinc-950/95 border-rose-500/30 text-zinc-100 shadow-rose-950/20",
                toast.type === "warning" &&
                  "bg-zinc-950/95 border-amber-500/30 text-zinc-100 shadow-amber-950/20",
                toast.type === "info" &&
                  "bg-zinc-950/95 border-blue-500/30 text-zinc-100 shadow-blue-950/20"
              )}
            >
              <div className="shrink-0 pt-0.5">
                {toast.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {toast.type === "error" && <AlertCircle className="h-4 w-4 text-rose-400" />}
                {toast.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
                {toast.type === "info" && <Info className="h-4 w-4 text-blue-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold tracking-tight text-zinc-100">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-[12px] text-zinc-400 mt-0.5 leading-relaxed font-normal">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      dismissToast: () => {},
    };
  }
  return context;
}
