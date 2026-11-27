// The tab bar now lives in the sticky AppBar mounted by src/app/dashboard/layout.tsx.
// Kept as a no-op so the existing <DashboardNav current="..." /> calls in each page stay valid.
export function DashboardNav(props: { current: string }) {
  void props;
  return null;
}
