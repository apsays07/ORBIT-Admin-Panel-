import { redirect } from "next/navigation";
import { validateSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionResult = await validateSession();
  if (sessionResult.authenticated) {
    redirect("/ad/ipo");
  } else {
    redirect("/ad/login");
  }
}
