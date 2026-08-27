"use client";

import React from "react";
import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface KbdEnterProps extends React.HTMLAttributes<HTMLElement> {
  label?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * High-polish modern keyboard keycap for Enter (↵) action.
 * Renders a crisp vector return icon with micro-keycap elevation and clean contrast.
 */
export function KbdEnter({ label, className, iconClassName, ...props }: KbdEnterProps) {
  return (
    <kbd
      className={cn(
        "hidden sm:inline-flex items-center justify-center gap-1 h-4 min-w-4 px-1 py-0.5",
        "rounded-[5px] bg-black/20 hover:bg-black/30 border border-white/20 dark:border-white/25",
        "text-current shadow-[0_1px_1px_rgba(0,0,0,0.3)] font-mono text-[9.5px] font-semibold leading-none",
        "select-none pointer-events-none transition-colors",
        className
      )}
      {...props}
    >
      <CornerDownLeft className={cn("h-2.5 w-2.5 stroke-[2.5] shrink-0", iconClassName)} />
      {label && <span className="text-[9px] font-sans font-medium">{label}</span>}
    </kbd>
  );
}

interface KbdEscProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

/**
 * Modern keyboard keycap for Escape (Esc) dismiss action.
 */
export function KbdEsc({ className, ...props }: KbdEscProps) {
  return (
    <kbd
      className={cn(
        "hidden sm:inline-flex items-center justify-center h-4 min-w-[22px] px-1 py-0.5",
        "rounded-[5px] bg-zinc-800/90 border border-zinc-700/80 text-zinc-400",
        "shadow-[0_1px_1px_rgba(0,0,0,0.4)] font-mono text-[9px] font-semibold leading-none tracking-tight",
        "select-none pointer-events-none transition-colors",
        className
      )}
      {...props}
    >
      Esc
    </kbd>
  );
}
