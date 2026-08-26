import { redirect } from "next/navigation";

interface ActivityDetailRedirectProps {
  params: Promise<{ id: string }>;
}

export default async function ActivityDetailRedirectPage({ params }: ActivityDetailRedirectProps) {
  const { id } = await params;
  redirect(`/ad/audit/${id}`);
}
