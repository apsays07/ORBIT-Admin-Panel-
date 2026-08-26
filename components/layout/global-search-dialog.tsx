"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  X,
  ChevronRight,
  Command,
  CornerDownLeft,
  Loader2,
} from "lucide-react";
import {
  globalAdminSearch,
  GlobalSearchResults,
  GlobalSearchMemberItem,
  GlobalSearchApplicationItem,
  GlobalSearchIpoItem,
  GlobalSearchActivityResultItem,
} from "@/lib/search/actions";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn } from "@/lib/utils";

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchDialog({ isOpen, onClose }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>({
    members: [],
    applications: [],
    ipos: [],
    activities: [],
    totalCount: 0,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef("");

  // Flattened actionable list for keyboard navigation
  const flatItems = React.useMemo(() => {
    const items: Array<{
      type: "MEMBER" | "APPLICATION" | "IPO" | "ACTIVITY";
      id: string;
      url: string;
      title: string;
      subtitle: string;
      raw:
        | GlobalSearchMemberItem
        | GlobalSearchApplicationItem
        | GlobalSearchIpoItem
        | GlobalSearchActivityResultItem;
    }> = [];

    results.members.forEach((m) => {
      items.push({
        type: "MEMBER",
        id: `mem_${m.id}`,
        url: `/ad/members?q=${encodeURIComponent(m.username)}`,
        title: `@${m.username}`,
        subtitle: `${m.name} • ${m.pan ? `PAN: ${m.pan}` : "No PAN"}`,
        raw: m,
      });
    });

    results.applications.forEach((a) => {
      items.push({
        type: "APPLICATION",
        id: `app_${a.id}`,
        url: `/ad/applications?q=${encodeURIComponent(a.id)}`,
        title: `${a.applicantName} — ${a.ipoName}`,
        subtitle: `App ID: ${a.id} • ${a.pan ? `PAN: ${a.pan}` : "PAN NOT AVAILABLE"}`,
        raw: a,
      });
    });

    results.ipos.forEach((i) => {
      items.push({
        type: "IPO",
        id: `ipo_${i.id}`,
        url: `/ad/ipo?q=${encodeURIComponent(i.name)}`,
        title: i.name,
        subtitle: `${i.category || "Mainboard"} • Status: ${i.status}`,
        raw: i,
      });
    });

    results.activities.forEach((act) => {
      items.push({
        type: "ACTIVITY",
        id: `act_${act.id}`,
        url: `/ad/audit?q=${encodeURIComponent(act.title)}`,
        title: act.title,
        subtitle: `By @${act.actorUsername}`,
        raw: act,
      });
    });

    return items;
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults({
        members: [],
        applications: [],
        ipos: [],
        activities: [],
        totalCount: 0,
      });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation inside modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (flatItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatItems[selectedIndex];
        if (selected) {
          onClose();
          router.push(selected.url);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, onClose, router]);

  // Debounced search handler
  function handleQueryChange(text: string) {
    setQuery(text);
    latestQueryRef.current = text;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text.trim()) {
      setIsSearching(false);
      setResults({
        members: [],
        applications: [],
        ipos: [],
        activities: [],
        totalCount: 0,
      });
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      const activeQ = latestQueryRef.current;
      try {
        const res = await globalAdminSearch(activeQ);
        if (latestQueryRef.current === activeQ) {
          setResults(res);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        if (latestQueryRef.current === activeQ) {
          setIsSearching(false);
        }
      }
    }, 180);
  }

  function handleSelect(url: string) {
    onClose();
    router.push(url);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-100 flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <Search className="h-4.5 w-4.5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search members (@user), applications, IPOs, PAN cards, or audit logs..."
            className="flex-1 bg-transparent border-0 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
          />

          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400 shrink-0" />
          )}

          {query && !isSearching && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer rounded-lg hover:bg-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-[10.5px] font-mono text-zinc-500 px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800">
            <span>ESC</span>
          </div>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto flex-1 p-2 space-y-3">
          {query.trim().length === 0 && (
            <div className="py-12 text-center space-y-2">
              <Search className="h-8 w-8 text-zinc-600 mx-auto opacity-60" />
              <p className="text-xs font-medium text-zinc-400">
                Quickly discover any entity across the Orbit database
              </p>
              <p className="text-[11px] text-zinc-500 font-sans">
                Search by <span className="text-zinc-300 font-mono">@username</span>, display name, <span className="text-zinc-300 font-mono">PAN</span>, application ID, or IPO name.
              </p>
            </div>
          )}

          {query.trim().length > 0 && results.totalCount === 0 && !isSearching && (
            <div className="py-12 text-center space-y-1.5">
              <p className="text-sm font-medium text-zinc-300">
                No matching records found
              </p>
              <p className="text-xs text-zinc-500 font-sans">
                No results for &ldquo;{query}&rdquo;. Check spelling or try searching by exact PAN or username.
              </p>
            </div>
          )}

          {/* Members Group */}
          {results.members.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Users className="h-3 w-3 text-blue-400" />
                <span>Members ({results.members.length})</span>
              </div>
              {results.members.map((m) => {
                const itemIndex = flatItems.findIndex((fi) => fi.id === `mem_${m.id}`);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(`/ad/members?q=${encodeURIComponent(m.username)}`)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs group font-sans",
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-sm"
                        : "hover:bg-zinc-800/80 text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar
                        src={m.avatar}
                        name={m.username}
                        className="h-6 w-6 rounded-lg text-[10px]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-medium", isSelected ? "text-white" : "text-zinc-100")}>
                            @{m.username}
                          </span>
                          <span className={cn("text-[11px]", isSelected ? "text-blue-100" : "text-zinc-400")}>
                            ({m.name})
                          </span>
                        </div>
                        <div className={cn("text-[11px] truncate", isSelected ? "text-blue-200" : "text-zinc-500")}>
                          {m.pan ? `PAN: ${m.pan}` : "PAN NOT AVAILABLE"}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100", isSelected && "opacity-100 text-white")} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Applications Group */}
          {results.applications.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <FileSpreadsheet className="h-3 w-3 text-indigo-400" />
                <span>Applications ({results.applications.length})</span>
              </div>
              {results.applications.map((app) => {
                const itemIndex = flatItems.findIndex((fi) => fi.id === `app_${app.id}`);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelect(`/ad/applications?q=${encodeURIComponent(app.id)}`)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs group font-sans",
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-sm"
                        : "hover:bg-zinc-800/80 text-zinc-200"
                    )}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium truncate", isSelected ? "text-white" : "text-zinc-100")}>
                          {app.applicantName}
                        </span>
                        <span className={cn("text-[10.5px] px-1.5 py-0.2 rounded", isSelected ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400")}>
                          {app.ipoName}
                        </span>
                      </div>
                      <div className={cn("text-[11px] flex items-center gap-2", isSelected ? "text-blue-200" : "text-zinc-500")}>
                        <span className="font-mono text-[10.5px]">{app.id}</span>
                        <span>•</span>
                        <span>{app.pan ? `PAN: ${app.pan}` : "PAN NOT AVAILABLE"}</span>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100", isSelected && "opacity-100 text-white")} />
                  </button>
                );
              })}
            </div>
          )}

          {/* IPOs Group */}
          {results.ipos.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span>Offerings ({results.ipos.length})</span>
              </div>
              {results.ipos.map((ipo) => {
                const itemIndex = flatItems.findIndex((fi) => fi.id === `ipo_${ipo.id}`);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <button
                    key={ipo.id}
                    type="button"
                    onClick={() => handleSelect(`/ad/ipo?q=${encodeURIComponent(ipo.name)}`)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs group",
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-sm"
                        : "hover:bg-zinc-800/80 text-zinc-200"
                    )}
                  >
                    <div className="min-w-0">
                      <span className={cn("font-medium", isSelected ? "text-white" : "text-zinc-100")}>
                        {ipo.name}
                      </span>
                      <div className={cn("text-[10.5px] font-sans", isSelected ? "text-blue-200" : "text-zinc-400")}>
                        {ipo.company || ipo.category || "Mainboard"} • {ipo.status}
                      </div>
                    </div>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100", isSelected && "opacity-100 text-white")} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Activity Group */}
          {results.activities.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10.5px] font-semibold text-zinc-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-amber-400" />
                <span>Audit Logs ({results.activities.length})</span>
              </div>
              {results.activities.map((act) => {
                const itemIndex = flatItems.findIndex((fi) => fi.id === `act_${act.id}`);
                const isSelected = itemIndex === selectedIndex;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleSelect(`/ad/audit?q=${encodeURIComponent(act.title)}`)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer text-xs group",
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-sm"
                        : "hover:bg-zinc-800/80 text-zinc-200"
                    )}
                  >
                    <div className="min-w-0">
                      <span className={cn("font-medium", isSelected ? "text-white" : "text-zinc-100")}>
                        {act.title}
                      </span>
                      <div className={cn("text-[10.5px] font-sans", isSelected ? "text-blue-200" : "text-zinc-500")}>
                        By @{act.actorUsername}
                      </div>
                    </div>
                    <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100", isSelected && "opacity-100 text-white")} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-[10px]">↑</span>
              <span className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-[10px]">↓</span>
              <span className="font-sans text-zinc-400">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3 text-zinc-400" />
              <span className="font-sans text-zinc-400">Select</span>
            </span>
          </div>

          <span className="text-zinc-400 font-sans">
            {flatItems.length} result{flatItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
