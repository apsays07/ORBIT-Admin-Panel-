"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { GlobalSearchDialog } from "@/components/layout/global-search-dialog";
import { NotificationsPopover } from "@/components/layout/notifications-popover";

interface AdminHeaderProps {
  userEmail?: string;
}

export function AdminHeader({ userEmail = "Ankit" }: AdminHeaderProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut Ctrl + K / Cmd + K to trigger search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dynamic breadcrumb label based on active route
  function getBreadcrumbParts() {
    if (pathname === "/ad" || pathname === "/ad/ipo") return { section: "Workspace", page: "IPO Management" };
    if (pathname.startsWith("/ad/ipo/history")) return { section: "Workspace", page: "IPO History" };
    if (pathname.startsWith("/ad/applications")) return { section: "Workspace", page: "Applications" };
    if (pathname.startsWith("/ad/allotment")) return { section: "Workspace", page: "Allotment" };
    if (pathname.startsWith("/ad/profit") || pathname.startsWith("/ad/distribute-profit")) return { section: "Workspace", page: "Distribute Profit" };
    if (pathname.startsWith("/ad/members")) return { section: "Workspace", page: "Members" };
    if (pathname.startsWith("/ad/performance")) return { section: "Workspace", page: "Performance" };
    if (pathname.startsWith("/ad/audit") || pathname.startsWith("/ad/activity")) return { section: "Workspace", page: "Activity & Audit" };
    if (pathname.startsWith("/ad/profile") || pathname.startsWith("/admin/profile")) return { section: "Account", page: "Admin Profile" };
    if (pathname.startsWith("/ad/security")) return { section: "Workspace", page: "Security" };
    if (pathname.startsWith("/ad/health")) return { section: "Workspace", page: "Database Health" };
    return { section: "Workspace", page: "IPO Management" };
  }

  const { section, page } = getBreadcrumbParts();
  const displayName = userEmail.replace(/god$/i, "") || "Ankit";

  return (
    <>
      <header className="h-14 px-6 sm:px-8 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-30">
        {/* Left: Breadcrumbs indicator */}
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
          <span className="text-[13px] font-medium text-zinc-500 font-sans">
            {section}
          </span>
          <span className="text-[13px] text-zinc-600">/</span>
          <span className="text-[13px] font-semibold text-zinc-200 font-sans tracking-tight">
            {page}
          </span>
        </div>

        {/* Center/Right: Quick Search Trigger + User profile pill */}
        <div className="flex items-center gap-3">
          {/* Global Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 h-8.5 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shadow-xs group"
          >
            <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            <span className="hidden sm:inline font-normal">Search Orbit...</span>
            <div className="flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 ml-1">
              <span>⌘</span>
              <span>K</span>
            </div>
          </button>

          {/* Subtle Session Active Status */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 font-mono shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-300">Session Active</span>
          </div>

          {/* Interactive Notifications Center */}
          <NotificationsPopover />

          {/* User Pill as Link to /ad/profile */}
          <a
            href="/ad/profile"
            title="Open Admin Profile"
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800/90 hover:border-zinc-700 shadow-xs transition-all cursor-pointer"
          >
            <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white text-[10px] font-semibold flex items-center justify-center uppercase">
              {displayName.charAt(0)}
            </div>
            <span className="text-xs font-medium text-zinc-200 capitalize">{displayName}</span>
            <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              Super Admin
            </span>
          </a>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
