import React from "react";
import type { Metadata } from "next";
import { getMemberPerformanceRecords } from "@/lib/member/actions";
import { PerformanceView } from "@/components/performance/performance-view";

export const metadata: Metadata = {
  title: "Performance",
};

export default async function PerformancePage() {
  const categories = await getMemberPerformanceRecords();

  return <PerformanceView categories={categories} />;
}
