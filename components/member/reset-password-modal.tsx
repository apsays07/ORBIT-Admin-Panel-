"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
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
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Post-update temporary reveal state (for current dialog session only)
  const [updatedSuccessPassword, setUpdatedSuccessPassword] = useState<string | null>(null);
  const [revealUpdatedPassword, setRevealUpdatedPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useModalKeyboardShortcuts({
    isOpen,
    onClose,
    isSubmitting,
    initialFocusRef: passwordInputRef,
  });

  useEffect(() => {
    if (isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setMustChangePassword(Boolean(member?.mustChangePassword));
      setFeedback(null);
      setUpdatedSuccessPassword(null);
      setRevealUpdatedPassword(false);
      setIsCopied(false);

      if (initialMode === "generate") {
        handleGeneratePassword();
      }
    }
  }, [isOpen, initialMode, member]);

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
    const res = await resetMemberPassword(member.id, cleanPass, mustChangePassword);
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
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-2xl text-zinc-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                {updatedSuccessPassword ? "Password Updated" : "Reset Member Password"}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {updatedSuccessPassword ? "Share credential with member" : "Set or generate new encrypted login credentials"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member Profile Banner */}
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
          <MemberAvatar
            src={member.avatar}
            name={member.name}
            className="h-8 w-8 rounded-md border border-zinc-800 text-xs shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-zinc-100 truncate">{member.name}</span>
              <span className="text-[11px] font-mono text-zinc-400">@{member.username}</span>
            </div>
            <p className="text-[10.5px] text-zinc-500 font-mono">ID: {member.id}</p>
          </div>
        </div>

        {/* POST-UPDATE TEMPORARY REVEAL VIEW */}
        {updatedSuccessPassword ? (
          <div className="space-y-3 pt-0.5">
            <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-900/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Password Updated Successfully</span>
              </div>

              <div className="p-2.5 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
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
                🔒 Plaintext password will not be displayed again once closed.
              </p>
            </div>

            <div className="flex items-center justify-end pt-1">
              <Button
                type="button"
                onClick={onClose}
                className="text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md px-4 h-8"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* PASSWORD FORM VIEW */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Quick Generator Button */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-medium text-zinc-400">Password Controls</span>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-xs text-zinc-300 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-md border border-zinc-700 transition-colors"
              >
                <Sparkles className="h-3 w-3 text-zinc-400" />
                <span>Generate Secure</span>
              </button>
            </div>

            {/* New Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300 block">
                New Password
              </label>
              <div className="relative">
                <Input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Enter new password (min 6 chars)"
                  disabled={isSubmitting}
                  className="pr-9 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
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

            {/* Strength Meter */}
            {newPassword && (
              <div className="space-y-1 p-2 rounded-md bg-zinc-900/60 border border-zinc-800">
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
                <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden flex gap-1">
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 1 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 2 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 3 ? strength.color : "bg-zinc-800")} />
                  <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 4 ? strength.color : "bg-zinc-800")} />
                </div>
              </div>
            )}

            {/* Confirm Password Input */}
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
                placeholder="Confirm new password"
                disabled={isSubmitting}
                className="h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
              />
            </div>

            {/* Force password change toggle */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(e) => setMustChangePassword(e.target.checked)}
                disabled={isSubmitting}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-zinc-700 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-medium text-zinc-200 block">Force password change on next login</span>
                <span className="text-[10.5px] text-zinc-500">User will choose a new password when logging in</span>
              </div>
            </label>

            {feedback && (
              <div className={cn(
                "p-2.5 rounded-md text-xs flex items-center gap-2",
                feedback.type === "success"
                  ? "bg-emerald-950/30 border border-emerald-800/50 text-emerald-300"
                  : "bg-rose-950/30 border border-rose-800/50 text-rose-300"
              )}>
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-md flex items-center gap-2 h-8 px-3"
              >
                <span>Cancel</span>
                <KbdEsc />
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
                className="text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md px-3.5 h-8 cursor-pointer disabled:opacity-40 flex items-center gap-1.5 transition-colors"
              >
                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                <span>Update Password</span>
                <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
