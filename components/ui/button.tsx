import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out active:scale-[0.97] active:translate-y-px focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-40 select-none cursor-pointer";

    const variants = {
      primary:
        "bg-blue-600 text-white hover:bg-blue-500 hover:brightness-105 active:bg-blue-700 shadow-xs border border-blue-500/30",
      secondary:
        "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:brightness-105 active:bg-zinc-800 border border-zinc-700/60 shadow-xs",
      outline:
        "border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 hover:border-zinc-700 active:bg-zinc-800",
      ghost:
        "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:bg-zinc-800/80",
      danger:
        "bg-rose-600/90 text-white hover:bg-rose-500 hover:brightness-105 active:bg-rose-700 border border-rose-500/40 shadow-xs",
    };

    const sizes = {
      sm: "h-7.5 px-2.5 text-xs rounded-lg gap-1.5",
      md: "h-9 px-3.5 text-xs rounded-xl gap-2",
      lg: "h-10.5 px-4.5 text-sm rounded-xl gap-2",
      icon: "h-8 w-8 rounded-lg p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center gap-1.5 shrink-0">
            <svg
              className="h-3.5 w-3.5 animate-spin text-current opacity-80 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="truncate">{loadingText || children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

