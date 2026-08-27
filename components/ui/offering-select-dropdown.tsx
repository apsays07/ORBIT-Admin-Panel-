"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building, ChevronDown, Check, Search, Sparkles, Layers, ShieldCheck, Clock } from "lucide-react";
import { useDropdownKeyboard } from "@/lib/hooks/use-keyboard-shortcuts";
import { cn } from "@/lib/utils";

export interface OfferingDropdownItem {
  id: string;
  name: string;
  category?: string;
  count?: number;
  status?: string;
  isCompleted?: boolean;
  allotmentFinalized?: boolean;
}

interface OfferingSelectDropdownProps {
  items: OfferingDropdownItem[];
  value: string;
  onChange: (id: string) => void;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  totalAllCount?: number;
  className?: string;
  disabled?: boolean;
}

export function OfferingSelectDropdown({
  items,
  value,
  onChange,
  includeAllOption = false,
  allOptionLabel = "All IPOs",
  totalAllCount,
  className,
  disabled = false,
}: OfferingSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.status && item.status.toLowerCase().includes(q))
    );
  });

  const selectableList = includeAllOption && !search 
    ? [{ id: "ALL", name: allOptionLabel }, ...filteredItems]
    : filteredItems;

  const { highlightedIndex, handleKeyDown } = useDropdownKeyboard({
    isOpen,
    itemCount: selectableList.length,
    onSelect: (index: number) => {
      const chosen = selectableList[index];
      if (chosen) {
        onChange(chosen.id);
        setIsOpen(false);
      }
    },
    onClose: () => setIsOpen(false),
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open if search is visible
  useEffect(() => {
    if (isOpen && items.length > 5 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else if (!isOpen) {
      setSearch("");
    }
  }, [isOpen, items.length]);

  const selectedItem = items.find((i) => i.id === value);
  const isAllSelected = value === "ALL" && includeAllOption;

  const displayTitle = isAllSelected
    ? allOptionLabel
    : selectedItem?.name || "Select Offering...";

  const displayCount = isAllSelected
    ? typeof totalAllCount === "number" ? totalAllCount : items.reduce((acc, i) => acc + (i.count || 0), 0)
    : selectedItem?.count;

  function getStatusBadge(item: OfferingDropdownItem) {
    if (item.isCompleted || item.status === "COMPLETED" || item.status === "CLOSED" || item.status === "LISTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Completed
        </span>
      );
    }
    if (item.allotmentFinalized || item.status === "ALLOTMENT_OUT") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          Allotment Out
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Active
      </span>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative shrink-0 w-[270px] select-none", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full h-10 px-3.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700/90 rounded-xl flex items-center justify-between gap-2 text-left text-xs transition-all duration-150 cursor-pointer shadow-xs",
          isOpen && "border-blue-500/80 ring-2 ring-blue-500/20 bg-zinc-800/90",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Building className="h-3.5 w-3.5" />
          </div>
          <span className="text-[11.5px] font-medium text-zinc-400 shrink-0 font-sans">
            Offering:
          </span>
          <span className="font-semibold text-zinc-100 truncate text-xs">
            {displayTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {typeof displayCount === "number" && (
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700/60 text-[10.5px] text-zinc-300 font-mono">
              {displayCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
              isOpen && "rotate-180 text-blue-400"
            )}
          />
        </div>
      </button>

      {/* Styled Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[320px] max-h-[380px] bg-zinc-950/98 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Top subtle glow line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500/60 to-transparent shrink-0" />

          {/* Menu Header */}
          <div className="px-3.5 py-2.5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/50">
            <span className="text-[10.5px] font-bold text-zinc-400 tracking-wider uppercase font-mono">
              SELECT OFFERING
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {items.length} {items.length === 1 ? "offering" : "offerings"}
            </span>
          </div>

          {/* Search Bar if > 5 items */}
          {items.length > 5 && (
            <div className="p-2 border-b border-zinc-900 bg-zinc-950 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search IPO offerings..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-blue-500/60 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Dropdown Items List */}
          <div className="p-1 overflow-y-auto max-h-[260px] space-y-0.5">
            {/* "All IPOs" Option if enabled */}
            {includeAllOption && !search && (
              <button
                type="button"
                onClick={() => {
                  onChange("ALL");
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer",
                  isAllSelected
                    ? "bg-blue-600/15 border border-blue-500/30"
                    : highlightedIndex === 0
                    ? "bg-zinc-800/90 text-zinc-100 ring-1 ring-zinc-700"
                    : "hover:bg-zinc-900/90 border border-transparent"
                )}
              >
                <span className={cn(
                  "font-medium text-xs truncate",
                  isAllSelected ? "text-blue-200" : "text-zinc-200 hover:text-zinc-100"
                )}>
                  {allOptionLabel}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {typeof totalAllCount === "number" && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                      {totalAllCount}
                    </span>
                  )}
                  {isAllSelected && <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                </div>
              </button>
            )}

            {/* IPO Offerings */}
            {filteredItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500">
                No offerings match &quot;{search}&quot;
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isSelected = item.id === value;
                const itemIndex = includeAllOption && !search ? idx + 1 : idx;
                const isHighlighted = highlightedIndex === itemIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer group",
                      isSelected
                        ? "bg-blue-600/15 border border-blue-500/30"
                        : isHighlighted
                        ? "bg-zinc-800/90 text-zinc-100 ring-1 ring-zinc-700"
                        : "hover:bg-zinc-900/90 border border-transparent"
                    )}
                  >
                    <span className={cn(
                      "font-medium text-xs truncate",
                      isSelected ? "text-blue-200" : "text-zinc-200 group-hover:text-zinc-100"
                    )}>
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {typeof item.count === "number" && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                          {item.count}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
