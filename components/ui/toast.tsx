"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  createdAt: number;
  count: number;
  isExiting?: boolean;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction
  ) => void;
  success: (title: string, message?: string, duration?: number, action?: ToastAction) => void;
  error: (title: string, message?: string, duration?: number, action?: ToastAction) => void;
  info: (title: string, message?: string, duration?: number, action?: ToastAction) => void;
  warning: (title: string, message?: string, duration?: number, action?: ToastAction) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

type GlobalToastListener = (
  type: ToastType,
  title: string,
  message?: string,
  duration?: number,
  action?: ToastAction
) => void;
let globalToastListener: GlobalToastListener | null = null;

export const toast = {
  success: (title: string, message?: string, duration?: number, action?: ToastAction) => {
    if (globalToastListener) globalToastListener("success", title, message, duration, action);
  },
  error: (title: string, message?: string, duration?: number, action?: ToastAction) => {
    if (globalToastListener) globalToastListener("error", title, message, duration || 5000, action);
  },
  warning: (title: string, message?: string, duration?: number, action?: ToastAction) => {
    if (globalToastListener) globalToastListener("warning", title, message, duration || 4000, action);
  },
  info: (title: string, message?: string, duration?: number, action?: ToastAction) => {
    if (globalToastListener) globalToastListener("info", title, message, duration, action);
  },
};

/**
 * Linear-style Toast Card: Clean typography, tight spacing, subtle borders,
 * soft shadows, action triggers (Undo), and smooth 150-200ms transitions.
 */
function ToastCard({
  toastItem,
  onDismiss,
}: {
  toastItem: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const remainingTimeRef = useRef(toastItem.duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startDismissTimer = useCallback(() => {
    if (remainingTimeRef.current <= 0) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      handleClose();
    }, remainingTimeRef.current);
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  useEffect(() => {
    if (!isHovered) {
      startDismissTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHovered, startDismissTimer]);

  function handleClose() {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toastItem.id);
    }, 180);
  }

  async function handleAction() {
    if (!toastItem.action || isActionPending) return;
    setIsActionPending(true);
    try {
      await toastItem.action.onClick();
    } finally {
      setIsActionPending(false);
      handleClose();
    }
  }

  const isCopyToast =
    toastItem.title.toLowerCase().includes("copied") ||
    toastItem.title.toLowerCase() === "copy";

  return (
    <div
      role={toastItem.type === "error" ? "alert" : "status"}
      aria-live={toastItem.type === "error" ? "assertive" : "polite"}
      onMouseEnter={() => {
        setIsHovered(true);
        clearDismissTimer();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-xl border shadow-xl font-sans transition-all duration-200 ease-out select-none",
        "bg-zinc-950/95 backdrop-blur-md text-zinc-100",
        toastItem.type === "error" && "border-rose-800/60 bg-zinc-950/98 shadow-rose-950/20",
        toastItem.type === "warning" && "border-amber-800/50 shadow-amber-950/15",
        toastItem.type === "success" && "border-zinc-800/90 shadow-black/40",
        toastItem.type === "info" && "border-sky-800/50 shadow-sky-950/15",
        isExiting
          ? "opacity-0 translate-y-[-4px] scale-[0.98] duration-150"
          : "opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="px-3.5 py-3 flex items-start gap-3">
        {/* Status Icon */}
        <div className="shrink-0 mt-0.5">
          {isCopyToast ? (
            <Copy className="h-4 w-4 text-zinc-300 stroke-[2]" />
          ) : toastItem.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[2]" />
          ) : toastItem.type === "error" ? (
            <AlertCircle className="h-4 w-4 text-rose-400 stroke-[2]" />
          ) : toastItem.type === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-amber-400 stroke-[2]" />
          ) : (
            <Info className="h-4 w-4 text-sky-400 stroke-[2]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h5 className="text-xs font-semibold text-zinc-100 tracking-tight leading-tight">
              {toastItem.title}
            </h5>
            {toastItem.count > 1 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                ×{toastItem.count}
              </span>
            )}
          </div>

          {toastItem.message && (
            <p className="text-[11.5px] text-zinc-400 mt-0.5 leading-normal font-normal">
              {toastItem.message}
            </p>
          )}

          {/* Optional Action Button (e.g. Undo) */}
          {toastItem.action && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAction}
                disabled={isActionPending}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-400 hover:text-blue-300 border border-zinc-700 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                {isActionPending ? (
                  <span className="h-2.5 w-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{toastItem.action.label}</span>
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="h-5 w-5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 active:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Subtle Bottom Accent Indicator */}
      <div
        className={cn(
          "h-[1.5px] w-full",
          toastItem.type === "success" && "bg-emerald-500/50",
          toastItem.type === "error" && "bg-rose-500/60",
          toastItem.type === "warning" && "bg-amber-500/50",
          toastItem.type === "info" && "bg-sky-500/50"
        )}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration: number = type === "error" ? 5000 : 3000,
      action?: ToastAction
    ) => {
      setToasts((prev) => {
        const existingIndex = prev.findIndex(
          (t) =>
            t.type === type &&
            t.title.trim().toLowerCase() === title.trim().toLowerCase() &&
            (t.message || "") === (message || "")
        );

        if (existingIndex !== -1 && !action) {
          const updated = [...prev];
          const item = updated[existingIndex];
          updated[existingIndex] = {
            ...item,
            count: item.count + 1,
            createdAt: Date.now(),
          };
          return updated;
        }

        const list = prev.length >= 4 ? prev.slice(prev.length - 3) : prev;
        const id = "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

        return [
          ...list,
          {
            id,
            type,
            title,
            message,
            duration: action ? Math.max(duration, 5000) : duration,
            createdAt: Date.now(),
            count: 1,
            action,
          },
        ];
      });
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number, action?: ToastAction) =>
      showToast("success", title, message, duration || 3000, action),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number, action?: ToastAction) =>
      showToast("error", title, message, duration || 5000, action),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number, action?: ToastAction) =>
      showToast("info", title, message, duration || 3000, action),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number, action?: ToastAction) =>
      showToast("warning", title, message, duration || 3500, action),
    [showToast]
  );

  useEffect(() => {
    globalToastListener = (type, title, message, duration, action) => {
      showToast(type, title, message, duration, action);
    };
    return () => {
      globalToastListener = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        error,
        info,
        warning,
        dismissToast,
        dismissAll,
      }}
    >
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-80 pointer-events-none select-none"
      >
        {toasts.map((toastItem) => (
          <ToastCard
            key={toastItem.id}
            toastItem={toastItem}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (type, title, message, duration, action) => toast[type](title, message, duration, action),
      success: (title, message, duration, action) => toast.success(title, message, duration, action),
      error: (title, message, duration, action) => toast.error(title, message, duration, action),
      info: (title, message, duration, action) => toast.info(title, message, duration, action),
      warning: (title, message, duration, action) => toast.warning(title, message, duration, action),
      dismissToast: () => {},
      dismissAll: () => {},
    };
  }
  return context;
}

