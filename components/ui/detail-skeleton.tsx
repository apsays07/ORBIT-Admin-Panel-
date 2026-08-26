import React from "react";
import { Card } from "@/components/ui/card";

export function DetailSkeleton() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 bg-zinc-800/60 rounded-xl" />
          <div className="h-6 w-48 bg-zinc-800/80 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-zinc-800/60 rounded-xl" />
      </div>

      {/* Hero Stats Card */}
      <Card className="p-6 bg-zinc-900/40 border-zinc-800/80 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-zinc-800 rounded-lg" />
            <div className="h-4 w-40 bg-zinc-800/50 rounded" />
          </div>
          <div className="h-8 w-28 bg-zinc-800/60 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-zinc-800/50 rounded" />
              <div className="h-6 w-28 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </Card>

      {/* Grid of 2 detailed cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-zinc-900/40 border-zinc-800/80 rounded-2xl space-y-4">
          <div className="h-5 w-36 bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between py-2 border-b border-zinc-800/40">
                <div className="h-4 w-28 bg-zinc-800/50 rounded" />
                <div className="h-4 w-36 bg-zinc-800/70 rounded" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-zinc-800/80 rounded-2xl space-y-4">
          <div className="h-5 w-36 bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between py-2 border-b border-zinc-800/40">
                <div className="h-4 w-28 bg-zinc-800/50 rounded" />
                <div className="h-4 w-36 bg-zinc-800/70 rounded" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
