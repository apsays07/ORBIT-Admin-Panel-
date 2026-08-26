"use client";

import React, { useState } from "react";
import { SessionRecord, SecurityOverviewData } from "@/types/security";
import { AuditRecord } from "@/types/audit";
import { revokeSession, revokeAllOtherSessions } from "@/lib/security/actions";
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Users,
  Ban,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SecurityManagementViewProps {
  data: SecurityOverviewData;
}

export function SecurityManagementView({ data }: SecurityManagementViewProps) {
  const { metrics, sessions, recentSecurityEvents } = data;
  const [searchQuery, setSearchQuery] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.ipAddress && s.ipAddress.toLowerCase().includes(q)) ||
      (s.deviceName && s.deviceName.toLowerCase().includes(q)) ||
      (s.browser && s.browser.toLowerCase().includes(q)) ||
      (s.os && s.os.toLowerCase().includes(q))
    );
  });

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    setFeedback(null);
    const res = await revokeSession(sessionId);
    setRevokingId(null);
    if (res.success) {
      setFeedback({ type: "success", message: `Session ${sessionId} successfully revoked.` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to revoke session." });
    }
  }

  async function handleRevokeAll() {
    if (!window.confirm("Are you sure you want to revoke all active sessions across all devices?")) {
      return;
    }
    setIsRevokingAll(true);
    setFeedback(null);
    const res = await revokeAllOtherSessions();
    setIsRevokingAll(false);
    if (res.success) {
      setFeedback({ type: "success", message: "All sessions have been revoked." });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to revoke all sessions." });
    }
  }

  function formatTimestamp(ts?: string) {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return ts;
    }
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-100">
              Security
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono tracking-wide">
              {metrics.totalSessionsCount} SESSIONS
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Manage active authenticated sessions, access privileges, and console protection.
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            disabled={isRevokingAll}
            className="h-9 px-3.5 text-xs font-medium border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 cursor-pointer"
          >
            {isRevokingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Ban className="h-3.5 w-3.5 mr-1.5" />
            )}
            Revoke All Sessions
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-900/60 text-emerald-300"
              : "bg-rose-950/40 border-rose-900/60 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 4 Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-sans">
        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">
            ACTIVE SESSIONS
          </span>
          <div className="text-2xl font-semibold text-zinc-100 t-num">
            {metrics.activeSessionsCount}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Across registered devices
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-indigo-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>SUPER ADMINS</span>
            <Users className="h-3.5 w-3.5 text-indigo-400" />
          </span>
          <div className="text-2xl font-semibold text-indigo-300 t-num">
            {metrics.superAdminsCount}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Authoritative console leads
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-rose-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>SECURITY LOGS</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </span>
          <div className="text-2xl font-semibold text-rose-400 t-num">
            {metrics.securityEventsCount}
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Monitored audit events
          </p>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800/80 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] text-emerald-400 uppercase tracking-wider block font-medium flex items-center justify-between">
            <span>PROTECTION LEVEL</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </span>
          <div className="text-2xl font-semibold text-emerald-400">
            Hardened
          </div>
          <p className="text-[11.5px] text-zinc-500 font-sans">
            Multi-layered session guard
          </p>
        </Card>
      </div>

      {/* Active Sessions Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
            <Laptop className="h-4 w-4 text-zinc-400" />
            Authenticated Sessions ({filteredSessions.length})
          </CardTitle>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions by IP, OS, ID..."
              className="pl-8 pr-7 bg-zinc-950 border-zinc-800 text-xs h-8 text-zinc-100 placeholder:text-zinc-500 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No authenticated sessions match your search.
            </div>
          ) : (
            <table className="w-full text-left text-[13px] text-zinc-300">
              <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Device & Client</th>
                  <th className="py-3 px-3 font-mono">IP Address</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Last Active</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredSessions.map((sess: SessionRecord) => {
                  const isRevoked = Boolean(sess.revokedAt);
                  const isActive = Boolean(sess.isActive);

                  return (
                    <tr key={sess.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-zinc-100">
                        <div className="flex items-center gap-2">
                          {sess.deviceType === "mobile" ? (
                            <Smartphone className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <Laptop className="h-4 w-4 text-zinc-500" />
                          )}
                          <div>
                            <div>{sess.deviceName || `${sess.browser || "Web"} · ${sess.os || "Client"}`}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{sess.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-400 font-mono text-xs">
                        {sess.ipAddress || "::1"}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 font-sans text-xs">
                        {formatTimestamp(sess.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-sans text-xs">
                        {formatTimestamp(sess.lastActiveAt || sess.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeSession(sess.id)}
                            disabled={revokingId === sess.id}
                            className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          >
                            {revokingId === sess.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Revoke"
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Recent Security Logs */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/80">
          <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Security & Authentication Audit Trail ({recentSecurityEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-[13px] text-zinc-300">
            <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-3">Event</th>
                <th className="py-3 px-3">Actor / Member</th>
                <th className="py-3 px-4">Client Subtitle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {recentSecurityEvents.map((evt: AuditRecord) => (
                <tr key={evt.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 px-4 text-zinc-400 font-sans text-xs">
                    {formatTimestamp(evt.createdAt || evt.timestamp)}
                  </td>
                  <td className="py-3 px-3 font-sans font-medium text-zinc-100">
                    <span className="px-2 py-0.5 rounded bg-zinc-950 text-indigo-300 border border-zinc-800 text-[11px] font-mono">
                      {evt.eventType || evt.type || "STATUS_CHANGED"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-zinc-300 font-sans font-medium">
                    {evt.actorName || evt.memberName || "System"}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-xs">
                    {evt.subtitle || evt.title || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
