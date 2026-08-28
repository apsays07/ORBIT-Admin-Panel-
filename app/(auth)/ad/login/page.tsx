import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getDatabaseConnectionStatus } from "@/lib/db/mongodb";
import { validateSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Login",
};

interface AdminLoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    reason?: string;
  }>;
}

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedParams = await searchParams;
  const redirectTarget = resolvedParams?.redirect || "";
  const reason = resolvedParams?.reason || "";

  // If already authenticated, redirect directly to dashboard / requested route
  const sessionResult = await validateSession();
  if (sessionResult.authenticated) {
    const validTarget = redirectTarget.startsWith("/") ? redirectTarget : "/ad/ipo";
    redirect(validTarget);
  }

  const dbStatus = await getDatabaseConnectionStatus();

  return (
    <main className="min-h-screen w-full bg-zinc-950 flex flex-col">
      <LoginForm
        dbStatus={dbStatus}
        initialRedirect={redirectTarget}
        initialReason={reason}
      />
    </main>
  );
}
