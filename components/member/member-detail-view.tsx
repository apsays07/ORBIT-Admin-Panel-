"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MemberDetailResponse, updateMemberStatus } from "@/lib/member/actions";
import { MemberData } from "@/types/member";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  FileSpreadsheet,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  CreditCard,
  MapPin,
  Lock,
  Building,
  KeyRound,
  Shield,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Users,
  MoreHorizontal,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { EditMemberModal } from "@/components/member/edit-member-modal";
import { DeleteMemberModal } from "@/components/member/delete-member-modal";
import { ResetPasswordModal } from "@/components/member/reset-password-modal";
import { cn } from "@/lib/utils";

interface MemberDetailViewProps {
  data: MemberDetailResponse;
}

type TabKey = "overview" | "applications" | "pans" | "activity" | "payouts";

export function MemberDetailView({ data }: MemberDetailViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [member, setMember] = useState<MemberData>(data.member);
  const {
    applications,
    payouts,
    soloApplicationsCount,
    combinedApplicationsCount,
    totalCapitalDeployed,
    panRecords,
    activityTimeline,
  } = data;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [currentStatus, setCurrentStatus] = useState(member.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState<"manual" | "generate">("manual");

  async function handleStatusChange(newStatus: string) {
    setIsUpdatingStatus(true);
    const res = await updateMemberStatus(member.id, newStatus);
    setIsUpdatingStatus(false);
    setIsMoreMenuOpen(false);

    if (res.success) {
      setCurrentStatus(newStatus);
      setMember((prev) => ({ ...prev, status: newStatus }));
      toast.success(
        "Status Updated",
        `Member status changed to ${newStatus}.`
      );
      router.refresh();
    } else {
      toast.error("Status Update Failed", res.error || "Failed to update status.");
    }
  }

  function handleMemberUpdated(updated: MemberData) {
    setMember(updated);
    setCurrentStatus(updated.status);
    router.refresh();
  }

  function handleMemberDeleted() {
    router.push("/ad/members");
  }

  function getStatusBadge(status: string) {
    if (status === "ACTIVE" || status === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      );
    }
    if (status === "SUSPENDED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans">
          <Clock className="h-3 w-3" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-sans">
        <XCircle className="h-3 w-3" />
        Blocked
      </span>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <Link href="/ad/members">
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 px-2.5 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Members
            </Button>
          </Link>
          <MemberAvatar
            src={member.avatar}
            name={member.name}
            className="h-12 w-12 rounded-2xl border border-zinc-800 text-sm shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold text-zinc-100 tracking-tight">{member.name}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 border border-zinc-700">
                @{member.username}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">ID: {member.id}</p>
          </div>
        </div>

        {/* Header Action Cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          {getStatusBadge(currentStatus)}

          <Button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="h-8.5 px-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Member</span>
          </Button>

          {/* More Actions Dropdown Menu */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="h-8.5 px-2.5 text-xs border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:text-white rounded-xl cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-50 text-xs space-y-1 animate-in fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsResetPasswordOpen(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-xl text-zinc-200 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                  <span>Reset Password</span>
                </button>

                <div className="border-t border-zinc-900 my-1" />

                {currentStatus !== "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("ACTIVE")}
                    disabled={isUpdatingStatus}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl text-emerald-400 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Set Active</span>
                  </button>
                )}

                {currentStatus !== "SUSPENDED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("SUSPENDED")}
                    disabled={isUpdatingStatus}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl text-amber-400 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Suspend Account</span>
                  </button>
                )}

                {currentStatus !== "BLOCKED" && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("BLOCKED")}
                    disabled={isUpdatingStatus}
                    className="w-full px-2.5 py-1.5 text-left rounded-xl text-rose-400 hover:bg-zinc-900 flex items-center gap-2 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Block Account</span>
                  </button>
                )}

                <div className="border-t border-zinc-900 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-left rounded-xl text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete / Deactivate</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-zinc-800/80 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
            activeTab === "overview"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          )}
        >
          <User className="h-3.5 w-3.5 text-sky-400" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("applications")}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
            activeTab === "applications"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
          <span>Applications ({applications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pans")}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
            activeTab === "pans"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          )}
        >
          <CreditCard className="h-3.5 w-3.5 text-amber-400" />
          <span>PAN Records ({panRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
            activeTab === "activity"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          )}
        >
          <Activity className="h-3.5 w-3.5 text-purple-400" />
          <span>Activity Timeline ({activityTimeline.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payouts")}
          className={cn(
            "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
            activeTab === "payouts"
              ? "bg-zinc-800 text-zinc-100 shadow-xs"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          )}
        >
          <Coins className="h-3.5 w-3.5 text-emerald-400" />
          <span>Profit Payouts ({payouts.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1 rounded-2xl shadow-xs">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
                TOTAL APPLICATIONS
              </span>
              <div className="text-2xl font-semibold text-zinc-100 t-num">
                {applications.length}
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                {soloApplicationsCount} Solo • {combinedApplicationsCount} Combined
              </p>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1 rounded-2xl shadow-xs">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-sky-400" />
                CAPITAL DEPLOYED
              </span>
              <div className="text-2xl font-semibold text-zinc-100 t-num">
                ₹{totalCapitalDeployed.toLocaleString("en-IN")}
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Across {member.iposAppliedCount || 0} IPO offerings
              </p>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1 rounded-2xl shadow-xs">
              <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-emerald-400" />
                PROFIT EARNED
              </span>
              <div className="text-2xl font-semibold text-emerald-400 t-num">
                ₹{(member.totalProfitEarned || 0).toLocaleString("en-IN")}
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5">
                Across {payouts.length} payout distributions
              </p>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-1 rounded-2xl shadow-xs">
              <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider block flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                ACCOUNT ROLE
              </span>
              <div className="text-[15px] font-semibold text-purple-300">
                {member.role.replace("_", " ")}
              </div>
              <p className="text-[11.5px] text-zinc-400 mt-0.5 truncate">
                Member since {member.joinedAt || "Jan 2025"}
              </p>
            </Card>
          </div>

          {/* Profile & KYC Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile & Contact Details */}
            <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-400" />
                    <span>Profile & Contact</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer font-normal flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60 font-sans">
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-500">Display Name</span>
                  <span className="font-semibold text-zinc-200">{member.name}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Username</span>
                  <span className="text-zinc-200 font-mono font-medium">@{member.username}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Email</span>
                  <span className="text-zinc-200">{member.email || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Phone</span>
                  <span className="text-zinc-200 font-mono">{member.phone || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Street Address</span>
                  <span className="text-zinc-200 text-right max-w-xs">{member.address || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">City / State / PIN</span>
                  <span className="text-zinc-200">
                    {[member.city, member.state, member.pincode].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Financial & KYC Information */}
            <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-amber-400" />
                    <span>Financial & KYC Details</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer font-normal flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60 font-sans">
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-500">PAN Card</span>
                  <span className="text-zinc-200 font-mono font-medium">{member.panFull || member.panMasked || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Default Contribution</span>
                  <span className="text-zinc-200 font-mono font-medium">
                    {member.defaultContribution ? `₹${member.defaultContribution.toLocaleString("en-IN")}` : "₹15,000"}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Bank Name</span>
                  <span className="text-zinc-200">{member.bankName || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Account Number</span>
                  <span className="text-zinc-200 font-mono">{member.accountNumber || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">IFSC Code</span>
                  <span className="text-zinc-200 font-mono uppercase">{member.ifscCode || "—"}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">UPI ID</span>
                  <span className="text-zinc-200 font-mono">{member.upiId || "—"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Settings & Security Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  <span>Permissions & Authority</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs font-sans">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-300">Submit Applications</span>
                  <span className="text-emerald-400 font-semibold">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-300">Access Admin Console</span>
                  <span className="font-semibold text-zinc-200">
                    {member.role === "SUPER_ADMIN" ? "Full Access" : "Restricted"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <span className="text-zinc-300">Manage Syndicate Members</span>
                  <span className="font-semibold text-zinc-200">
                    {member.role === "SUPER_ADMIN" ? "Full Control" : "Disabled"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <CardTitle className="text-[14.5px] font-semibold text-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-400" />
                    <span>Login Credentials & Security</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordResetMode("generate");
                        setIsResetPasswordOpen(true);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer font-normal flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Generate
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordResetMode("manual");
                        setIsResetPasswordOpen(true);
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer font-normal flex items-center gap-1"
                    >
                      <KeyRound className="h-3 w-3" /> Change
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-zinc-300 divide-y divide-zinc-800/60 font-sans">
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-500">Username Handle</span>
                  <span className="text-zinc-200 font-mono font-medium">@{member.username}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Display Name</span>
                  <span className="text-zinc-200 font-medium">{member.name}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-zinc-500">Password Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] text-emerald-400 font-medium">
                      Password Configured
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-zinc-500">Login Access</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10.5px] font-medium",
                    currentStatus === "ACTIVE"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  )}>
                    {currentStatus === "ACTIVE" ? "Login Enabled" : "Login Disabled"}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Hashing Standard</span>
                  <span className="text-zinc-200 font-mono">PBKDF2-HMAC-SHA512 (100k iter)</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Last Password Updated</span>
                  <span className="text-zinc-200 font-mono">
                    {member.passwordUpdatedAt || member.lastPasswordResetAt
                      ? new Date(member.passwordUpdatedAt || member.lastPasswordResetAt!).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Initial Setup"}
                  </span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-zinc-500">Account Created</span>
                  <span className="text-zinc-200 font-mono">
                    {member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                  </span>
                </div>
                <div className="pt-2.5 text-[11px] text-zinc-500 leading-relaxed">
                  🔒 Passwords are cryptographically salted and hashed. Plaintext passwords cannot be viewed or retrieved.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === "applications" && (
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                <span>Associated IPO Applications ({applications.length})</span>
              </CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                Complete log of solo and pooled applications linked to @{member.username}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {applications.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <FileSpreadsheet className="h-8 w-8 mx-auto text-zinc-600" />
                <p>No applications submitted by this member yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px] text-zinc-300 font-sans">
                <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4">Offering / IPO</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">PAN Cards</th>
                    <th className="py-3.5 px-3">Member Capital</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Applied Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {applications.map((app) => {
                    const isCombined = Boolean(app.contributors && app.contributors.length > 0);
                    const userContrib = isCombined
                      ? app.contributors?.find((c) => c.memberId === member.id)?.amount || 0
                      : app.totalContribution || 0;

                    return (
                      <tr key={app.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-zinc-100">
                          {app.ipoName}
                        </td>

                        <td className="py-3.5 px-3">
                          {isCombined ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Users className="h-3 w-3" />
                              Combined ({app.contributors?.length})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-zinc-800 text-zinc-300">
                              Solo
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-zinc-300 font-mono text-xs">
                          {app.panNumbers?.[0] || "—"}
                          {Array.isArray(app.panNumbers) && app.panNumbers.length > 1 && (
                            <span className="text-zinc-500 ml-1">+{app.panNumbers.length - 1}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-zinc-100 font-semibold t-num font-sans">
                          ₹{userContrib.toLocaleString("en-IN")}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                            {app.status || "AWAITING"}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-zinc-400 text-xs font-mono">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/ad/applications/${app.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/30 gap-1 rounded-lg">
                              <span>Inspect</span>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: PAN RECORDS */}
      {activeTab === "pans" && (
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold text-zinc-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <span>PAN Cards & Identity Records ({panRecords.length})</span>
              </CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                All PAN cards and associated application links for @{member.username}
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs border-zinc-800 hover:bg-zinc-800 text-amber-400 rounded-xl"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Manage Primary PAN
            </Button>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {panRecords.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <CreditCard className="h-8 w-8 mx-auto text-zinc-600" />
                <p>No PAN records found for this member.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px] text-zinc-300 font-sans">
                <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800 font-mono">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">PAN Number</th>
                    <th className="py-3.5 px-4">Source / Context</th>
                    <th className="py-3.5 px-3">Capital Deployed</th>
                    <th className="py-3.5 px-3">Record Status</th>
                    <th className="py-3.5 px-4 text-right">Linked Application</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {panRecords.map((panRec, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-500 text-xs">
                        {String(idx + 1).padStart(2, "0")}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-100 tracking-wider uppercase">
                        {panRec.pan}
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300 text-xs">
                        {panRec.sourceIpoName || "General Syndicate Pool"}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-zinc-200">
                        {panRec.contribution ? `₹${panRec.contribution.toLocaleString("en-IN")}` : "—"}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          {panRec.status || "VERIFIED"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {panRec.sourceApplicationId ? (
                          <Link href={`/ad/applications/${panRec.sourceApplicationId}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-400 hover:text-sky-300">
                              <span>View App</span>
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-zinc-500 text-xs font-mono">Primary KYC</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ACTIVITY TIMELINE */}
      {activeTab === "activity" && (
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[15px] font-semibold text-zinc-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Member Audit Timeline ({activityTimeline.length})</span>
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">
              Historical timeline of administrative operations, edits, and security events for @{member.username}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {activityTimeline.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No activity records logged for this member yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
                {activityTimeline.map((item) => (
                  <div key={item.id} className="relative group">
                    <span className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-zinc-950 bg-purple-500 ring-2 ring-purple-500/20" />
                    <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-zinc-100">
                          {item.title}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {new Date(item.timestamp).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {item.subtitle && (
                        <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                          {item.subtitle}
                        </p>
                      )}

                      <div className="pt-1 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span>Actor: {item.actorUsername}</span>
                        <span>•</span>
                        <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                          {item.eventType}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 5: PROFIT PAYOUTS */}
      {activeTab === "payouts" && (
        <Card className="bg-zinc-900/50 border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <CardTitle className="text-[15px] font-semibold text-zinc-100 flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-400" />
              <span>Realized Profit Payouts ({payouts.length})</span>
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-0.5">
              Historical list of realized return distributions committed to @{member.username}
            </p>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {payouts.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 space-y-2">
                <Coins className="h-8 w-8 mx-auto text-zinc-600" />
                <p>No profit distributions committed to this member yet.</p>
              </div>
            ) : (
              <table className="w-full text-left text-[13px] text-zinc-300 font-sans">
                <thead className="bg-zinc-950/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-800 font-mono">
                  <tr>
                    <th className="py-3.5 px-4">Offering / IPO</th>
                    <th className="py-3.5 px-3">Capital Pooled</th>
                    <th className="py-3.5 px-3 text-center">Applied Lots</th>
                    <th className="py-3.5 px-4 text-right">Profit Received (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {payouts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-zinc-100">
                        {p.ipoName}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-200 t-num">
                        ₹{p.contribution.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-3 text-center text-zinc-300 font-mono">
                        {Number.isInteger(p.lots) ? p.lots : p.lots.toFixed(2)} Lots
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono text-sm t-num">
                        ₹{p.profit.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && (
        <EditMemberModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          member={member}
          onUpdated={handleMemberUpdated}
        />
      )}

      {/* Reset Password Modal */}
      {isResetPasswordOpen && (
        <ResetPasswordModal
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          member={member}
          initialMode={passwordResetMode}
        />
      )}

      {/* Delete / Deactivate Member Modal */}
      {isDeleteModalOpen && (
        <DeleteMemberModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          member={member}
          onDeleted={handleMemberDeleted}
        />
      )}
    </div>
  );
}
