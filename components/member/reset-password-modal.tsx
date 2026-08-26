"use client";

import React, { useState, useEffect } from "react";
import { MemberData } from "@/types/member";
import { resetMemberPassword } from "@/lib/member/actions";
import { useToast } from "@/components/ui/toast";
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { cn } from "@/lib/utils";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
  initialMode?: "manual" | "generate";
}

function generateSecureRandomPassword(length = 16): string {
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

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split("").sort(() => 0.5 - Math.random()).join("");
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  member,
  initialMode = "manual",
}: ResetPasswordModalProps) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Post-update temporary reveal state (for current dialog session only)
  const [updatedSuccessPassword, setUpdatedSuccessPassword] = useState<string | null>(null);
  const [revealUpdatedPassword, setRevealUpdatedPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setFeedback(null);
      setUpdatedSuccessPassword(null);
      setRevealUpdatedPassword(false);
      setIsCopied(false);

      if (initialMode === "generate") {
        handleGeneratePassword();
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !member) return null;

  function handleGeneratePassword() {
    const generated = generateSecureRandomPassword(16);
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
    setFeedback(null);
  }

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

  const strength = getPasswordStrength(newPassword);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setFeedback(null);

    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 6) {
      setFeedback({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    const commonWeakList = ["123456", "12345678", "password", "password123", "admin123", "qwerty", "orbit123"];
    if (commonWeakList.includes(cleanPass.toLowerCase()) || cleanPass.toLowerCase() === member.username.toLowerCase()) {
      setFeedback({ type: "error", message: "This password is too common or easily guessable. Please choose a stronger password." });
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setFeedback({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    const res = await resetMemberPassword(member.id, cleanPass);
    setIsSubmitting(false);

    if (res.success) {
      setUpdatedSuccessPassword(cleanPass);
      toast.success(
        "Password Updated",
        `Successfully reset password credentials for @${member.username}.`
      );
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to reset password." });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in-50 font-sans">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-zinc-100 tracking-tight">
                {updatedSuccessPassword ? "Password Updated" : "Reset Member Password"}
              </h3>
              <p className="text-xs text-zinc-400">
                {updatedSuccessPassword ? "Share credential with member" : "Set or generate new encrypted login credentials"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member Profile Banner */}
        <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
          <MemberAvatar
            src={member.avatar}
            name={member.name}
            className="h-9 w-9 rounded-xl border border-zinc-800 text-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-100 truncate">{member.name}</span>
              <span className="text-[11px] font-mono text-zinc-400">@{member.username}</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 font-mono">ID: {member.id}</p>
          </div>
        </div>

        {/* POST-UPDATE TEMPORARY REVEAL VIEW */}
        {updatedSuccessPassword ? (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Password Updated Successfully</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-zinc-100 tracking-wider select-all break-all">
                  {revealUpdatedPassword
                    ? updatedSuccessPassword
                    : "•".repeat(Math.min(updatedSuccessPassword.length, 14))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevealUpdatedPassword(!revealUpdatedPassword)}
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-white rounded-lg"
                  >
                    {revealUpdatedPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopyPassword(updatedSuccessPassword)}
                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                🔒 <span className="font-medium text-zinc-300">Security Note:</span> Once you close this modal, this plaintext password will no longer be stored or retrievable anywhere in the system.
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl px-5 h-9"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* PASSWORD FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Generator Button */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-medium text-zinc-400">Password Controls</span>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Secure Password</span>
              </button>
            </div>

            {/* New Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password or click Generate"
                  disabled={isSubmitting}
                  className="pr-10 h-10 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Password Strength:</span>
                  <span className={cn(
                    "font-semibold",
                    strength.label === "Weak" && "text-rose-400",
                    strength.label === "Fair" && "text-amber-400",
                    strength.label === "Strong" && "text-sky-400",
                    strength.label === "Very Strong" && "text-emerald-400"
                  )}>
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 1 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 2 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 3 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 4 ? strength.color : "bg-zinc-800")} />
                </div>
              </div>
            )}

            {/* Confirm Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Confirm New Password
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isSubmitting}
                className="h-10 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-rose-500"
              />
            </div>

            {feedback && (
              <div className={cn(
                "p-2.5 rounded-xl text-xs flex items-center gap-2",
                feedback.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                  : "bg-rose-950/40 border border-rose-800 text-rose-300"
              )}>
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
                className="text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-4 h-9 cursor-pointer disabled:opacity-40"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Update Password
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
