"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MemberData,
  UpdateMemberInput,
} from "@/types/member";
import {
  updateMember,
  resetMemberPassword,
  checkUsernameAvailability,
} from "@/lib/member/actions";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  X,
  User,
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Sparkles,
  Copy,
  Check,
  Clock,
  Calendar,
  Fingerprint,
} from "lucide-react";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
  onUpdated: (updatedMember: MemberData) => void;
}

type TabType = "basic" | "security";

export function EditMemberModal({
  isOpen,
  onClose,
  member,
  onUpdated,
}: EditMemberModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("basic");

  // Form State
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [status, setStatus] = useState("ACTIVE");

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatedSuccessPassword, setUpdatedSuccessPassword] = useState<string | null>(null);
  const [revealUpdatedPassword, setRevealUpdatedPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Submission & Dirty State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  // Attach modal keyboard shortcuts
  useModalKeyboardShortcuts({
    isOpen,
    onClose: handleCloseRequest,
    isSubmitting: isSubmitting || isResettingPassword,
  });

  // Populate initial values when member opens
  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setUsername(member.username || "");
      setAvatar(member.avatar || "");
      setRole(member.role || "MEMBER");
      setStatus(member.status || "ACTIVE");
      setNewPassword("");
      setConfirmPassword("");
      setMustChangePassword(Boolean(member.mustChangePassword));
      setPasswordFeedback(null);
      setUpdatedSuccessPassword(null);
      setRevealUpdatedPassword(false);
      setIsCopied(false);
      setUsernameStatus("idle");
      setUsernameError(null);
      setIsDirty(false);
      setShowUnsavedPrompt(false);
      setActiveTab("basic");
    }
  }, [member, isOpen]);

  function handleGeneratePassword() {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%^&*_-+=";
    const all = upper + lower + numbers + symbols;

    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 16; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const generated = pwd.split("").sort(() => 0.5 - Math.random()).join("");
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setPasswordFeedback(null);
  }

  const [isCopiedUsername, setIsCopiedUsername] = useState(false);

  async function handleCopyPassword(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Password Copied", "New password copied to clipboard.");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the password.");
    }
  }

  async function handleCopyUsername(userText: string) {
    try {
      await navigator.clipboard.writeText(userText);
      setIsCopiedUsername(true);
      toast.success("Username Copied", `@${userText} copied to clipboard.`);
      setTimeout(() => setIsCopiedUsername(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually copy the username.");
    }
  }

  // Debounced username availability check
  function handleUsernameChange(val: string) {
    let clean = val.trim().toLowerCase();
    if (clean.startsWith("@")) clean = clean.slice(1);
    setUsername(clean);
    setIsDirty(true);

    if (usernameCheckTimerRef.current) clearTimeout(usernameCheckTimerRef.current);

    if (!clean) {
      setUsernameStatus("idle");
      setUsernameError("Username is required.");
      return;
    }

    if (member && clean === member.username.toLowerCase()) {
      setUsernameStatus("available");
      setUsernameError(null);
      return;
    }

    if (!/^[a-z0-9_.-]{3,30}$/.test(clean)) {
      setUsernameStatus("unavailable");
      setUsernameError("3-30 characters (letters, numbers, _, -, .)");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError(null);

    usernameCheckTimerRef.current = setTimeout(async () => {
      const res = await checkUsernameAvailability(clean, member?.id);
      if (res.available) {
        setUsernameStatus("available");
        setUsernameError(null);
      } else {
        setUsernameStatus("unavailable");
        setUsernameError(res.message || "Username is taken.");
      }
    }, 350);
  }

  function handleFieldChange(setter: (val: any) => void, val: any) {
    setter(val);
    setIsDirty(true);
  }

  function handleCloseRequest() {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  }

  // Password Strength Calculator
  function getPasswordStrength(pass: string): { score: number; label: "Weak" | "Fair" | "Strong" | "Very Strong"; color: string } {
    if (!pass) return { score: 0, label: "Weak", color: "bg-zinc-800" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Strong", color: "bg-sky-500" };
    return { score: 4, label: "Very Strong", color: "bg-emerald-500" };
  }

  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setPasswordFeedback(null);

    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setPasswordFeedback({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    const commonWeakList = ["123456", "12345678", "password", "password123", "admin123", "qwerty", "orbit123"];
    if (commonWeakList.includes(cleanPass.toLowerCase()) || cleanPass.toLowerCase() === member.username.toLowerCase()) {
      setPasswordFeedback({ type: "error", message: "This password is too common or easily guessable. Please choose a stronger password." });
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setPasswordFeedback({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsResettingPassword(true);
    const res = await resetMemberPassword(member.id, cleanPass, mustChangePassword);
    setIsResettingPassword(false);

    if (res.success) {
      setUpdatedSuccessPassword(cleanPass);
      setPasswordFeedback({ type: "success", message: "Password updated successfully!" });
      toast.success("Password Reset", `Successfully updated password credentials for @${member.username}.`);
    } else {
      setPasswordFeedback({ type: "error", message: res.error || "Failed to reset password." });
    }
  }

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    if (!name.trim()) {
      toast.error("Validation Error", "Display name is required.");
      return;
    }
    if (!username.trim()) {
      toast.error("Validation Error", "Username is required.");
      return;
    }
    if (usernameStatus === "unavailable") {
      toast.error("Validation Error", usernameError || "Username is unavailable.");
      return;
    }

    setIsSubmitting(true);

    const updatePayload: UpdateMemberInput = {
      name: name.trim(),
      username: username.trim(),
      avatar: avatar.trim() || undefined,
      role,
      status,
      lastKnownUpdatedAt: member.updatedAt,
    };

    const res = await updateMember(member.id, updatePayload);
    setIsSubmitting(false);

    if (res.success && res.member) {
      setIsDirty(false);
      onUpdated(res.member);
      toast.success("Member Updated", `Successfully updated member @${res.member.username}.`);
      onClose();
    } else {
      toast.error("Update Failed", res.error || "Failed to update member record.");
    }
  }

  if (!isOpen || !member) return null;

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <MemberAvatar
              src={avatar || member.avatar}
              name={name || member.name}
              className="h-8.5 w-8.5 rounded-lg border border-zinc-800 text-xs shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Edit Member
                </h3>
                <span className="text-[10.5px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  @{member.username}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">ID: {member.id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseRequest}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-zinc-800 bg-zinc-950 flex items-center gap-1.5 shrink-0 py-2">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === "basic"
                ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            )}
          >
            <User className="h-3.5 w-3.5 text-zinc-300" />
            <span>Basic Info & Role</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
              activeTab === "security"
                ? "bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/80"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            )}
          >
            <Lock className="h-3.5 w-3.5 text-zinc-300" />
            <span>Login Credentials & Password</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                    <span>Username handle</span>
                    <span className="text-[10px] text-zinc-500 font-mono">Unique ID</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                      @
                    </span>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      disabled={isSubmitting}
                      className={cn(
                        "pl-7 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700",
                        usernameStatus === "available" && "border-emerald-500/50",
                        usernameStatus === "unavailable" && "border-rose-500/50"
                      )}
                    />
                  </div>
                  {usernameStatus === "checking" && (
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
                    </p>
                  )}
                  {usernameStatus === "available" && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Available
                    </p>
                  )}
                  {usernameStatus === "unavailable" && usernameError && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {usernameError}
                    </p>
                  )}
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 block">Display Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsDirty(true);
                    }}
                    disabled={isSubmitting}
                    className="h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 block">Account Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setIsDirty(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer"
                  >
                    <option value="MEMBER">MEMBER — Standard Syndicate Member</option>
                    <option value="ADMIN">ADMIN — Sub-Admin Operations</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN — Full System Access</option>
                  </select>
                </div>

                {/* Account Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300 block">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setIsDirty(true);
                    }}
                    disabled={isSubmitting}
                    className="w-full h-9 px-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE — Full Platform Access</option>
                    <option value="SUSPENDED">SUSPENDED — Temporary Hold</option>
                    <option value="BLOCKED">BLOCKED — Access Revoked</option>
                  </select>
                </div>
              </div>

              {/* Avatar URL */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300 block">Avatar Image URL</label>
                <Input
                  type="url"
                  value={avatar}
                  onChange={(e) => {
                    setAvatar(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://example.com/avatar.png"
                  disabled={isSubmitting}
                  className="h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                />
              </div>

              {/* Audit Summary Card */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-md bg-zinc-900/50 border border-zinc-800 space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-medium">
                    Account Created
                  </span>
                  <div className="text-xs font-mono text-zinc-300">
                    {member.createdAt
                      ? new Date(member.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : member.joinedAt || "N/A"}
                  </div>
                </div>

                <div className="p-2.5 rounded-md bg-zinc-900/50 border border-zinc-800 space-y-0.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block font-medium">
                    Last Profile Update
                  </span>
                  <div className="text-xs font-mono text-zinc-300">
                    {member.updatedAt
                      ? new Date(member.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN CREDENTIALS & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-4">
              {/* 1. Dedicated Login Credentials Summary Card */}
              <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-3">
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">Login Credentials</h4>
                      <p className="text-[11px] text-zinc-500">Authentication account and credential status</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                    <Lock className="h-2.5 w-2.5 text-zinc-400" />
                    <span>PBKDF2 SHA-512</span>
                  </span>
                </div>

                {/* 6 Grid Credential Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {/* Username Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2 group">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium block">Username</span>
                      <div className="font-mono font-medium text-zinc-100 text-xs truncate">
                        @{member.username}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyUsername(member.username)}
                      className="h-6 w-6 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Copy username"
                    >
                      {isCopiedUsername ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>

                  {/* Display Name Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 flex items-center gap-2.5">
                    <MemberAvatar
                      src={member.avatar}
                      name={member.name}
                      className="h-7 w-7 rounded-md border border-zinc-800 text-[10px] shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium block">Display Name</span>
                      <div className="font-medium text-zinc-100 text-xs truncate">{member.name}</div>
                    </div>
                  </div>

                  {/* Account Status Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium block">Account Status</span>
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.2 rounded text-[10.5px] font-medium font-sans",
                        status === "ACTIVE" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        status === "SUSPENDED" && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                        status === "BLOCKED" && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          status === "ACTIVE" && "bg-emerald-400",
                          status === "SUSPENDED" && "bg-amber-400",
                          status === "BLOCKED" && "bg-rose-400"
                        )} />
                        {status === "ACTIVE" ? "Active" : status === "SUSPENDED" ? "Suspended" : "Blocked"}
                      </span>
                    </div>
                  </div>

                  {/* Last Password Updated Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 space-y-0.5">
                    <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      <span>Last Password Updated</span>
                    </span>
                    <div className="font-mono text-zinc-300 text-xs">
                      {member.passwordUpdatedAt || member.lastPasswordResetAt
                        ? new Date(member.passwordUpdatedAt || member.lastPasswordResetAt!).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Initial Setup"}
                    </div>
                  </div>

                  {/* Password Status Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium block">Password Status</span>
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span>Configured</span>
                      </span>
                    </div>
                  </div>

                  {/* Login Access Card */}
                  <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <span className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-mono font-medium block">Login Access</span>
                    <div>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10.5px] font-medium",
                        status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      )}>
                        {status === "ACTIVE" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-rose-400" />
                            <span>Disabled</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Guarantee Banner */}
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 leading-normal font-sans">
                  <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span>Passwords are cryptographically salted and hashed with PBKDF2 SHA-512. Plaintext passwords cannot be viewed or retrieved.</span>
                </div>
              </div>

              {/* 2. Admin Password Reset Section */}
              <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">Set New Password</h4>
                      <p className="text-[11px] text-zinc-500">Assign new authentication credentials for this member</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-md border border-zinc-700 transition-colors self-start sm:self-auto"
                  >
                    <Sparkles className="h-3 w-3 text-zinc-400" />
                    <span>Generate Secure</span>
                  </button>
                </div>

                {updatedSuccessPassword ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="p-3.5 rounded-lg bg-zinc-950 border border-emerald-900/50 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Password Updated Successfully</span>
                      </div>

                      <div className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                        <div className="font-mono text-xs text-zinc-100 tracking-wider select-all break-all">
                          {revealUpdatedPassword
                            ? updatedSuccessPassword
                            : "•".repeat(Math.min(updatedSuccessPassword.length, 14))}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevealUpdatedPassword(!revealUpdatedPassword)}
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-white rounded-md"
                          >
                            {revealUpdatedPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCopyPassword(updatedSuccessPassword)}
                            className="h-7 px-2.5 text-xs bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded-md flex items-center gap-1 cursor-pointer"
                          >
                            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>{isCopied ? "Copied" : "Copy"}</span>
                          </Button>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-500 leading-normal font-sans">
                        🔒 Plaintext password will not be displayed again once closed. Prior sessions were invalidated.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setUpdatedSuccessPassword(null)}
                      variant="outline"
                      className="w-full text-xs h-8 rounded-md border-zinc-800 bg-zinc-900 text-zinc-300 cursor-pointer"
                    >
                      Set Another Password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-0.5">
                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-300 block">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Enter new password (min 6 characters)"
                          disabled={isResettingPassword}
                          className="pr-9 h-9 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="space-y-1 p-2.5 rounded-md bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Strength:</span>
                          <span className={cn(
                            "font-medium",
                            strength.label === "Weak" && "text-rose-400",
                            strength.label === "Fair" && "text-amber-400",
                            strength.label === "Strong" && "text-sky-400",
                            strength.label === "Very Strong" && "text-emerald-400"
                          )}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-1">
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 1 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 2 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 3 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 4 ? strength.color : "bg-zinc-800")} />
                        </div>
                      </div>
                    )}

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-300 block">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="Re-type new password to confirm"
                        disabled={isResettingPassword}
                        className="h-9 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                      />
                    </div>

                    {/* Force password change toggle */}
                    <label className="flex items-center gap-2.5 p-2.5 rounded-md bg-zinc-950 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={mustChangePassword}
                        onChange={(e) => setMustChangePassword(e.target.checked)}
                        disabled={isResettingPassword}
                        className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-zinc-700 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-medium text-zinc-200 block">Force password change on next login</span>
                        <span className="text-[10.5px] text-zinc-500">User will choose a new password when logging in</span>
                      </div>
                    </label>

                    {passwordFeedback && (
                      <div className={cn(
                        "p-2.5 rounded-md text-xs flex items-center gap-2",
                        passwordFeedback.type === "success"
                          ? "bg-emerald-950/30 border border-emerald-800/50 text-emerald-300"
                          : "bg-rose-950/30 border border-rose-800/50 text-rose-300"
                      )}>
                        {passwordFeedback.type === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                        )}
                        <span>{passwordFeedback.message}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleResetPasswordSubmit}
                      disabled={isResettingPassword || !newPassword || newPassword !== confirmPassword}
                      className="w-full h-9 bg-zinc-100 hover:bg-white text-zinc-950 rounded-md text-xs font-medium cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isResettingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                      <span>Update Member Password</span>
                      <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCloseRequest}
            disabled={isSubmitting}
            className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-md flex items-center gap-2 h-8 px-3"
          >
            <span>Cancel</span>
            <KbdEsc />
          </Button>

          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-[10.5px] text-amber-400 font-mono flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Unsaved changes
              </span>
            )}

            <Button
              type="button"
              onClick={handleSaveGeneral}
              disabled={isSubmitting || usernameStatus === "unavailable" || usernameStatus === "checking"}
              isLoading={isSubmitting}
              loadingText="Saving..."
              className="text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md px-3.5 h-8 min-w-[140px] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors active:scale-95"
            >
              <span>Save Member</span>
              <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
            </Button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        {showUnsavedPrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3 shadow-2xl">
              <div className="flex items-start gap-2.5">
                <div className="h-7 w-7 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100">Unsaved Changes</h4>
                  <p className="text-[11.5px] text-zinc-400 mt-0.5">
                    You have modified member fields that have not been saved yet.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnsavedPrompt(false)}
                  className="text-xs rounded-md border-zinc-800 text-zinc-300 h-8 px-3"
                >
                  Continue Editing
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setIsDirty(false);
                    setShowUnsavedPrompt(false);
                    onClose();
                  }}
                  className="text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white h-8 px-3"
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
