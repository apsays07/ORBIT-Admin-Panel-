import React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-sans text-zinc-100 placeholder:text-zinc-500 hover:border-zinc-700/80 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/60 disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
