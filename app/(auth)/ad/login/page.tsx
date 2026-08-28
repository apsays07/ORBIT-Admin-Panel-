import React from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getDatabaseConnectionStatus } from "@/lib/db/mongodb";

export const metadata: Metadata = {
  title: "Login",
};

export default async function AdminLoginPage() {
  const dbStatus = await getDatabaseConnectionStatus();

  return (
    <main className="min-h-screen w-full bg-zinc-950 flex flex-col">
      <LoginForm dbStatus={dbStatus} />
    </main>
  );
}
