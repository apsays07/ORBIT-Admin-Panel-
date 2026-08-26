"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ORBIT][ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-4 text-rose-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Section Load Error</h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        {error.message || "An unexpected error occurred while loading this section. Your administrative session remains secure."}
      </p>
      <Button
        onClick={() => reset()}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Retry Section</span>
      </Button>
    </div>
  );
}
