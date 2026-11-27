import { getProfile } from "@/lib/auth";
import { AppBar } from "@/components/app-bar";

// Every /dashboard/* page gets the same sticky app bar. Layouts stay mounted while people
// move between sub-pages, so this lookup runs once, not on every click.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return (
    <>
      <AppBar section="dashboard" isAdmin={profile?.role === "admin"} />
      {children}
    </>
  );
}
