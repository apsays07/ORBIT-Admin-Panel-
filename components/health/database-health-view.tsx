"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DatabaseHealthReport,
  DatabaseIntegrityIssue,
  IssueSeverity,
  IssueCategory,
} from "@/types/health";
import { repairDatabaseIssue } from "@/lib/health/actions";
import { useToast } from "@/components/ui/toast";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Layers,
  Wrench,
  ShieldCheck,
  Activity,
  HardDrive,
  Users,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { usePersistentSelect } from "@/lib/hooks/use-persistent-select";

interface DatabaseHealthViewProps {
  initialReport: DatabaseHealthReport;
}

export function DatabaseHealthView({ initialReport }: DatabaseHealthViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [report, setReport] = useState<DatabaseHealthReport>(initialReport);
  const [isPending, startTransition] = useTransition();
  const [repairingIssueId, setRepairingIssueId] = useState<string | null>(null);

  // Filters with persistence
  const [selectedSeverity, setSelectedSeverity] = usePersistentSelect<string>({
    key: "orbit_health_severity_filter",
    initialValue: "ALL",
  });
  const [selectedType, setSelectedType] = usePersistentSelect<string>({
    key: "orbit_health_type_filter",
    initialValue: "ALL",
  });

  function handleRefreshAudit() {
    startTransition(() => {
      router.refresh();
      toast.info("Integrity Audit Running", "Re-scanning MongoDB collections and relationships...");
    });
  }

  async function handleRepair(issue: DatabaseIntegrityIssue) {
    if (!issue.suggestedAction) return;

    setRepairingIssueId(issue.id);
    try {
      const res = await repairDatabaseIssue(issue.id, issue.suggestedAction);
      if (res.success) {
        toast.success("Database Reconciled", res.message || "Successfully repaired integrity issue.");
        // Remove issue from state
        setReport((prev) => ({
          ...prev,
          totalIssues: Math.max(0, prev.totalIssues - 1),
          criticalIssues: issue.severity === "CRITICAL" ? Math.max(0, prev.criticalIssues - 1) : prev.criticalIssues,
          warningIssues: issue.severity === "WARNING" ? Math.max(0, prev.warningIssues - 1) : prev.warningIssues,
          consistencyErrorsCount: issue.issueType === "MISMATCH" ? Math.max(0, prev.consistencyErrorsCount - 1) : prev.consistencyErrorsCount,
          issues: prev.issues.filter((i) => i.id !== issue.id),
        }));
      } else {
        toast.error("Repair Failed", res.error || "Could not complete automated repair.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Repair execution failed.";
      toast.error("Error", msg);
    } finally {
      setRepairingIssueId(null);
    }
  }

  const filteredIssues = report.issues.filter((issue) => {
    if (selectedSeverity !== "ALL" && issue.severity !== selectedSeverity) return false;
    if (selectedType !== "ALL" && issue.issueType !== selectedType) return false;
    return true;
  });

  const isHealthy = report.status === "CONNECTED" && report.criticalIssues === 0;

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-zinc-100">
              Database Health & Data Integrity
            </h1>
            <span
              className={cn(
                "px-2.5 py-0.5 text-[10px] font-semibold rounded-md border tracking-wide font-mono flex items-center gap-1.5",
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", isHealthy ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
              {isHealthy ? "HEALTHY" : "ATTENTION"}
            </span>
          </div>
          <p className="text-[13.5px] text-zinc-400 font-normal mt-1 leading-relaxed">
            Real-time referential integrity auditor, foreign key checks, duplicate detection, and schema reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 font-mono shadow-xs">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ping: <strong className="text-zinc-200 font-semibold">{report.pingLatencyMs >= 0 ? `${report.pingLatencyMs}ms` : "N/A"}</strong></span>
          </div>

          <Button
            onClick={handleRefreshAudit}
            disabled={isPending}
            className="h-9 px-3.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin text-emerald-400")} />
            <span>{isPending ? "Auditing..." : "Re-Scan Database"}</span>
          </Button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-sans">
        {/* Card 1: Connection */}
        <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-1 rounded-2xl shadow-xs backdrop-blur-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-blue-400" />
            DATABASE STATUS
          </span>
          <div className="text-xl font-bold text-zinc-100 font-mono flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", report.status === "CONNECTED" ? "bg-emerald-400" : "bg-rose-400")} />
            {report.status}
          </div>
          <p className="text-[11.5px] text-zinc-400 mt-0.5 font-mono">
            {report.dbName || "MongoDB Primary"}
          </p>
        </Card>

        {/* Card 2: Integrity Status */}
        <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-1 rounded-2xl shadow-xs backdrop-blur-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            DATA INTEGRITY
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {report.criticalIssues === 0 ? "Healthy" : `${report.criticalIssues} Critical`}
          </div>
          <p className="text-[11.5px] text-zinc-400 mt-0.5">
            {report.totalIssues} total flag(s)
          </p>
        </Card>

        {/* Card 3: Orphaned Records */}
        <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-1 rounded-2xl shadow-xs backdrop-blur-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
            ORPHANED RECORDS
          </span>
          <div className={cn("text-xl font-bold font-mono", report.orphanedRecordsCount === 0 ? "text-zinc-100" : "text-rose-400")}>
            {report.orphanedRecordsCount}
          </div>
          <p className="text-[11.5px] text-zinc-400 mt-0.5">
            Missing parent pointers
          </p>
        </Card>

        {/* Card 4: Duplicate Records */}
        <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-1 rounded-2xl shadow-xs backdrop-blur-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            DUPLICATE RECORDS
          </span>
          <div className={cn("text-xl font-bold font-mono", report.duplicateRecordsCount === 0 ? "text-zinc-100" : "text-amber-400")}>
            {report.duplicateRecordsCount}
          </div>
          <p className="text-[11.5px] text-zinc-400 mt-0.5">
            Unique key collisions
          </p>
        </Card>

        {/* Card 5: Consistency Errors */}
        <Card className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-1 rounded-2xl shadow-xs backdrop-blur-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-indigo-400" />
            CONSISTENCY ERRORS
          </span>
          <div className={cn("text-xl font-bold font-mono", report.consistencyErrorsCount === 0 ? "text-zinc-100" : "text-indigo-400")}>
            {report.consistencyErrorsCount}
          </div>
          <p className="text-[11.5px] text-zinc-400 mt-0.5">
            Calculated vs stored
          </p>
        </Card>
      </div>

      {/* Collection Health Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200 tracking-tight flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-zinc-400" />
          <span>MongoDB Collections & Indexes</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {report.collections.map((col) => (
            <Card
              key={col.name}
              className="bg-zinc-900/40 border-zinc-800/80 p-3.5 rounded-2xl flex flex-col justify-between space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-zinc-200 truncate">
                  {col.name}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                    col.status === "HEALTHY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}
                >
                  {col.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans text-zinc-400 pt-1 border-t border-zinc-800/60">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Docs</span>
                  <span className="font-mono font-semibold text-zinc-200">{col.documentCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Indexes</span>
                  <span className="font-mono font-semibold text-zinc-200">{col.indexesCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Issues & Integrity Audit Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/70 p-3 rounded-2xl border border-zinc-800 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-semibold text-zinc-200">
              Audit Findings ({filteredIssues.length})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="h-9 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings</option>
              <option value="INFO">Info</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3 text-xs font-medium text-zinc-200 focus:outline-hidden hover:border-zinc-700 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              <option value="ORPHAN">Orphans</option>
              <option value="DUPLICATE">Duplicates</option>
              <option value="MISMATCH">Mismatches</option>
              <option value="FORMAT_ERROR">Format Errors</option>
              <option value="MISSING_FIELD">Missing Fields</option>
            </select>
          </div>
        </div>

        {/* Issues List / Empty State */}
        {filteredIssues.length === 0 ? (
          <Card className="bg-zinc-900/40 border-zinc-800/80 p-8 rounded-2xl text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-zinc-200">Zero Integrity Issues Found</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                All foreign-key relationships, unique constraints, participant sums, and indexes across MongoDB are fully synchronized and authoritative.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const isRepairing = repairingIssueId === issue.id;

              return (
                <Card
                  key={issue.id}
                  className={cn(
                    "bg-zinc-900/50 border p-4 rounded-2xl space-y-3 transition-colors shadow-xs backdrop-blur-xs",
                    issue.severity === "CRITICAL"
                      ? "border-rose-500/30 hover:border-rose-500/50"
                      : issue.severity === "WARNING"
                      ? "border-amber-500/30 hover:border-amber-500/50"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                          issue.severity === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : issue.severity === "WARNING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        )}
                      >
                        {issue.severity === "CRITICAL" ? (
                          <AlertOctagon className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide border",
                              issue.severity === "CRITICAL"
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                : issue.severity === "WARNING"
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            )}
                          >
                            {issue.severity}
                          </span>

                          <span className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-mono text-[10.5px]">
                            {issue.entity}: {issue.recordId}
                          </span>

                          <span className="text-[11px] font-mono text-zinc-500">
                            {issue.issueType}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-zinc-100">{issue.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{issue.problem}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      {issue.repairable && issue.suggestedAction === "REPAIR_RECONCILE" ? (
                        <Button
                          size="sm"
                          onClick={() => handleRepair(issue)}
                          disabled={isRepairing}
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 shadow-xs cursor-pointer font-medium"
                        >
                          <Wrench className={cn("h-3.5 w-3.5", isRepairing && "animate-spin")} />
                          <span>{isRepairing ? "Reconciling..." : "Reconcile Database"}</span>
                        </Button>
                      ) : (
                        <span className="text-[11.5px] font-mono text-zinc-500 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                          {issue.suggestedAction || "MANUAL_REVIEW"}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
