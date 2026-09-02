"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp,
  History,
  FileSpreadsheet,
  PieChart,
  Coins,
  Users,
  Trophy,
  MessageSquare,
  Activity,
  Shield,
  ShieldAlert,
  Plus,
  LogOut,
  Database,
  UserCircle,
} from "lucide-react";
import { logoutAdmin } from "@/lib/auth/actions";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/ui/member-avatar";
import dynamic from "next/dynamic";

const IpoModal = dynamic(
  () => import("@/components/ipo/ipo-modal").then((m) => m.IpoModal),
  { ssr: false }
);

interface AdminSidebarProps {
  userEmail?: string;
  dbStatus?: string;
}

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: string;
}

export const navItems: NavItem[] = [
  { name: "IPO Management", href: "/ad/ipo", icon: TrendingUp, active: true },
  { name: "IPO Control Center", href: "/ad/control-center", icon: ShieldAlert, active: true },
  { name: "IPO History", href: "/ad/ipo/history", icon: History, active: true },
  { name: "Applications", href: "/ad/applications", icon: FileSpreadsheet, active: true },
  { name: "Allotment", href: "/ad/allotment", icon: PieChart, active: true },
  { name: "Distribute Profit", href: "/ad/profit", icon: Coins, active: true },
  { name: "Members", href: "/ad/members", icon: Users, active: true },
  { name: "Performance", href: "/ad/performance", icon: Trophy, active: true },
  { name: "Activity & Audit", href: "/ad/audit", icon: Activity, active: true },
  { name: "Security", href: "/ad/security", icon: Shield, active: true },
  { name: "Admin Profile", href: "/ad/profile", icon: UserCircle, active: true },
  { name: "Database Health", href: "/ad/health", icon: Database, active: true },
];

export function AdminSidebar({ userEmail = "ankitgod", dbStatus = "connected" }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-300 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
          <span className="font-bold tracking-tight text-sm text-zinc-100 font-sans">ORBIT</span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono tracking-wide">
          ADMIN
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 pt-3.5 pb-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/ad/ipo"
              ? pathname === "/ad" || pathname === "/ad/ipo"
              : item.href !== "#" && pathname.startsWith(item.href);
          const Icon = item.icon;

          if (!item.active) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium text-zinc-600 opacity-60 cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-zinc-600" />
                  <span>{item.name}</span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              onMouseEnter={() => {
                if (item.href && item.href !== "#") {
                  router.prefetch(item.href);
                }
              }}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-zinc-900 text-zinc-100 font-medium shadow-xs border border-zinc-800"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 font-normal"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("h-4 w-4", isActive ? "text-zinc-100" : "text-zinc-500")} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="p-3.5 border-t border-zinc-900 space-y-2.5 bg-zinc-950">
        {/* + Add IPO Button */}
        <Button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer tracking-tight"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add IPO</span>
        </Button>

        {/* Database Status indicator */}
        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5">
            <Database className="h-3 w-3 text-zinc-500" />
            <span>nexo</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans font-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {dbStatus}
          </span>
        </div>

        {/* User Card */}
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded-xl border transition-colors",
            pathname.startsWith("/ad/profile")
              ? "bg-zinc-900 border-zinc-700/80 shadow-xs"
              : "bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800/80"
          )}
        >
          <Link
            href="/ad/profile"
            title="Open Admin Profile"
            className="flex items-center gap-2.5 overflow-hidden flex-1 group cursor-pointer"
          >
            <MemberAvatar
              src="/api/upload?id=avatar_mem_admin_1786913600932"
              name={userEmail}
              className="h-7 w-7 rounded-lg text-xs shrink-0 group-hover:ring-2 group-hover:ring-blue-500/40 transition-all"
            />
            <div className="truncate">
              <p className="text-[13px] font-medium text-zinc-200 group-hover:text-zinc-100 capitalize truncate transition-colors">
                {userEmail.replace(/god$/i, "") || "Ankit"}
              </p>
              <p className="text-[10px] text-zinc-500 font-sans">Super Admin</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Add IPO Modal triggered from Sidebar */}
      {isAddModalOpen && (
        <IpoModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </aside>
  );
}
