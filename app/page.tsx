import React from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getDatabaseConnectionStatus } from "@/lib/db/mongodb";

export const metadata: Metadata = {
  title: "Login",
};

export default async function HomePage() {
  const dbStatus = await getDatabaseConnectionStatus();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <LoginForm dbStatus={dbStatus} />
    </main>
  );
}
