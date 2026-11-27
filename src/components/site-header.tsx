import { getProfile } from "@/lib/auth";
import { SiteHeaderClient } from "@/components/site-header-client";

// Shared top bar for public pages. The server part only looks up who is signed in;
// the interactive part (active links, mobile menu) lives in site-header-client.tsx.
export async function SiteHeader() {
  const profile = await getProfile();
  return <SiteHeaderClient loggedIn={!!profile} isAdmin={profile?.role === "admin"} />;
}
