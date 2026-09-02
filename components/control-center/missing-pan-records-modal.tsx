"use client";

import React, { useState, useMemo } from "react";
import {
  CreditCard,
  ShieldAlert,
  Search,
  Filter,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Edit2,
  Check,
  Building,
  User,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MissingPanRecord } from "@/types/control-center";
import { updateApplicationPan, updateControlCenterIssueStatus } from "@/lib/control-center/actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface MissingPanRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: MissingPanRecord[];
  availableIpos?: Array<{ id: string; name: string }>;
  onViewApplication360?: (applicationId: string) => void;
  onRecordResolved?: (recordId: string) => void;
  onPanUpdated?: (applicationId: string, newPan: string) => void;
}

type FilterIssueType = "ALL" | "MISSING" | "INVALID_FORMAT" | "INCOMPLETE_LOTS";
type FilterResolution = "UNRESOLVED" | "RESOLVED" | "ALL";

export function MissingPanRecordsModal({
  isOpen,
  onClose,
  records: initialRecords,
  availableIpos = [],
  onViewApplication360,
  onRecordResolved,
  onPanUpdated,
}: MissingPanRecordsModalProps) {
  const toast = useToast();
  const [records, setRecords] = useState<MissingPanRecord[]>(initialRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIpoFilter, setSelectedIpoFilter] = useState("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<FilterIssueType>("ALL");
  const [selectedResolutionFilter, setSelectedResolutionFilter] = useState<FilterResolution>("UNRESOLVED");

  // Inline editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editPanInput, setEditPanInput] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Sync state if initialRecords changes
  React.useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  // Distinct IPO options from availableIpos and records
  const ipoOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableIpos.forEach((i) => {
      if (i.id && i.name) map.set(i.id, i.name);
    });
    records.forEach((r) => {
      if (r.ipoId && r.ipoName) map.set(r.ipoId, r.ipoName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableIpos, records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Resolution status
      if (selectedResolutionFilter === "UNRESOLVED" && r.isResolved) return false;
      if (selectedResolutionFilter === "RESOLVED" && !r.isResolved) return false;

      // IPO filter
      if (selectedIpoFilter !== "ALL" && r.ipoId !== selectedIpoFilter) return false;

      // Issue type filter
      if (selectedTypeFilter !== "ALL" && r.panStatus !== selectedTypeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser =
          r.memberName.toLowerCase().includes(q) ||
          (r.memberUsername && r.memberUsername.toLowerCase().includes(q));
        const matchesIpo = r.ipoName.toLowerCase().includes(q);
        const matchesApp = r.applicationId.toLowerCase().includes(q);
        const matchesPans = r.currentPans.some((p) => p.toLowerCase().includes(q));
        if (!matchesUser && !matchesIpo && !matchesApp && !matchesPans) return false;
      }

      return true;
    });
  }, [records, selectedResolutionFilter, selectedIpoFilter, selectedTypeFilter, searchQuery]);

  // Count active unresolved records
  const activeUnresolvedCount = useMemo(() => {
    return records.filter((r) => !r.isResolved).length;
  }, [records]);

  // Handler: Start editing PAN
  function handleStartEditPan(record: MissingPanRecord) {
    setEditingRecordId(record.id);
    setEditPanInput(record.currentPans[0] || "");
  }

  // Handler: Save PAN edit
  async function handleSavePan(record: MissingPanRecord) {
    const cleanPan = editPanInput.trim().toUpperCase();
    if (!cleanPan) {
      toast.showToast("error", "Invalid Input", "Please enter a valid PAN card number.");
      return;
    }

    if (cleanPan.startsWith("XUSER")) {
      toast.showToast(
        "error",
        "Placeholder PAN Not Allowed",
        "Values starting with 'XUSER' are dummy placeholders. Please provide a genuine 10-character PAN card."
      );
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      toast.showToast(
        "error",
        "Invalid PAN Format",
        "PAN must follow the standard 10-character format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)."
      );
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await updateApplicationPan({
        applicationId: record.applicationId,
        panNumbers: [cleanPan],
        markResolved: true,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to update PAN.");
      }

      // Optimistic update in local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                currentPans: [cleanPan],
                isResolved: true,
                panStatusLabel: "Resolved (Updated)",
              }
            : r
        )
      );

      setEditingRecordId(null);
      setEditPanInput("");
      toast.showToast("success", "PAN Card Updated & Verified", `PAN for @${record.memberUsername || record.memberName} updated to ${cleanPan}.`);

      if (onPanUpdated) {
        onPanUpdated(record.applicationId, cleanPan);
      }
      if (onRecordResolved) {
        onRecordResolved(record.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving PAN.";
      toast.showToast("error", "Update Failed", msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  // Handler: Mark as Resolved
  async function handleMarkResolved(record: MissingPanRecord) {
    try {
      const issueId = `issue_missing_pan_${record.applicationId}`;
      const res = await updateControlCenterIssueStatus({
        issueId,
        status: "RESOLVED",
        actionTaken: "Admin verified and marked resolved from Missing PAN Viewer",
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to mark resolved");
      }

      setRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, isResolved: true, panStatusLabel: "Resolved" }
            : r
        )
      );

      toast.showToast("success", "Marked as Resolved", `Record for ${record.memberName} marked as resolved.`);

      if (onRecordResolved) {
        onRecordResolved(record.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error marking resolved.";
      toast.showToast("error", "Action Failed", msg);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-xs">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-zinc-100 font-mono tracking-tight uppercase">
                  Missing PAN Records
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-semibold">
                  {activeUnresolvedCount} Unresolved
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Review application filings requiring PAN cards. System placeholder values starting with{" "}
                <span className="text-zinc-200 font-mono font-semibold">XUSER</span> are automatically excluded.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-zinc-850 bg-zinc-900/30 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username, member name, IPO, or PAN..."
                className="pl-9 h-9 text-xs bg-zinc-900/90 border-zinc-800 text-zinc-200 font-mono rounded-lg focus:border-purple-500/50"
              />
            </div>

            {/* IPO Dropdown Filter */}
            <select
              value={selectedIpoFilter}
              onChange={(e) => setSelectedIpoFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-300 font-mono focus:border-purple-500/50 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All IPO Offerings</option>
              {ipoOptions.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.name}
                </option>
              ))}
            </select>

            {/* Resolution Filter */}
            <select
              value={selectedResolutionFilter}
              onChange={(e) => setSelectedResolutionFilter(e.target.value as FilterResolution)}
              className="h-9 px-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-300 font-mono focus:border-purple-500/50 focus:outline-hidden cursor-pointer"
            >
              <option value="UNRESOLVED">Unresolved Only ({activeUnresolvedCount})</option>
              <option value="RESOLVED">Resolved Only</option>
              <option value="ALL">All Records ({records.length})</option>
            </select>
          </div>

          {/* Issue Type Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mr-1">
              Type:
            </span>
            {(["ALL", "MISSING", "INVALID_FORMAT", "INCOMPLETE_LOTS"] as FilterIssueType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedTypeFilter(type)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-mono text-[11px] transition-all cursor-pointer border",
                  selectedTypeFilter === type
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-200 font-semibold"
                    : "bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {type === "ALL"
                  ? "All Issues"
                  : type === "MISSING"
                  ? "Missing PAN"
                  : type === "INVALID_FORMAT"
                  ? "Invalid Format"
                  : "Incomplete Lots"}
              </button>
            ))}
          </div>
        </div>

        {/* Content / Records List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 divide-y divide-zinc-850/50">
          {filteredRecords.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center justify-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-zinc-100 font-mono">
                No Missing PAN Records Found
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm">
                {selectedResolutionFilter === "UNRESOLVED"
                  ? "All application filings in this view have verified, genuine PAN card records. Any placeholder XUSER PANs are excluded."
                  : "No records matching your search and filter criteria."}
              </p>
            </div>
          ) : (
            filteredRecords.map((record, index) => (
              <div
                key={record.id}
                className={cn(
                  "pt-3.5 first:pt-0 rounded-xl transition-all",
                  record.isResolved ? "opacity-60" : "opacity-100"
                )}
              >
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 space-y-3">
                  {/* Card Top: Serial # + Member + Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        #{index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-bold text-zinc-100 font-mono">
                          {record.memberUsername ? `@${record.memberUsername}` : record.memberName}
                        </span>
                        {record.memberUsername && (
                          <span className="text-xs text-zinc-400 font-sans">
                            ({record.memberName})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.panStatus === "MISSING" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-mono font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          PAN: Missing
                        </span>
                      )}
                      {record.panStatus === "INVALID_FORMAT" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-mono font-semibold inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Invalid Format
                        </span>
                      )}
                      {record.panStatus === "INCOMPLETE_LOTS" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[11px] font-mono font-semibold inline-flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {record.panStatusLabel}
                        </span>
                      )}
                      {record.isResolved && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10.5px] font-mono">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Details: IPO + Applied Lots + Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-850/80 font-mono">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Building className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-zinc-500 font-sans">IPO:</span>
                      <span className="font-semibold truncate">{record.ipoName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Layers className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-zinc-500 font-sans">Applied Lots:</span>
                      <span className="font-semibold text-purple-300">{record.appliedLots}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-500 font-sans">Added:</span>
                      <span>{new Date(record.dateAdded).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Action Required Prompt */}
                  <div className="text-xs text-zinc-400 flex items-start gap-1.5 pl-1">
                    <span className="text-amber-400 font-bold">Action Required:</span>
                    <span>{record.actionRequired}</span>
                  </div>

                  {/* Inline PAN Editor (If Active) */}
                  {editingRecordId === record.id && (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-purple-500/40 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono font-semibold text-purple-300">
                          Enter 10-Character Valid PAN:
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Excludes &apos;XUSER&apos; placeholder
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={editPanInput}
                          onChange={(e) => setEditPanInput(e.target.value.toUpperCase())}
                          placeholder="e.g. ABCDE1234F"
                          maxLength={10}
                          className="h-8 text-xs font-mono tracking-widest bg-zinc-900 border-zinc-700 text-zinc-100 uppercase"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          disabled={isSubmittingEdit}
                          onClick={() => handleSavePan(record)}
                          className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-mono px-3 cursor-pointer"
                        >
                          {isSubmittingEdit ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          Save PAN
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecordId(null)}
                          className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Card Bottom: Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/40">
                    <span className="text-[11px] font-mono text-zinc-500 truncate">
                      App ID: {record.applicationId}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Action 1: View Application */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (onViewApplication360) {
                            onViewApplication360(record.applicationId);
                          }
                        }}
                        className="h-7 text-xs font-mono text-purple-300 hover:text-purple-200 hover:bg-purple-500/15 px-2.5 rounded-lg cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>[ View Application → ]</span>
                      </Button>

                      {/* Action 2: Edit PAN */}
                      {!record.isResolved && editingRecordId !== record.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditPan(record)}
                          className="h-7 text-xs font-mono border-zinc-750 hover:bg-zinc-800 text-zinc-200 px-2.5 rounded-lg cursor-pointer inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit PAN</span>
                        </Button>
                      )}

                      {/* Action 3: Mark as Resolved */}
                      {!record.isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkResolved(record)}
                          className="h-7 text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2.5 rounded-lg cursor-pointer inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Mark Resolved</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-900/40 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-500">
            Showing {filteredRecords.length} of {records.length} records
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 cursor-pointer"
          >
            Close Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}
