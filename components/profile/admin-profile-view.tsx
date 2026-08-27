"use client";

import React, { useState } from "react";
import { AdminProfileData } from "@/types/profile";
import { changeAdminPassword } from "@/lib/profile/actions";
import {
  User, Shield, Mail, Phone, CheckCircle2,
  KeyRound, Eye, EyeOff, Loader2, Check, AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function AdminProfileView({ initialData }: { initialData: AdminProfileData | null }) {
  const toast = useToast();
  const member = initialData?.member;

  // Password change state
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (newPass.length < 6) {
      const msg = "New password must be at least 6 characters.";
      setResult({ ok: false, msg });
      toast.error("Invalid Password", msg);
      return;
    }
    if (newPass !== confirmPass) {
      const msg = "Passwords do not match.";
      setResult({ ok: false, msg });
      toast.error("Password Mismatch", msg);
      return;
    }

    setSaving(true);
    const res = await changeAdminPassword(currentPass, newPass);
    setSaving(false);

    if (res.success) {
      setResult({ ok: true, msg: "Password updated successfully." });
      toast.success("Password Updated", "Your admin credentials were updated successfully.");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } else {
      const msg = res.error || "Failed to update password.";
      setResult({ ok: false, msg });
      toast.error("Password Update Failed", msg);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-900">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <User className="h-6 w-6 text-blue-500" />
            <span>Admin Profile</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Administrative account credentials, syndicate permissions, and session controller.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{member?.role || "SUPER_ADMIN"}</span>
          </span>
        </div>
      </div>

      {/* Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-zinc-900/50 border-zinc-800 p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-2xl flex items-center justify-center shadow-lg border border-blue-500/40">
            {member?.name ? member.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-100">{member?.name || "Admin"}</h2>
            <p className="text-xs text-blue-400 font-mono">@{member?.username || "admin"}</p>
          </div>
          <div className="w-full pt-4 border-t border-zinc-800 text-left space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Full System Privileges</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Two-Factor Secured</span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-sm font-semibold text-zinc-200">Account Identity</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Display Name</span>
                <span className="text-sm font-semibold text-zinc-100">{member?.name || "Ankit"}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Username</span>
                <span className="text-sm font-semibold text-zinc-100 font-mono">@{member?.username || "ankitgod"}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Email Address</span>
                <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{member?.email || "admin@nexo.internal"}</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Primary Contact</span>
                <div className="flex items-center gap-1.5 text-zinc-200 font-medium">
                  <Phone className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{member?.phone || "+91 98765 43210"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800/80">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-400" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium block">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full h-9 px-3 pr-9 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  className="w-full h-9 px-3 pr-9 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium block">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full h-9 px-3 pr-9 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmPass && (
                <p className={`text-[11px] flex items-center gap-1 ${newPass === confirmPass ? "text-emerald-400" : "text-rose-400"}`}>
                  {newPass === confirmPass
                    ? <><Check className="h-3 w-3" /> Passwords match</>
                    : <><AlertCircle className="h-3 w-3" /> Passwords do not match</>
                  }
                </p>
              )}
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                result.ok
                  ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/30 border-rose-800/60 text-rose-300"
              }`}>
                {result.ok
                  ? <Check className="h-3.5 w-3.5 shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {result.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
