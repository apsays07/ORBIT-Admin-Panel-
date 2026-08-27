"use client";

import React, { useState, useEffect } from "react";
import {
  MemberOption,
  IpoSelectOption,
  getMembersForSelection,
  getIposForSelection,
  createSoloApplicationsBatch,
  createMultiFriendApplicationsBatch,
} from "@/lib/application/actions";
import { isValidPan, cn } from "@/lib/utils";
import { ApplicationRecord } from "@/types/application";
import { useToast } from "@/components/ui/toast";
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Coins,
  CheckCircle2,
  Building,
  User,
  Users,
  Layers,
} from "lucide-react";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberSelectDropdown } from "@/components/ui/member-select-dropdown";

interface ApplicationRowState {
  id: string;
  memberId: string;
  panNumber: string;
  amount: string;
}

interface MultiFriendAppGroup {
  id: string;
  contributors: ApplicationRowState[];
}

interface CreateSoloApplicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIpoId?: string;
  onCreated: (createdApps: ApplicationRecord[]) => void;
}

export function CreateSoloApplicationsModal({
  isOpen,
  onClose,
  defaultIpoId,
  onCreated,
}: CreateSoloApplicationsModalProps) {
  const toast = useToast();

  const [fundingMode, setFundingMode] = useState<"SOLO" | "MULTI_FRIEND">("SOLO");
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [ipos, setIpos] = useState<IpoSelectOption[]>([]);
  const [selectedIpoId, setSelectedIpoId] = useState<string>(defaultIpoId || "");
  const [loadingData, setLoadingData] = useState(true);

  // Solo mode rows
  const [soloRows, setSoloRows] = useState<ApplicationRowState[]>([
    { id: "s_1", memberId: "", panNumber: "", amount: "" },
  ]);
  const [batchCountInput, setBatchCountInput] = useState<string>("1");
  const [soloErrors, setSoloErrors] = useState<Record<number, string>>({});

  // Multi-friend applications batch list
  const [multiApps, setMultiApps] = useState<MultiFriendAppGroup[]>([
    {
      id: "mf_app_1",
      contributors: [
        { id: "mf_1_1", memberId: "", panNumber: "", amount: "" },
        { id: "mf_1_2", memberId: "", panNumber: "", amount: "" },
      ],
    },
  ]);
  const [multiErrors, setMultiErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Keyboard and focus lifecycle handling
  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    isSubmitting,
  });

  // Fetch real database members and IPOs on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadOptions() {
      setLoadingData(true);
      try {
        const [memberList, ipoList] = await Promise.all([
          getMembersForSelection(),
          getIposForSelection(),
        ]);
        if (isMounted) {
          setMembers(memberList);
          setIpos(ipoList);

          if (defaultIpoId && ipoList.some((i) => i.id === defaultIpoId)) {
            setSelectedIpoId(defaultIpoId);
          } else {
            const openIpo = ipoList.find(
              (i) => i.status === "APPLICATION_OPEN" || i.status === "OPEN"
            );
            setSelectedIpoId(openIpo ? openIpo.id : ipoList[0]?.id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load options for application modal", err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    loadOptions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultIpoId]);

  const selectedIpo = ipos.find((i) => i.id === selectedIpoId);
  const defaultIpoAmount = selectedIpo?.minInvestment ? String(selectedIpo.minInvestment) : "15000";

  // Set default amounts when IPO changes
  useEffect(() => {
    if (selectedIpo) {
      const defAmt = String(selectedIpo.minInvestment || 15000);
      const minInv = selectedIpo.minInvestment || 15000;
      setSoloRows((prev) =>
        prev.map((r) => ({
          ...r,
          amount: r.amount ? r.amount : defAmt,
        }))
      );
      setMultiApps((prev) =>
        prev.map((app) => ({
          ...app,
          contributors: autoBalanceContributors(app.contributors, minInv),
        }))
      );
    }
  }, [selectedIpoId]);

  // ----------------------------------------------------
  // SOLO ROW OPERATIONS
  // ----------------------------------------------------
  function handleSetSoloRowsCount(count: number) {
    if (isNaN(count) || count <= 0) return;
    const safeCount = Math.max(1, Math.min(count, 100));
    const now = Date.now();

    setSoloRows((prev) => {
      if (prev.length === safeCount) return prev;
      if (prev.length < safeCount) {
        const toAdd = safeCount - prev.length;
        const newItems: ApplicationRowState[] = Array.from({ length: toAdd }).map((_, i) => ({
          id: "s_" + now + "_" + i + "_" + Math.random().toString(36).substring(2, 6),
          memberId: "",
          panNumber: "",
          amount: defaultIpoAmount,
        }));
        return [...prev, ...newItems];
      } else {
        return prev.slice(0, safeCount);
      }
    });
    setSoloErrors({});
  }

  function handleResetSoloToOne() {
    setSoloRows([{ id: "s_1", memberId: "", panNumber: "", amount: defaultIpoAmount }]);
    setBatchCountInput("1");
    setSoloErrors({});
  }

  function handleRemoveSoloRow(index: number) {
    if (soloRows.length <= 1) return;
    setSoloRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setBatchCountInput(String(next.length));
      return next;
    });
    setSoloErrors({});
  }

  function handleSoloMemberChange(index: number, memberId: string) {
    const member = members.find((m) => m.id === memberId);
    setSoloRows((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const autoPan = member?.panFull || member?.panMasked || current.panNumber;
      updated[index] = {
        ...current,
        memberId,
        panNumber: autoPan || "",
      };
      return updated;
    });

    if (soloErrors[index]) {
      setSoloErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  }

  function handleSoloPanChange(index: number, pan: string) {
    const cleanPan = pan.toUpperCase();
    setSoloRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], panNumber: cleanPan };
      return updated;
    });

    if (soloErrors[index]) {
      setSoloErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  }

  // ----------------------------------------------------
  // MULTI-FRIEND BATCH OPERATIONS
  // ----------------------------------------------------
  function autoBalanceContributors(
    contributors: ApplicationRowState[],
    minInv: number,
    editedIndex?: number,
    newAmountStr?: string
  ): ApplicationRowState[] {
    const list = [...contributors];
    if (list.length === 0) return list;

    const targetMin = minInv > 0 ? minInv : 15000;
    const lastIdx = list.length - 1;

    if (editedIndex !== undefined && newAmountStr !== undefined) {
      if (editedIndex === lastIdx) {
        // Direct edit to the last box
        if (newAmountStr === "") {
          list[lastIdx] = { ...list[lastIdx], amount: "" };
        } else {
          const numVal = parseFloat(newAmountStr);
          if (isNaN(numVal)) {
            list[lastIdx] = { ...list[lastIdx], amount: newAmountStr };
          } else {
            const sumOthers = list
              .slice(0, lastIdx)
              .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
            const maxForLast = Math.max(0, targetMin - sumOthers);
            const cappedVal = Math.min(numVal, maxForLast);
            list[lastIdx] = { ...list[lastIdx], amount: String(cappedVal) };
          }
        }
        return list;
      } else {
        // Edit to a non-last box
        if (newAmountStr === "") {
          list[editedIndex] = { ...list[editedIndex], amount: "" };
        } else {
          const numVal = parseFloat(newAmountStr);
          if (isNaN(numVal)) {
            list[editedIndex] = { ...list[editedIndex], amount: newAmountStr };
          } else {
            const sumOtherNonLast = list
              .slice(0, lastIdx)
              .reduce((s, c, idx) => (idx === editedIndex ? s : s + (parseFloat(c.amount) || 0)), 0);
            const maxAllowed = Math.max(0, targetMin - sumOtherNonLast);
            const cappedVal = Math.min(numVal, maxAllowed);
            list[editedIndex] = { ...list[editedIndex], amount: String(cappedVal) };
          }
        }
      }
    }

    // Automatically calculate the remaining value for the last box
    if (list.length > 1) {
      const sumNonLast = list
        .slice(0, lastIdx)
        .reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const remainingForLast = Math.max(0, targetMin - sumNonLast);
      list[lastIdx] = {
        ...list[lastIdx],
        amount: remainingForLast > 0 ? String(remainingForLast) : (sumNonLast >= targetMin ? "0" : ""),
      };
    } else if (list.length === 1 && editedIndex === undefined) {
      list[0] = { ...list[0], amount: String(targetMin) };
    }

    return list;
  }

  function handleAddMultiApp() {
    const now = Date.now();
    const minInv = selectedIpo?.minInvestment || 15000;
    const defaultLeadAmt = String(Math.round(minInv / 2));
    const newApp: MultiFriendAppGroup = {
      id: "mf_app_" + now + "_" + Math.random().toString(36).substring(2, 6),
      contributors: autoBalanceContributors([
        { id: "mf_" + now + "_1", memberId: "", panNumber: "", amount: defaultLeadAmt },
        { id: "mf_" + now + "_2", memberId: "", panNumber: "", amount: "" },
      ], minInv),
    };
    setMultiApps((prev) => [...prev, newApp]);
  }

  function handleRemoveMultiApp(appIdx: number) {
    if (multiApps.length <= 1) return;
    setMultiApps((prev) => prev.filter((_, i) => i !== appIdx));
    setMultiErrors({});
  }

  function handleAddFriendToApp(appIdx: number) {
    const now = Date.now();
    const minInv = selectedIpo?.minInvestment || 15000;
    setMultiApps((prev) => {
      const next = [...prev];
      const target = next[appIdx];
      const newFriend: ApplicationRowState = {
        id: "mf_" + now + "_" + Math.random().toString(36).substring(2, 6),
        memberId: "",
        panNumber: "",
        amount: "",
      };
      const updatedContributors = autoBalanceContributors([...target.contributors, newFriend], minInv);
      next[appIdx] = {
        ...target,
        contributors: updatedContributors,
      };
      return next;
    });
  }

  function handleRemoveFriendFromApp(appIdx: number, friendIdx: number) {
    const minInv = selectedIpo?.minInvestment || 15000;
    setMultiApps((prev) => {
      const next = [...prev];
      const target = next[appIdx];
      if (target.contributors.length <= 1) return prev;
      const remaining = target.contributors.filter((_, i) => i !== friendIdx);
      const balanced = autoBalanceContributors(remaining, minInv);
      next[appIdx] = {
        ...target,
        contributors: balanced,
      };
      return next;
    });
    setMultiErrors({});
  }

  function handleMultiMemberChange(appIdx: number, friendIdx: number, memberId: string) {
    const member = members.find((m) => m.id === memberId);
    setMultiApps((prev) => {
      const next = [...prev];
      const target = next[appIdx];
      const contribs = [...target.contributors];
      const current = contribs[friendIdx];
      const autoPan = member?.panFull || member?.panMasked || current.panNumber;
      contribs[friendIdx] = {
        ...current,
        memberId,
        panNumber: autoPan || "",
      };
      next[appIdx] = { ...target, contributors: contribs };
      return next;
    });

    const errKey = `${appIdx}_${friendIdx}`;
    if (multiErrors[errKey]) {
      setMultiErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  }

  function handleMultiPanChange(appIdx: number, friendIdx: number, pan: string) {
    const cleanPan = pan.toUpperCase();
    setMultiApps((prev) => {
      const next = [...prev];
      const target = next[appIdx];
      const contribs = [...target.contributors];
      contribs[friendIdx] = { ...contribs[friendIdx], panNumber: cleanPan };
      next[appIdx] = { ...target, contributors: contribs };
      return next;
    });

    const errKey = `${appIdx}_${friendIdx}`;
    if (multiErrors[errKey]) {
      setMultiErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  }

  function handleMultiAmountChange(appIdx: number, friendIdx: number, amount: string) {
    const minInv = selectedIpo?.minInvestment || 15000;
    setMultiApps((prev) => {
      const next = [...prev];
      const target = next[appIdx];
      const balancedContribs = autoBalanceContributors(target.contributors, minInv, friendIdx, amount);
      next[appIdx] = { ...target, contributors: balancedContribs };
      return next;
    });

    const errKey = `${appIdx}_${friendIdx}`;
    if (multiErrors[errKey]) {
      setMultiErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  }

  // Calculate totals
  const soloTotalCapital = soloRows.reduce((sum, r) => {
    const amt = parseFloat(r.amount) || selectedIpo?.minInvestment || 15000;
    return sum + amt;
  }, 0);

  const multiTotalCapital = multiApps.reduce((appSum, app) => {
    const appContrib = app.contributors.reduce(
      (cSum, c) => cSum + (parseFloat(c.amount) || 0),
      0
    );
    return appSum + appContrib;
  }, 0);

  const totalMultiContributorsCount = multiApps.reduce(
    (sum, a) => sum + a.contributors.length,
    0
  );

  // ----------------------------------------------------
  // SUBMISSION HANDLER
  // ----------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedIpoId) {
      setFormError("Please select a target IPO Offering.");
      return;
    }

    if (fundingMode === "SOLO") {
      setSoloErrors({});
      const newErrors: Record<number, string> = {};
      const seenPans = new Set<string>();

      soloRows.forEach((row, idx) => {
        if (!row.memberId) {
          newErrors[idx] = "Please select an applicant member.";
          return;
        }
        if (!row.panNumber.trim()) {
          newErrors[idx] = "PAN Card is required.";
          return;
        }
        if (!isValidPan(row.panNumber)) {
          newErrors[idx] = "Invalid PAN format (e.g. ABCDE1234F).";
          return;
        }
        const upperPan = row.panNumber.trim().toUpperCase();
        if (seenPans.has(upperPan)) {
          newErrors[idx] = `Duplicate PAN ${upperPan} in this batch.`;
          return;
        }
        seenPans.add(upperPan);
      });

      if (Object.keys(newErrors).length > 0) {
        setSoloErrors(newErrors);
        setFormError("Please correct the flagged errors in the table rows.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          ipoId: selectedIpoId,
          applications: soloRows.map((r) => ({
            memberId: r.memberId,
            panNumber: r.panNumber.trim().toUpperCase(),
            amount: r.amount ? parseFloat(r.amount) : undefined,
          })),
        };

        const res = await createSoloApplicationsBatch(payload);

        if (!res.success) {
          if (res.errorsByRow) setSoloErrors(res.errorsByRow);
          setFormError(res.error || "Failed to create solo applications.");
          return;
        }

        toast.success(
          `Successfully created ${res.count || soloRows.length} solo application(s) for ${selectedIpo?.name || "IPO"}.`
        );

        if (res.createdApplications && res.createdApplications.length > 0) {
          onCreated(res.createdApplications);
        }

        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit batch application.";
        setFormError(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // MULTI_FRIEND BATCH MODE
      setMultiErrors({});
      const newErrors: Record<string, string> = {};
      const seenPans = new Set<string>();

      multiApps.forEach((app, appIdx) => {
        const lead = app.contributors[0];
        if (!lead || !lead.memberId) {
          newErrors[`${appIdx}_0`] = "Primary Lead member is required.";
        }
        if (!lead || !lead.panNumber.trim() || !isValidPan(lead.panNumber)) {
          newErrors[`${appIdx}_0`] = "Valid Primary Filing PAN Card is required (e.g. ABCDE1234F).";
        } else {
          const uPan = lead.panNumber.trim().toUpperCase();
          if (seenPans.has(uPan)) {
            newErrors[`${appIdx}_0`] = `Duplicate PAN ${uPan} used in multiple applications.`;
          }
          seenPans.add(uPan);
        }

        app.contributors.forEach((c, cIdx) => {
          if (!c.memberId) {
            newErrors[`${appIdx}_${cIdx}`] = "Please select a member.";
          }
          if (!c.amount || parseFloat(c.amount) <= 0) {
            newErrors[`${appIdx}_${cIdx}`] = "Please enter an amount > ₹0.";
          }
        });

        const minInv = selectedIpo?.minInvestment || 15000;
        const totalContrib = app.contributors.reduce(
          (sum, c) => sum + (parseFloat(c.amount) || 0),
          0
        );
        if (totalContrib > minInv) {
          newErrors[`${appIdx}_0`] = `Total contribution (₹${totalContrib.toLocaleString("en-IN")}) cannot exceed the minimum investment (₹${minInv.toLocaleString("en-IN")}).`;
        }
      });

      if (Object.keys(newErrors).length > 0) {
        setMultiErrors(newErrors);
        setFormError("Please correct the flagged errors across your Multi-Friend applications.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          ipoId: selectedIpoId,
          applications: multiApps.map((app) => ({
            memberId: app.contributors[0].memberId,
            panNumber: app.contributors[0].panNumber.trim().toUpperCase(),
            contributors: app.contributors.map((c) => ({
              memberId: c.memberId,
              amount: parseFloat(c.amount) || 0,
            })),
          })),
        };

        const res = await createMultiFriendApplicationsBatch(payload);

        if (!res.success || !res.createdApplications) {
          setFormError(res.error || "Failed to create multi-friend applications.");
          return;
        }

        toast.success(
          `Successfully created ${res.count || multiApps.length} Multi-Friend application(s) for ${selectedIpo?.name || "IPO"} (₹${multiTotalCapital.toLocaleString("en-IN")}).`
        );

        onCreated(res.createdApplications);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create multi-friend applications batch.";
        setFormError(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-4xl h-[680px] max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl text-zinc-100 flex flex-col overflow-hidden">
        {/* Modal Header with Mode Selector */}
        <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
              {fundingMode === "SOLO" ? <Plus className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5 text-zinc-300" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                {fundingMode === "SOLO"
                  ? "Create Solo Applications"
                  : `Create Multi-Friend Applications (${multiApps.length})`}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {fundingMode === "SOLO" ? "Multi-Entry batch filing" : "Syndicate pooled applications with split funding"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Symmetrical Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs w-[240px] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFundingMode("SOLO");
                  setFormError(null);
                }}
                className={cn(
                  "h-7 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                  fundingMode === "SOLO"
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <User className="h-3 w-3" />
                <span>Solo Batch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFundingMode("MULTI_FRIEND");
                  setFormError(null);
                }}
                className={cn(
                  "h-7 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                  fundingMode === "MULTI_FRIEND"
                    ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Users className="h-3 w-3" />
                <span>Multi-Friend</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
            {/* Error Banner */}
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2.5 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Target IPO Offering Selector & Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Target IPO Offering</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedIpoId}
                    onChange={(e) => setSelectedIpoId(e.target.value)}
                    disabled={loadingData || isSubmitting}
                    className="w-full h-11 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-blue-500 cursor-pointer appearance-none shadow-xs"
                  >
                    {ipos.map((ipo) => (
                      <option key={ipo.id} value={ipo.id} className="bg-zinc-900 text-zinc-200">
                        {ipo.name} ({ipo.status}) — Min ₹{(ipo.minInvestment || 15000).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Capital Box */}
              <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex flex-col justify-center">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-sky-400" />
                    {fundingMode === "SOLO" ? "Batch Capital" : "Pooled Capital"}
                  </span>
                  <span className="font-mono text-zinc-300">
                    {fundingMode === "SOLO"
                      ? `${soloRows.length} ${soloRows.length === 1 ? "app" : "apps"}`
                      : `${multiApps.length} apps (${totalMultiContributorsCount} friends)`}
                  </span>
                </div>
                <div className="text-lg font-semibold text-sky-300 font-mono mt-0.5 t-num">
                  ₹{(fundingMode === "SOLO" ? soloTotalCapital : multiTotalCapital).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* SOLO ENTRIES */}
            {fundingMode === "SOLO" && (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                      Application Entries ({soloRows.length})
                    </h3>
                    {soloRows.length > 1 && (
                      <button
                        type="button"
                        onClick={handleResetSoloToOne}
                        className="text-[11px] text-zinc-500 hover:text-rose-400 font-sans cursor-pointer transition-colors"
                        title="Reset back to 1 row"
                      >
                        Reset to 1
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                      No. of Applications:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchCountInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchCountInput(val);
                        const n = parseInt(val, 10);
                        if (n && n > 0 && n <= 100) {
                          handleSetSoloRowsCount(n);
                        }
                      }}
                      onBlur={() => {
                        const n = parseInt(batchCountInput, 10);
                        if (!n || n < 1) {
                          setBatchCountInput(String(soloRows.length));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const n = parseInt(batchCountInput, 10);
                          if (n && n > 0) handleSetSoloRowsCount(n);
                        }
                      }}
                      placeholder="1"
                      className="w-16 h-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center font-mono text-xs text-zinc-100 focus:outline-hidden focus:border-zinc-700"
                    />
                  </div>
                </div>

                {loadingData ? (
                  <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-zinc-400" />
                    <p>Loading database members and IPO data...</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {soloRows.map((row, index) => {
                      const rowNumber = String(index + 1).padStart(2, "0");
                      const error = soloErrors[index];

                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-2.5",
                            error && "border-rose-500/60 bg-rose-950/10"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center font-mono text-xs font-semibold shrink-0">
                              {rowNumber}
                            </div>

                            <div className="flex-1 min-w-[220px]">
                              <MemberSelectDropdown
                                members={members}
                                value={row.memberId}
                                onChange={(mId) => handleSoloMemberChange(index, mId)}
                                disabled={isSubmitting}
                                placeholder="Select Member / User..."
                              />
                            </div>

                            <div className="w-full sm:w-60">
                              <Input
                                type="text"
                                maxLength={10}
                                value={row.panNumber}
                                onChange={(e) => handleSoloPanChange(index, e.target.value)}
                                placeholder="PAN CARD (E.G. ABCDE1234F)"
                                disabled={isSubmitting}
                                className="h-9.5 bg-zinc-950 border-zinc-800 text-xs font-mono tracking-wider uppercase text-zinc-100 placeholder:text-zinc-600 placeholder:font-sans rounded-xl focus-visible:ring-blue-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSoloRow(index)}
                              disabled={soloRows.length <= 1 || isSubmitting}
                              className="h-9.5 w-9.5 rounded-xl border border-zinc-800/80 bg-zinc-950 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                              title="Remove Row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {error && (
                            <div className="text-[11px] font-medium text-rose-400 flex items-center gap-1.5 pl-1">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* MULTI-FRIEND BATCH ENTRIES */}
            {fundingMode === "MULTI_FRIEND" && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-blue-400" />
                      <span>Multi-Friend Applications ({multiApps.length})</span>
                    </h3>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddMultiApp}
                    disabled={isSubmitting}
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Another Application</span>
                  </Button>
                </div>

                {loadingData ? (
                  <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-zinc-400" />
                    <p>Loading database members and IPO data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {multiApps.map((app, appIdx) => {
                      const appNumber = String(appIdx + 1).padStart(2, "0");
                      const appSubtotal = app.contributors.reduce(
                        (sum, c) => sum + (parseFloat(c.amount) || 0),
                        0
                      );

                      return (
                        <div
                          key={app.id}
                          className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-3"
                        >
                          {/* Application Group Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2 py-0.5 text-[10.5px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                                APP #{appNumber}
                              </span>
                              <span className="text-xs text-zinc-400 font-sans">
                                Pooled: <strong className="text-zinc-200 font-mono">₹{appSubtotal.toLocaleString("en-IN")}</strong> ({app.contributors.length} friends)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => handleAddFriendToApp(appIdx)}
                                disabled={isSubmitting}
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[11px] font-medium bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white rounded-lg gap-1 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Friend</span>
                              </Button>

                              {multiApps.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMultiApp(appIdx)}
                                  disabled={isSubmitting}
                                  className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                                  title="Remove Application"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Contributor Rows for this Application */}
                          <div className="space-y-2">
                            {app.contributors.map((contrib, friendIdx) => {
                              const isLead = friendIdx === 0;
                              const errKey = `${appIdx}_${friendIdx}`;
                              const error = multiErrors[errKey];

                              return (
                                <div
                                  key={contrib.id}
                                  className={cn(
                                    "p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2",
                                    error && "border-rose-500/60 bg-rose-950/10"
                                  )}
                                >
                                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                    <div className="w-14 text-[10.5px] font-mono text-zinc-400 font-semibold shrink-0">
                                      {isLead ? "01 Lead" : `0${friendIdx + 1} Friend`}
                                    </div>

                                    <div className="flex-1 min-w-[200px]">
                                      <MemberSelectDropdown
                                        members={members}
                                        value={contrib.memberId}
                                        onChange={(mId) =>
                                          handleMultiMemberChange(appIdx, friendIdx, mId)
                                        }
                                        disabled={isSubmitting}
                                        placeholder={
                                          isLead ? "Select Primary Lead Member..." : "Select Friend..."
                                        }
                                      />
                                    </div>

                                    {/* Lead only gets the filing PAN Card input */}
                                    {isLead && (
                                      <div className="w-full sm:w-40">
                                        <Input
                                          type="text"
                                          maxLength={10}
                                          value={contrib.panNumber}
                                          onChange={(e) =>
                                            handleMultiPanChange(appIdx, friendIdx, e.target.value)
                                          }
                                          placeholder="FILING PAN *"
                                          disabled={isSubmitting}
                                          className="h-9 bg-zinc-900 border-zinc-800 text-xs font-mono tracking-wider uppercase text-zinc-100 placeholder:text-zinc-600 rounded-lg focus-visible:ring-blue-500"
                                        />
                                      </div>
                                    )}

                                    <div className="w-full sm:w-32 relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">
                                        ₹
                                      </span>
                                      <Input
                                        type="number"
                                        value={contrib.amount}
                                        onChange={(e) =>
                                          handleMultiAmountChange(appIdx, friendIdx, e.target.value)
                                        }
                                        placeholder={friendIdx === app.contributors.length - 1 ? "Auto" : "5000"}
                                        disabled={isSubmitting}
                                        className={cn(
                                          "h-9 pl-5 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-lg focus-visible:ring-blue-500",
                                          friendIdx === app.contributors.length - 1 && "text-emerald-400 font-semibold border-emerald-500/20 bg-emerald-950/10"
                                        )}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFriendFromApp(appIdx, friendIdx)}
                                      disabled={app.contributors.length <= 1 || isSubmitting}
                                      className="h-9 w-9 rounded-lg border border-zinc-800/80 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/20 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                                      title="Remove Friend"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {error && (
                                    <div className="text-[11px] font-medium text-rose-400 flex items-center gap-1.5 pl-1">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                      <span>{error}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/40">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 text-xs font-medium border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md cursor-pointer transition-colors flex items-center gap-2"
            >
              <span>Cancel</span>
              <KbdEsc />
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || loadingData}
              isLoading={isSubmitting}
              loadingText="Creating Applications..."
              className="h-8 min-w-[180px] px-4 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              {fundingMode === "SOLO" ? (
                <>
                  <span>
                    Create {soloRows.length} Solo {soloRows.length === 1 ? "Application" : "Applications"}
                  </span>
                  <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
                </>
              ) : (
                <>
                  <span>
                    Create {multiApps.length} Multi-Friend {multiApps.length === 1 ? "Application" : "Applications"}
                  </span>
                  <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
