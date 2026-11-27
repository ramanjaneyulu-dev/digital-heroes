import { AppBar } from "@/components/app-bar";

// Every /admin/* page gets the same sticky app bar. Access control stays in each page
// (requireAdmin) and in the proxy, so this layout only draws the navigation.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBar section="admin" isAdmin />
      {children}
    </>
  );
}
