// The tab bar now lives in the sticky AppBar mounted by src/app/admin/layout.tsx.
// Kept as a no-op so the existing <AdminNav current="..." /> calls in each page stay valid.
export function AdminNav(props: { current: string }) {
  void props;
  return null;
}
