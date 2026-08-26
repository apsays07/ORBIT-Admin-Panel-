import React from "react";
import { Card } from "@/components/ui/card";

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-zinc-800/80 rounded-lg" />
          <div className="h-3.5 w-72 bg-zinc-800/40 rounded" />
        </div>
        <div className="h-9 w-32 bg-zinc-800/60 rounded-xl" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-zinc-900/40 border-zinc-800/80 p-4 rounded-2xl space-y-2">
            <div className="h-3 w-24 bg-zinc-800/60 rounded" />
            <div className="h-8 w-16 bg-zinc-800 rounded-lg" />
            <div className="h-2.5 w-32 bg-zinc-800/40 rounded" />
          </Card>
        ))}
      </div>

      {/* Controls Bar Skeleton */}
      <div className="h-12 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex items-center px-4 justify-between">
        <div className="h-6 w-64 bg-zinc-800/60 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-zinc-800/50 rounded-xl" />
          <div className="h-8 w-24 bg-zinc-800/50 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800/80 flex gap-4 bg-zinc-950/60">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 flex-1 bg-zinc-800/60 rounded" />
          ))}
        </div>
        <div className="divide-y divide-zinc-800/40">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="p-4 flex gap-4 items-center">
              {Array.from({ length: cols }).map((_, c) => (
                <div key={c} className="h-4 flex-1 bg-zinc-800/40 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
