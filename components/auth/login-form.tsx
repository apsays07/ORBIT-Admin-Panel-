"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Database,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Layers,
  Sparkles,
  PieChart,
  Coins,
  TrendingUp,
  Activity,
  X,
  HelpCircle,
} from "lucide-react";
import { loginAdmin, LoginResult } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  dbStatus: "connected" | "disconnected" | "missing_config";
}

export function LoginForm({ dbStatus }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(
    loginAdmin,
    null
  );

  useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  // Ecosystem stages for the visual pipeline
  const ecosystemStages = [
    {
      label: "Application",
      desc: "Intake & verification",
      icon: Layers,
      highlight: "100% Verified",
    },
    {
      label: "Allocation",
      desc: "Algorithmic distribution",
      icon: PieChart,
      highlight: "Auto-Balanced",
    },
    {
      label: "Investment",
      desc: "Syndicate capital pool",
      icon: Coins,
      highlight: "Escrowed",
    },
    {
      label: "Performance",
      desc: "Real-time yield & metrics",
      icon: TrendingUp,
      highlight: "Live Tracking",
    },
    {
      label: "Insights",
      desc: "Audit & governance",
      icon: Activity,
      highlight: "Compliant",
    },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-600/30 selection:text-white relative overflow-hidden">
      {/* Background Subtle Ambient Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.05),rgba(255,255,255,0))]" />
      </div>

      {/* ========================================================================= */}
      {/* LEFT SIDE — ORBIT BRAND EXPERIENCE (~52% on Desktop) */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 lg:w-[52%] lg:max-w-[55%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl">
        {/* Subtle Orbital Vector Graphic Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]"
            viewBox="0 0 600 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="300"
              cy="300"
              r="240"
              stroke="#27272a"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <circle
              cx="300"
              cy="300"
              r="170"
              stroke="#27272a"
              strokeWidth="1"
            />
            <circle
              cx="300"
              cy="300"
              r="100"
              stroke="#3f3f46"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            {/* Orbital Nodes */}
            <circle cx="300" cy="60" r="3.5" fill="#3b82f6" />
            <circle cx="470" cy="300" r="3" fill="#60a5fa" />
            <circle cx="200" cy="300" r="2.5" fill="#71717a" />
            <circle cx="300" cy="470" r="3.5" fill="#3b82f6" />
          </svg>
        </div>

        {/* Top: ORBIT Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Refined Orbit Icon Mark */}
            <div className="h-10 w-10 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-center shadow-inner relative group">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-blue-400 transition-transform duration-300 group-hover:scale-105"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.9" />
                <ellipse
                  cx="12"
                  cy="12"
                  rx="9"
                  ry="3.8"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  transform="rotate(-28 12 12)"
                />
                <circle cx="18.5" cy="8.5" r="1.5" fill="#93c5fd" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-100 font-sans">
                ORBIT
              </span>
              <span className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-medium">
                FINANCIAL TECHNOLOGY
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>OPERATIONAL</span>
          </div>
        </div>

        {/* Middle: Brand Positioning & Ecosystem Pipeline */}
        <div className="relative z-10 my-10 lg:my-0 max-w-xl space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Institutional Syndicate Infrastructure</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-white tracking-tight leading-[1.18]">
              Intelligent IPO Operations.
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg font-normal">
              Manage applications, allocations, members, and performance from one unified, secure platform designed for high-precision syndicate management.
            </p>
          </div>

          {/* Ecosystem Pipeline Visualization */}
          <div className="space-y-2.5 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 font-mono">
              The Orbit Ecosystem
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {ecosystemStages.map((stage, idx) => {
                const Icon = stage.icon;
                return (
                  <div
                    key={stage.label}
                    className="relative group p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className="h-4 w-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                      <span className="text-[9px] font-mono text-zinc-500 group-hover:text-zinc-400">
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-200">
                      {stage.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {stage.desc}
                    </div>
                    <div className="mt-2 text-[9px] font-mono text-blue-400/90 bg-blue-500/10 px-1.5 py-0.5 rounded inline-block">
                      {stage.highlight}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Left: Trust & Security Indicators */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900/80 text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
              <span>TLS 1.3 / Strict Auth</span>
            </span>
            <span className="h-3 w-[1px] bg-zinc-800" />
            <span>Multi-Account Governance</span>
          </div>

          <div className="text-[11px] font-mono text-zinc-600">
            SEC-OPS 2.4
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE — AUTHENTICATION EXPERIENCE (~48% on Desktop) */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 lg:w-[48%] flex flex-col justify-between p-6 sm:p-12 lg:p-16">
        <div className="hidden lg:block self-end">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Database className="h-3.5 w-3.5 text-zinc-500" />
            <span>DB:</span>
            {dbStatus === "connected" ? (
              <span className="text-emerald-400 font-medium font-sans flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : dbStatus === "disconnected" ? (
              <span className="text-rose-400 font-medium font-sans flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Disconnected
              </span>
            ) : (
              <span className="text-amber-400 font-medium font-sans flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Missing Config
              </span>
            )}
          </div>
        </div>

        {/* Central Login Card */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Header */}
          <div className="mb-8 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal">
              Sign in to continue to ORBIT
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5" noValidate>
            {/* Inline Error Notice (Smooth, non-shifting space) */}
            <div
              className={cn(
                "transition-all duration-200 overflow-hidden",
                state?.error ? "max-h-24 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0 pointer-events-none"
              )}
              aria-live="polite"
            >
              <div className="flex items-center gap-2.5 p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-xl font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{state?.error || "Invalid credentials. Please try again."}</span>
              </div>
            </div>

            {/* Username or Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="text-xs font-medium text-zinc-300 flex items-center justify-between"
              >
                <span>Username or Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  autoFocus
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  disabled={isPending}
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 text-sm text-zinc-100 placeholder:text-zinc-500 rounded-xl focus:outline-hidden focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-300 flex items-center justify-between"
              >
                <span>Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isPending}
                  className="w-full h-11 pl-10 pr-10 bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 text-sm text-zinc-100 placeholder:text-zinc-500 rounded-xl focus:outline-hidden focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40 disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-hidden transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500/40 focus:ring-offset-0 cursor-pointer accent-blue-600"
                />
                <span className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors cursor-pointer focus:outline-hidden"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 mt-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all duration-150 cursor-pointer select-none focus:outline-hidden focus:ring-2 focus:ring-blue-500/50"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-white/90" />
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span>Sign in to ORBIT</span>
                  <ArrowRight className="h-4 w-4 text-white/80" />
                </span>
              )}
            </button>
          </form>

          {/* Security Assurance Badge */}
          <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-center gap-2 text-xs text-zinc-500 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Secure ORBIT authentication</span>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600 pt-6 border-t border-zinc-900/60">
          <div className="flex items-center gap-2">
            <span>© 2026 ORBIT</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>Syndicate Platform</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hover:text-zinc-400 transition-colors">
              Secure Access
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span className="font-mono text-[11px]">v2.4.0</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL (Accessible, authentic guidance) */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-pw-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100" id="forgot-pw-title">
                <HelpCircle className="h-4 w-4 text-blue-400" />
                <span>Account Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              For security compliance, credentials for the ORBIT Syndicate platform are managed by your organization&apos;s system administrator or security officer.
            </p>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-1 font-mono">
              <div className="text-[11px] text-zinc-500">Default Sandbox Admin:</div>
              <div>Username: <span className="text-blue-400">ankitgod</span></div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
