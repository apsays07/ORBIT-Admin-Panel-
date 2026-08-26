import { Metadata } from "next";
import { getAdminProfile } from "@/lib/profile/actions";
import { AdminProfileView } from "@/components/profile/admin-profile-view";

export const metadata: Metadata = {
  title: "Admin Profile",
  description: "Account settings and admin profile controller.",
};

export default async function AdminProfilePage() {
  const data = await getAdminProfile();
  return <AdminProfileView initialData={data ? JSON.parse(JSON.stringify(data)) : null} />;
}
