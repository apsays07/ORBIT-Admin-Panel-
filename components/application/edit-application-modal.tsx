"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ApplicationRecord,
  ApplicationContributor,
} from "@/types/application";
import {
  MemberOption,
  IpoSelectOption,
  getMembersForSelection,
  getIposForSelection,
  updateApplication,
} from "@/lib/application/actions";
import { isValidPan, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Check,
  Edit2,
  Calendar,
  CreditCard,
  Building,
  User,
  Users,
} from "lucide-react";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { MemberSelectDropdown } from "@/components/ui/member-select-dropdown";

interface EditApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationRecord | null;
  onUpdated: (updatedApp: ApplicationRecord) => void;
}

export function EditApplicationModal({
  isOpen,
  onClose,
  application,
  onUpdated,
}: EditApplicationModalProps) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [ipos, setIpos] = useState<IpoSelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields State
  const [memberId, setMemberId] = useState(application?.memberId || "");
  const [ipoId, setIpoId] = useState(application?.ipoId || "");
  const [panNumbers, setPanNumbers] = useState<string[]>(
    application?.panNumbers && application.panNumbers.length > 0
      ? application.panNumbers
      : [""]
  );
  const [fundingStructure, setFundingStructure] = useState<string>(
    application?.fundingStructure || "SOLO"
  );
  const [status, setStatus] = useState<string>(
    application?.status || application?.allotmentStatus || "AWAITING"
  );
  const [totalContribution, setTotalContribution] = useState<string>(
    application?.totalContribution ? String(application.totalContribution) : "15000"
  );
  const [createdAtDate, setCreatedAtDate] = useState<string>(() => {
    if (!application?.createdAt) return new Date().toISOString().split("T")[0];
    try {
      return new Date(application.createdAt).toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });

  const [contributors, setContributors] = useState<ApplicationContributor[]>(
    application?.contributors || []
  );

  // Keyboard shortcut handling
  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    isSubmitting,
  });

  // Reset form whenever active application changes
  useEffect(() => {
    if (application) {
      setMemberId(application.memberId || "");
      setIpoId(application.ipoId || "");
      setPanNumbers(
        application.panNumbers && application.panNumbers.length > 0
          ? [...application.panNumbers]
          : [""]
      );
      setFundingStructure(application.fundingStructure || "SOLO");
      setStatus(application.status || application.allotmentStatus || "AWAITING");
      setTotalContribution(
        application.totalContribution ? String(application.totalContribution) : "15000"
      );
      try {
        setCreatedAtDate(
          application.createdAt
            ? new Date(application.createdAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
        );
      } catch {
        setCreatedAtDate(new Date().toISOString().split("T")[0]);
      }
      setContributors(application.contributors ? [...application.contributors] : []);
      setFormError(null);
    }
  }, [application]);

  // Load database options on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function load() {
      setLoadingOptions(true);
      try {
        const [memberList, ipoList] = await Promise.all([
          getMembersForSelection(),
          getIposForSelection(),
        ]);
        if (isMounted) {
          setMembers(memberList);
          setIpos(ipoList);
        }
      } catch (err) {
        console.error("Failed to load options for edit modal", err);
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !application) return null;

  const selectedMember = members.find((m) => m.id === memberId);
  const selectedIpo = ipos.find((i) => i.id === ipoId);

  // PAN Management
  function handlePanChange(index: number, val: string) {
    const copy = [...panNumbers];
    copy[index] = val.toUpperCase().trim();
    setPanNumbers(copy);
  }

  function handleAddPan() {
    setPanNumbers((prev) => [...prev, ""]);
  }

  function handleRemovePan(index: number) {
    if (panNumbers.length <= 1) return;
    setPanNumbers((prev) => prev.filter((_, i) => i !== index));
  }

  // Contributor Management
  function handleAddContributor() {
    setContributors((prev) => [
      ...prev,
      { memberId: "", memberName: "", amount: 7500, percentage: 50 },
    ]);
  }

  function handleRemoveContributor(index: number) {
    setContributors((prev) => prev.filter((_, i) => i !== index));
  }

  function handleContributorChange(index: number, field: keyof ApplicationContributor, val: unknown) {
    setContributors((prev) => {
      const copy = [...prev];
      if (field === "memberId") {
        const m = members.find((mem) => mem.id === val);
        copy[index] = {
          ...copy[index],
          memberId: String(val),
          memberName: m ? m.username || m.name : "",
        };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || !application) return;

    if (!memberId) {
      setFormError("Applicant user is required.");
      return;
    }

    if (!ipoId) {
      setFormError("Target IPO is required.");
      return;
    }

    const cleanedPans = panNumbers.map((p) => p.trim().toUpperCase()).filter(Boolean);
    if (cleanedPans.length === 0) {
      setFormError("At least one PAN card number is required.");
      return;
    }

    for (const p of cleanedPans) {
      if (!isValidPan(p)) {
        setFormError(`Invalid PAN format: "${p}". Must follow 5 letters, 4 numbers, 1 letter.`);
        return;
      }
    }

    const numericAmount = parseFloat(totalContribution);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setFormError("Total contribution must be a valid non-negative number.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Reconstruct timestamp preserving time of day if available
      let finalIsoDate = application.createdAt;
      try {
        const timePart = application.createdAt ? new Date(application.createdAt).toISOString().split("T")[1] : "12:00:00.000Z";
        finalIsoDate = new Date(`${createdAtDate}T${timePart}`).toISOString();
      } catch {
        finalIsoDate = new Date(createdAtDate).toISOString();
      }

      const res = await updateApplication(application.id, {
        id: application.id,
        ipoId,
        memberId,
        panNumbers: cleanedPans,
        fundingStructure,
        status,
        totalContribution: numericAmount,
        createdAt: finalIsoDate,
        contributors: fundingStructure === "MULTI_FRIEND" ? contributors : [],
        lastKnownUpdatedAt: application.updatedAt,
      });

      if (res.success && res.application) {
        toast.success("Application Updated", `Application ${application.id} has been saved successfully.`);
        onUpdated(res.application);
        onClose();
      } else {
        setFormError(res.error || "Failed to update application.");
        toast.error("Update Failed", res.error || "Could not save application.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setFormError(msg);
      toast.error("Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !application || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 font-sans"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl text-zinc-100 flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
              <Edit2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Edit Application Details
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {application.id}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Update investor allocation, PAN card, or split funding structure</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
            {/* Error Banner */}
            {formError && (
              <div className="p-2.5 rounded-md bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Row 1: Applicant Member & Target IPO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Applicant User */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Applicant Member</span>
                  <span className="text-rose-400">*</span>
                </label>
                <MemberSelectDropdown
                  members={members}
                  value={memberId}
                  onChange={(id) => setMemberId(id)}
                  disabled={loadingOptions || isSubmitting}
                  placeholder="Select Member..."
                />
              </div>

              {/* Target IPO */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Target IPO</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={ipoId}
                    onChange={(e) => setIpoId(e.target.value)}
                    disabled={loadingOptions || isSubmitting}
                    className="w-full h-10 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-amber-500 cursor-pointer appearance-none shadow-xs"
                  >
                    {ipos.map((ipo) => (
                      <option key={ipo.id} value={ipo.id} className="bg-zinc-900 text-zinc-100">
                        {ipo.name} ({ipo.status})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedIpo && (
                  <div className="text-[11px] text-zinc-400 font-sans pl-1">
                    Min Inv: ₹{(selectedIpo.minInvestment || 15000).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Status & Funding Structure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Application Status */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 block">
                  Application Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-amber-500 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="AWAITING" className="bg-zinc-900 text-amber-400">
                    AWAITING (Pending Allotment)
                  </option>
                  <option value="ALLOTTED" className="bg-zinc-900 text-emerald-400">
                    ALLOTTED (Confirmed Lot)
                  </option>
                  <option value="NOT_ALLOTTED" className="bg-zinc-900 text-zinc-400">
                    NOT_ALLOTTED (Refund / Missed)
                  </option>
                </select>
              </div>

              {/* Funding Structure */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 block">
                  Funding Structure
                </label>
                <select
                  value={fundingStructure}
                  onChange={(e) => setFundingStructure(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-amber-500 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="SOLO" className="bg-zinc-900 text-zinc-100">
                    SOLO (Single Member Filing)
                  </option>
                  <option value="MULTI_FRIEND" className="bg-zinc-900 text-zinc-100">
                    MULTI_FRIEND (Split Contributions)
                  </option>
                </select>
              </div>
            </div>

            {/* Row 3: Total Contribution & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Contribution */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1">
                  <span>Total Capital / Contribution</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={totalContribution}
                    onChange={(e) => setTotalContribution(e.target.value)}
                    disabled={isSubmitting}
                    className="h-10 pl-7 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              {/* Application Date */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Application Filing Date</span>
                </label>
                <Input
                  type="date"
                  value={createdAtDate}
                  onChange={(e) => setCreatedAtDate(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 bg-zinc-900/80 border-zinc-800 text-xs font-sans text-zinc-100 rounded-xl focus-visible:ring-amber-500"
                />
              </div>
            </div>

            {/* Attached PAN Cards Section */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-medium text-zinc-300 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Attached PAN Card Numbers ({panNumbers.length})</span>
                  <span className="text-rose-400">*</span>
                </label>
                <Button
                  type="button"
                  onClick={handleAddPan}
                  disabled={isSubmitting}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-medium border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 rounded-lg cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add PAN
                </Button>
              </div>

              <div className="space-y-2">
                {panNumbers.map((pan, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500 w-12 shrink-0">
                      PAN #{idx + 1}
                    </span>
                    <Input
                      type="text"
                      maxLength={10}
                      value={pan}
                      onChange={(e) => handlePanChange(idx, e.target.value)}
                      placeholder="ABCDE1234F"
                      disabled={isSubmitting}
                      className="h-9 bg-zinc-900/80 border-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-100 rounded-xl focus-visible:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePan(idx)}
                      disabled={panNumbers.length <= 1 || isSubmitting}
                      className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 flex items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Contributors (if MULTI_FRIEND) */}
            {fundingStructure === "MULTI_FRIEND" && (
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <span>Split Contributors</span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddContributor}
                    disabled={isSubmitting}
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium border-zinc-800 bg-zinc-900 text-indigo-400 hover:bg-zinc-800 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Contributor
                  </Button>
                </div>

                <div className="space-y-2">
                  {contributors.map((c, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <MemberSelectDropdown
                          members={members}
                          value={c.memberId}
                          onChange={(memberId) => handleContributorChange(cIdx, "memberId", memberId)}
                          placeholder="Select Member..."
                        />
                      </div>
                      <div className="w-28 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-[10px]">
                          ₹
                        </span>
                        <Input
                          type="number"
                          value={c.amount}
                          onChange={(e) =>
                            handleContributorChange(cIdx, "amount", parseFloat(e.target.value) || 0)
                          }
                          className="h-8.5 pl-5 text-xs font-mono"
                        />
                      </div>
                      <div className="w-20 relative">
                        <Input
                          type="number"
                          value={c.percentage}
                          onChange={(e) =>
                            handleContributorChange(cIdx, "percentage", parseFloat(e.target.value) || 0)
                          }
                          className="h-8.5 pr-5 text-xs font-mono"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-[10px]">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveContributor(cIdx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
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
              disabled={isSubmitting || loadingOptions}
              isLoading={isSubmitting}
              loadingText="Saving Changes..."
              className="h-8 min-w-[150px] px-4 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              <span>Save Application</span>
              <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
