"use client";

import React, { useState, useRef, useEffect } from "react";
import { MemberOption } from "@/lib/application/actions";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { Search, ChevronDown, Check, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberSelectDropdownProps {
  members: MemberOption[];
  value: string;
  onChange: (memberId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MemberSelectDropdown({
  members,
  value,
  onChange,
  placeholder = "Select Member / User...",
  disabled = false,
  className,
}: MemberSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedMember = members.find((m) => m.id === value);

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

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const filteredMembers = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const cleanUsername = (m.username || "").toLowerCase().replace(/^@/, "");
    const cleanName = (m.name || "").toLowerCase();
    const pan = (m.panFull || m.panMasked || "").toLowerCase();
    return (
      cleanUsername.includes(q) ||
      cleanName.includes(q) ||
      pan.includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full h-10 px-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer shadow-xs",
          isOpen && "border-blue-500 ring-1 ring-blue-500/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedMember ? (
            <>
              <MemberAvatar
                src={selectedMember.avatar}
                name={selectedMember.name}
                className="h-6 w-6 rounded-lg text-[10px] shrink-0 border border-zinc-800"
              />
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="font-semibold text-zinc-100 truncate">
                  @{selectedMember.username || selectedMember.name}
                </span>
                <span className="text-zinc-500 text-[11px] truncate">
                  ({selectedMember.name})
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="h-6 w-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-zinc-500 truncate">{placeholder}</span>
            </>
          )}
        </div>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-500 shrink-0 transition-transform duration-150",
            isOpen && "rotate-180 text-blue-400"
          )}
        />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-[280px] flex flex-col">
          {/* Search Header */}
          <div className="p-2 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2 shrink-0">
            <Search className="h-3.5 w-3.5 text-zinc-400 ml-1 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member or @username..."
              className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="overflow-y-auto p-1.5 space-y-1 flex-1 divide-y divide-zinc-900">
            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500">
                No matching members found
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = m.id === value;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group",
                      isSelected
                        ? "bg-blue-950/40 text-blue-200 border border-blue-500/20"
                        : "hover:bg-zinc-900/80 text-zinc-300 hover:text-zinc-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MemberAvatar
                        src={m.avatar}
                        name={m.name}
                        className="h-7 w-7 rounded-xl text-xs shrink-0 border border-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-zinc-100 group-hover:text-white truncate">
                            @{m.username || m.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate">
                          {m.name}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-400 shrink-0" />
                    )}
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
