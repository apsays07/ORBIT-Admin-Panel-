import { redirect } from "next/navigation";

interface DistributeProfitPageProps {
  searchParams: Promise<{
    ipoId?: string;
    q?: string;
  }>;
}

export default async function DistributeProfitPage({ searchParams }: DistributeProfitPageProps) {
  const resolvedParams = await searchParams;
  const params = new URLSearchParams();
  if (resolvedParams.ipoId) params.set("ipoId", resolvedParams.ipoId);
  if (resolvedParams.q) params.set("q", resolvedParams.q);

  const queryStr = params.toString();
  redirect(`/ad/profit${queryStr ? `?${queryStr}` : ""}`);
}
