"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MemberData, CreateMemberInput } from "@/types/member";
import {
  createMember,
  checkUsernameAvailability,
} from "@/lib/member/actions";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  X,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  Sparkles,
  User,
} from "lucide-react";
import { useModalKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { KbdEnter, KbdEsc } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newMember: MemberData) => void;
}

export function CreateMemberModal({
  isOpen,
  onClose,
  onCreated,
}: CreateMemberModalProps) {
  const toast = useToast();
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  // Validation States
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success Screen State
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    passwordText: string;
    formatted: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useModalKeyboardShortcuts({
    isOpen,
    onClose: handleModalClose,
    isSubmitting,
    initialFocusRef: usernameInputRef,
  });

  function generateRandomPassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }

  function handleUsernameChange(val: string) {
    let clean = val.trim().toLowerCase();
    if (clean.startsWith("@")) clean = clean.slice(1);
    setUsername(clean);

    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);

    if (!clean) {
      setUsernameStatus("idle");
      setUsernameError("Username is required.");
      return;
    }

    if (!/^[a-z0-9_.-]{3,30}$/.test(clean)) {
      setUsernameStatus("unavailable");
      setUsernameError("3-30 characters (lowercase letters, numbers, _, -, .)");
      return;
    }

    setUsernameStatus("checking");
    setUsernameError(null);

    usernameTimerRef.current = setTimeout(async () => {
      const res = await checkUsernameAvailability(clean);
      if (res.available) {
        setUsernameStatus("available");
        setUsernameError(null);
      } else {
        setUsernameStatus("unavailable");
        setUsernameError(res.message || "Username is already taken.");
      }
    }, 300);
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      toast.success("Credentials Copied", "Formatted credentials copied to clipboard.");
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      toast.error("Copy Failed", "Please manually select and copy the text.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const cleanUser = username.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUser) {
      setFormError("Username is required.");
      return;
    }

    if (usernameStatus === "unavailable") {
      setFormError(usernameError || "Username is not available.");
      return;
    }

    const cleanPass = password.trim();
    if (!cleanPass) {
      setFormError("Password is required.");
      return;
    }

    if (cleanPass.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateMemberInput = {
      username: cleanUser,
      name: cleanUser,
      password: cleanPass,
      role: "MEMBER",
      status: "ACTIVE",
    };

    const res = await createMember(payload);
    setIsSubmitting(false);

    if (res.success && res.member) {
      const formattedText = `username:"${cleanUser}"\npassword:"${cleanPass}"`;

      // Automatically copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(formattedText);
        setHasCopied(true);
      } catch {
        // Fallback handled by manual copy button
      }

      setCreatedCredentials({
        username: cleanUser,
        passwordText: cleanPass,
        formatted: formattedText,
      });

      toast.success("Member Created", `@${cleanUser} successfully created in MongoDB.`);
      onCreated(res.member);
    } else {
      setFormError(res.error || "Failed to create member account.");
    }
  }

  function handleModalClose() {
    setUsername("");
    setPassword("");
    setUsernameStatus("idle");
    setUsernameError(null);
    setFormError(null);
    setCreatedCredentials(null);
    setHasCopied(false);
    onClose();
  }

  function handleCreateAnother() {
    setUsername("");
    setPassword("");
    setUsernameStatus("idle");
    setUsernameError(null);
    setFormError(null);
    setCreatedCredentials(null);
    setHasCopied(false);
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in-50 font-sans">
      <div className="w-full max-w-md max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans my-auto">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Create New Member
              </h3>
              <p className="text-[11px] text-zinc-500">
                Generate active member credentials for syndicate access
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleModalClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {createdCredentials ? (
          /* SUCCESS SCREEN */
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="text-center py-1 space-y-1">
              <div className="inline-flex h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 items-center justify-center mb-0.5 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Member Created Successfully
              </h4>
              <p className="text-[11.5px] text-zinc-400">
                Credentials saved and ready for immediate member authentication.
              </p>
            </div>

            {/* Formatted Code Box */}
            <div className="relative group rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-medium text-zinc-400">
                  Formatted Credentials
                </span>
                <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" /> Auto-Copied
                </span>
              </div>

              <pre className="font-mono text-xs bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-zinc-100 leading-relaxed overflow-x-auto select-all">
                {createdCredentials.formatted}
              </pre>

              <button
                type="button"
                onClick={() => copyToClipboard(createdCredentials.formatted)}
                className="w-full h-8 mt-1 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                {hasCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateAnother}
                className="flex-1 h-8 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-md cursor-pointer"
              >
                + Create Another
              </Button>
              <Button
                type="button"
                onClick={handleModalClose}
                className="flex-1 h-8 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* SIMPLE FORM */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {formError && (
                <div className="p-2.5 rounded-md bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                    <User className="h-3 w-3 text-zinc-400" />
                    <span>Username</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  {usernameStatus === "checking" && (
                    <span className="text-[10.5px] text-zinc-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                    </span>
                  )}
                  {usernameStatus === "available" && (
                    <span className="text-[10.5px] text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="h-3 w-3" /> Available
                    </span>
                  )}
                  {usernameStatus === "unavailable" && usernameError && (
                    <span className="text-[10.5px] text-rose-400 font-medium">
                      {usernameError}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">
                    @
                  </span>
                  <Input
                    ref={usernameInputRef}
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="e.g. rohit_sharma"
                    disabled={isSubmitting}
                    className="h-9 pl-7 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-zinc-400" />
                    <span>Password</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> Generate Secure
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 chars)"
                    disabled={isSubmitting}
                    className="h-9 pr-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 rounded-md focus-visible:ring-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Salted & hashed using PBKDF2 SHA-512 for secure cross-website authentication.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={isSubmitting}
                className="h-8 px-3 text-xs font-medium border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md cursor-pointer flex items-center gap-2"
              >
                <span>Cancel</span>
                <KbdEsc />
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || usernameStatus === "checking" || !username.trim() || !password.trim()}
                isLoading={isSubmitting}
                loadingText="Creating..."
                className="h-8 min-w-[140px] px-4 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <span>Create Member</span>
                <KbdEnter className="bg-zinc-200 border-zinc-300 text-zinc-900" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
