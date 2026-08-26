"use client";

import React from "react";
import Link from "next/link";
import { AuditDetailResponse } from "@/lib/audit/actions";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  User,
  Building,
  Globe,
  ExternalLink,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ActivityDetailViewProps {
  data: AuditDetailResponse;
}

export function ActivityDetailView({ data }: ActivityDetailViewProps) {
  const { activity, targetLink } = data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Link href="/ad/audit">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back to Activity & Audit
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold text-zinc-100 tracking-tight">
                {activity.id}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {activity.eventType || activity.type || "AUDIT_EVENT"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {activity.title || activity.subtitle || "System audit event"}
            </p>
          </div>
        </div>

        <div>
          {activity.isSecurityEvent ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-3.5 w-3.5" />
              Security Event
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              Audit Logged
            </span>
          )}
        </div>
      </div>

      {/* Grid: Actor & Target Resource */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Actor Profile */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-400" />
              Initiating Actor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60 font-mono">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500 font-sans">Actor Name</span>
              <span className="font-semibold text-zinc-100 font-sans">
                {activity.actorName || activity.memberName || "System"}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Username / Handle</span>
              <span className="text-zinc-200">
                {activity.actorUsername ? `@${activity.actorUsername}` : "system"}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Platform Role</span>
              <span className="text-zinc-200 font-sans">{activity.actorRole || "SYSTEM"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Actor User ID</span>
              <span className="text-zinc-400">{activity.actorUserId || activity.userId || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Target Resource */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Building className="h-4 w-4 text-zinc-400" />
              Target Resource
            </CardTitle>
            {targetLink && (
              <Link href={targetLink}>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-400 hover:text-indigo-300 gap-1">
                  <span>Open Resource</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60 font-mono">
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500 font-sans">Resource Type</span>
              <span className="font-semibold text-zinc-100 font-sans">
                {activity.targetType || "SYSTEM"}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Resource Name</span>
              <span className="text-zinc-200 font-sans">
                {activity.targetName || activity.title || "—"}
              </span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Resource ID</span>
              <span className="text-zinc-400">{activity.targetId || "—"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500 font-sans">Event Category</span>
              <span className="text-zinc-300 font-sans">{activity.category || "GENERAL"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request & Client Info */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/80">
          <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-400" />
            Client & Security Context
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans block">Client / IP String</span>
            <div className="text-zinc-200 font-medium">{activity.subtitle || "Direct Server Action"}</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans block">Timestamp</span>
            <div className="text-zinc-200">{activity.createdAt || activity.timestamp || "—"}</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <span className="text-[10px] text-zinc-500 font-sans block">Session / Context</span>
            <div className="text-zinc-400 truncate">{activity.sessionId || activity.loginContext || "ADMIN_SESSION"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Structured JSON Metadata */}
      {activity.metadata && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
              <Code className="h-4 w-4 text-zinc-400" />
              Event Metadata Payload
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Structured JSON attributes captured with this event
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
              {JSON.stringify(activity.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
