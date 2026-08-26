import { redirect } from "next/navigation";

interface ActivityPageProps {
  searchParams: Promise<{
    q?: string;
    eventType?: string;
    category?: string;
    severity?: string;
    page?: string;
  }>;
}

export default async function ActivityRedirectPage({ searchParams }: ActivityPageProps) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedParams.q) params.set("q", resolvedParams.q);
  if (resolvedParams.eventType) params.set("eventType", resolvedParams.eventType);
  if (resolvedParams.category) params.set("category", resolvedParams.category);
  if (resolvedParams.severity) params.set("severity", resolvedParams.severity);
  if (resolvedParams.page) params.set("page", resolvedParams.page);

  const queryStr = params.toString();
  redirect(`/ad/audit${queryStr ? `?${queryStr}` : ""}`);
}
