import React from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { NavigationProgressBar } from "@/components/layout/nav-progress-bar";
import { getDatabaseConnectionStatus } from "@/lib/db/mongodb";
import { validateSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await validateSession();

  if (!sessionResult.authenticated || !sessionResult.user) {
    if (sessionResult.reason === "EXPIRED") {
      redirect("/ad/login?reason=expired");
    }
    redirect("/ad/login");
  }

  const userEmail = sessionResult.user;
  const dbStatus = await getDatabaseConnectionStatus();

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <React.Suspense fallback={null}>
        <NavigationProgressBar />
      </React.Suspense>
      {/* Persistent Sidebar */}
      <AdminSidebar userEmail={userEmail} dbStatus={dbStatus} />

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-zinc-950">
        <AdminHeader userEmail={userEmail} />
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
