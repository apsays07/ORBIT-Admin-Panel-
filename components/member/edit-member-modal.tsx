"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MemberData,
  UpdateMemberInput,
  MemberPermissions,
} from "@/types/member";
import {
  updateMember,
  resetMemberPassword,
  checkUsernameAvailability,
} from "@/lib/member/actions";
import { isValidPan, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  X,
  User,
  Shield,
  CreditCard,
  MapPin,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/ui/member-avatar";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
  onUpdated: (updatedMember: MemberData) => void;
}

type TabType = "basic" | "contact" | "financial" | "permissions" | "security";

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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [panFull, setPanFull] = useState("");
  const [defaultContribution, setDefaultContribution] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [status, setStatus] = useState("ACTIVE");
  const [notes, setNotes] = useState("");
  const [permissions, setPermissions] = useState<MemberPermissions>({
    canSubmitApplications: true,
    canDistributeProfit: false,
    canEditIpos: false,
    canAccessAdminConsole: false,
    canManageMembers: false,
  });

  // Password Reset State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // Populate initial values when member opens
  useEffect(() => {
    if (member) {
      setName(member.name || "");
      setUsername(member.username || "");
      setAvatar(member.avatar || "");
      setEmail(member.email || "");
      setPhone(member.phone || "");
      setAddress(member.address || "");
      setCity(member.city || "");
      setState(member.state || "");
      setPincode(member.pincode || "");
      setPanFull(member.panFull || member.panMasked || "");
      setDefaultContribution(member.defaultContribution ? String(member.defaultContribution) : "");
      setBankName(member.bankName || "");
      setAccountNumber(member.accountNumber || "");
      setIfscCode(member.ifscCode || "");
      setUpiId(member.upiId || "");
      setRole(member.role || "MEMBER");
      setStatus(member.status || "ACTIVE");
      setNotes(member.notes || "");
      setPermissions(
        member.permissions || {
          canSubmitApplications: true,
          canDistributeProfit: false,
          canEditIpos: false,
          canAccessAdminConsole: false,
          canManageMembers: false,
        }
      );
      setNewPassword("");
      setConfirmPassword("");
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

  function handlePermissionToggle(key: keyof MemberPermissions) {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
    const res = await resetMemberPassword(member.id, cleanPass);
    setIsResettingPassword(false);

    if (res.success) {
      setUpdatedSuccessPassword(cleanPass);
      setPasswordFeedback({ type: "success", message: "Password updated successfully!" });
      toast.success("Password Reset", `Successfully updated password for @${member.username}.`);
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
    if (panFull && !isValidPan(panFull.toUpperCase())) {
      toast.error("Invalid PAN", "PAN must match standard 10-character format (e.g. ABCDE1234F).");
      return;
    }

    setIsSubmitting(true);

    const updatePayload: UpdateMemberInput = {
      name: name.trim(),
      username: username.trim(),
      avatar: avatar.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      pincode: pincode.trim() || undefined,
      panFull: panFull.trim().toUpperCase() || undefined,
      defaultContribution: defaultContribution ? parseFloat(defaultContribution) : undefined,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      ifscCode: ifscCode.trim().toUpperCase() || undefined,
      upiId: upiId.trim() || undefined,
      role,
      status,
      notes: notes.trim() || undefined,
      permissions,
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
      <div className="w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <MemberAvatar
              src={avatar || member.avatar}
              name={name || member.name}
              className="h-10 w-10 rounded-xl border border-zinc-800 text-sm shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-zinc-100 tracking-tight">
                  Edit Member
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700">
                  @{member.username}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">ID: {member.id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseRequest}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 py-2">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "basic"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            )}
          >
            <User className="h-3.5 w-3.5 text-sky-400" />
            <span>Basic Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "contact"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            )}
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Contact & Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "financial"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            )}
          >
            <CreditCard className="h-3.5 w-3.5 text-amber-400" />
            <span>Financial / KYC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "permissions"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            )}
          >
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span>Account & Access</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0",
              activeTab === "security"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
            )}
          >
            <Lock className="h-3.5 w-3.5 text-rose-400" />
            <span>Security</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1.5">
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
                        "pl-7 pr-8 h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-sky-500",
                        usernameStatus === "unavailable" && "border-rose-500 focus-visible:ring-rose-500",
                        usernameStatus === "available" && "border-emerald-500/50"
                      )}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
                      {usernameStatus === "available" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      {usernameStatus === "unavailable" && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
                    </div>
                  </div>
                  {usernameError && (
                    <p className="text-[11px] text-rose-400 pl-1">{usernameError}</p>
                  )}
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Display Name <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => handleFieldChange(setName, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Full Member Name"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl focus-visible:ring-sky-500"
                  />
                </div>
              </div>

              {/* Avatar URL & Live Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Profile Avatar URL
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="url"
                    value={avatar}
                    onChange={(e) => handleFieldChange(setAvatar, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="https://example.com/avatar.jpg"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl focus-visible:ring-sky-500 flex-1"
                  />
                  <MemberAvatar
                    src={avatar}
                    name={name}
                    className="h-10 w-10 rounded-xl border border-zinc-800 text-xs shrink-0"
                  />
                </div>
              </div>

              {/* Joined Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Joined Date
                  </span>
                  <div className="text-xs font-mono text-zinc-300">
                    {member.joinedAt || member.createdAt ? new Date(member.joinedAt || member.createdAt!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Last Profile Update
                  </span>
                  <div className="text-xs font-mono text-zinc-300">
                    {member.updatedAt ? new Date(member.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACT & ADDRESS */}
          {activeTab === "contact" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange(setEmail, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="member@example.com"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleFieldChange(setPhone, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="+91 98765 43210"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Street Address
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => handleFieldChange(setAddress, e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Flat/House No., Street Name, Locality"
                  className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl focus-visible:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    City
                  </label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => handleFieldChange(setCity, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Mumbai"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl"
                  />
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    State
                  </label>
                  <Input
                    type="text"
                    value={state}
                    onChange={(e) => handleFieldChange(setState, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Maharashtra"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 rounded-xl"
                  />
                </div>

                {/* PIN Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    PIN Code
                  </label>
                  <Input
                    type="text"
                    value={pincode}
                    onChange={(e) => handleFieldChange(setPincode, e.target.value)}
                    disabled={isSubmitting}
                    placeholder="400001"
                    maxLength={6}
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL & KYC */}
          {activeTab === "financial" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PAN Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                    <span>PAN Card Number</span>
                    <span className="text-[10px] text-zinc-500 font-mono">10 Characters</span>
                  </label>
                  <Input
                    type="text"
                    value={panFull}
                    onChange={(e) => handleFieldChange(setPanFull, e.target.value.toUpperCase())}
                    disabled={isSubmitting}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    className="h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono tracking-wider uppercase text-zinc-100 rounded-xl focus-visible:ring-amber-500"
                  />
                </div>

                {/* Default Contribution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Default Contribution (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={defaultContribution}
                      onChange={(e) => handleFieldChange(setDefaultContribution, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="15000"
                      className="pl-7 h-10 bg-zinc-900/80 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                  <span>Settlement Bank Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Bank Name</label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => handleFieldChange(setBankName, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="HDFC Bank"
                      className="h-9 bg-zinc-950 border-zinc-800 text-xs text-zinc-100 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Account Number</label>
                    <Input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => handleFieldChange(setAccountNumber, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="50100000000000"
                      className="h-9 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">IFSC Code</label>
                    <Input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => handleFieldChange(setIfscCode, e.target.value.toUpperCase())}
                      disabled={isSubmitting}
                      placeholder="HDFC0000123"
                      maxLength={11}
                      className="h-9 bg-zinc-950 border-zinc-800 text-xs font-mono uppercase text-zinc-100 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">UPI ID (VPA)</label>
                    <Input
                      type="text"
                      value={upiId}
                      onChange={(e) => handleFieldChange(setUpiId, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="member@okaxis"
                      className="h-9 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT & PERMISSIONS */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => handleFieldChange(setRole, e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-purple-500 cursor-pointer appearance-none shadow-xs"
                  >
                    <option value="SUPER_ADMIN" className="bg-zinc-900 text-sky-400">SUPER_ADMIN (Full Console Access)</option>
                    <option value="CORE_MEMBER" className="bg-zinc-900 text-purple-400">CORE_MEMBER (High Priority)</option>
                    <option value="MEMBER" className="bg-zinc-900 text-zinc-200">MEMBER (Standard)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => handleFieldChange(setStatus, e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-100 focus:outline-hidden focus:border-purple-500 cursor-pointer appearance-none shadow-xs"
                  >
                    <option value="ACTIVE" className="bg-zinc-900 text-emerald-400">ACTIVE (Normal Access)</option>
                    <option value="SUSPENDED" className="bg-zinc-900 text-amber-400">SUSPENDED (Temporarily Paused)</option>
                    <option value="BLOCKED" className="bg-zinc-900 text-rose-400">BLOCKED (Access Denied)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>Feature & Action Permissions</span>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <div className="text-xs font-medium text-zinc-200">Submit IPO Applications</div>
                      <div className="text-[11px] text-zinc-500">Allow submitting solo and multi-user applications</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canSubmitApplications)}
                      onChange={() => handlePermissionToggle("canSubmitApplications")}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <div className="text-xs font-medium text-zinc-200">Access Admin Console</div>
                      <div className="text-[11px] text-zinc-500">Allow login to the Orbit administrative control center</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canAccessAdminConsole)}
                      onChange={() => handlePermissionToggle("canAccessAdminConsole")}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <div className="text-xs font-medium text-zinc-200">Publish Profit Distributions</div>
                      <div className="text-[11px] text-zinc-500">Allow calculating and committing realized returns</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canDistributeProfit)}
                      onChange={() => handlePermissionToggle("canDistributeProfit")}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <div className="text-xs font-medium text-zinc-200">Manage Members & Roles</div>
                      <div className="text-[11px] text-zinc-500">Allow creating, editing, and resetting member credentials</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(permissions.canManageMembers)}
                      onChange={() => handlePermissionToggle("canManageMembers")}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-purple-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-100">Set / Reset Password</h4>
                      <p className="text-[11px] text-zinc-400">Securely updates credentials with salted scrypt hashing</p>
                    </div>
                  </div>
                  {member.lastPasswordResetAt && (
                    <span className="text-[10.5px] font-mono text-zinc-500">
                      Last reset: {new Date(member.lastPasswordResetAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>

                {updatedSuccessPassword ? (
                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Password Updated Successfully</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
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
                        🔒 <span className="font-medium text-zinc-300">Security Notice:</span> Once you close this modal, this plaintext password will no longer be stored or retrievable.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setUpdatedSuccessPassword(null)}
                      variant="outline"
                      className="w-full text-xs h-8 rounded-xl border-zinc-800 text-zinc-300"
                    >
                      Set Another Password
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Current Credential Status */}
                    <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-zinc-400 font-medium">Current Password</div>
                        <div className="font-mono text-zinc-300 text-xs tracking-widest mt-0.5">••••••••••••</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active (Encrypted)
                        </span>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Algorithm: scrypt (Salted)</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
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

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 block">
                        New Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new strong password"
                          disabled={isResettingPassword}
                          className="pr-10 h-10 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-rose-500"
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

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
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
                        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex gap-1">
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 1 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 2 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 3 ? strength.color : "bg-zinc-800")} />
                          <div className={cn("h-full flex-1 rounded-full transition-all", strength.score >= 4 ? strength.color : "bg-zinc-800")} />
                        </div>
                      </div>
                    )}

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300 block">
                        Confirm New Password
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        disabled={isResettingPassword}
                        className="h-10 bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-100 rounded-xl focus-visible:ring-rose-500"
                      />
                    </div>

                    {passwordFeedback && (
                      <div className={cn(
                        "p-2.5 rounded-xl text-xs flex items-center gap-2",
                        passwordFeedback.type === "success"
                          ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                          : "bg-rose-950/40 border border-rose-800 text-rose-300"
                      )}>
                        {passwordFeedback.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        )}
                        <span>{passwordFeedback.message}</span>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={handleResetPasswordSubmit}
                      disabled={isResettingPassword || !newPassword || newPassword !== confirmPassword}
                      className="w-full h-10 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      {isResettingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      Update Password Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCloseRequest}
            disabled={isSubmitting}
            className="text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-xl"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2.5">
            {isDirty && (
              <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Unsaved changes
              </span>
            )}

            <Button
              type="button"
              onClick={handleSaveGeneral}
              disabled={isSubmitting || usernameStatus === "unavailable" || usernameStatus === "checking"}
              className="text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl px-5 h-9 cursor-pointer disabled:opacity-40 shadow-xs"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Member Details
            </Button>
          </div>
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        {showUnsavedPrompt && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <div className="max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100">Unsaved Changes</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    You have modified member fields that have not been saved yet.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUnsavedPrompt(false)}
                  className="text-xs rounded-xl border-zinc-800 text-zinc-300"
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
                  className="text-xs rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
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
