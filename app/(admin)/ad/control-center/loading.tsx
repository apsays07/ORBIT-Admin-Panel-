import React from "react";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function ControlCenterLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-3">
        <div className="h-6 w-48 bg-zinc-800 rounded-lg" />
        <div className="h-4 w-96 bg-zinc-800/60 rounded-md" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-zinc-950/70 border border-zinc-800/80 p-4 space-y-2"
          >
            <div className="h-4 w-24 bg-zinc-800/80 rounded" />
            <div className="h-8 w-16 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5">
        <TableSkeleton rows={6} cols={6} />
      </div>
    </div>
  );
}
