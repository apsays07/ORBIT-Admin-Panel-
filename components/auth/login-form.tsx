"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { loginAdmin, LoginResult } from "@/lib/auth/actions";

interface LoginFormProps {
  dbStatus: "connected" | "disconnected" | "missing_config";
}

export function LoginForm({ dbStatus }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [state, formAction, isPending] = useActionState<LoginResult | null, FormData>(
    loginAdmin,
    null
  );

  useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  return (
    <div className="w-full max-w-md space-y-6 font-sans">
      <div className="flex flex-col items-center text-center space-y-1.5">
        <div className="h-11 w-11 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 flex items-center justify-center shadow-md">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          ORBIT
        </h1>
        <p className="text-xs font-medium tracking-wider uppercase text-zinc-400">
          Admin Portal
        </p>
      </div>

      <Card className="shadow-2xl border-zinc-800/80 bg-zinc-950/90 rounded-2xl backdrop-blur-md">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold text-zinc-100 tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Sign in to access your investment syndicate & admin controller.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-xl animate-in fade-in-50 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="text-xs font-medium text-zinc-300"
              >
                Username or Email
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ankitgod"
                className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-blue-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-300"
              >
                Passkey or Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-10 bg-zinc-900/80 border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-500 rounded-xl focus-visible:ring-blue-500/30"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer tracking-tight"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pt-3 pb-4 px-6 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Database className="h-3.5 w-3.5 text-zinc-500" />
            <span>DB:</span>
            {dbStatus === "connected" ? (
              <span className="text-emerald-400 font-medium">Connected</span>
            ) : dbStatus === "disconnected" ? (
              <span className="text-rose-400 font-medium">Disconnected</span>
            ) : (
              <span className="text-amber-400 font-medium">Missing Config</span>
            )}
          </div>

          <span className="text-[11px] text-zinc-500 font-mono">NEXO v2.4.0</span>
        </CardFooter>
      </Card>
    </div>
  );
}
