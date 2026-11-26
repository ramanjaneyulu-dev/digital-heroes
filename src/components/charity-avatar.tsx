import { initials } from "@/lib/charities";

// Shows the charity's picture, or a coloured initials tile when it has none.
export function CharityImage({ name, url, className = "" }: { name: string; url: string | null; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`object-cover ${className}`} />;
  }
  return (
    <div aria-hidden className={`flex items-center justify-center bg-gradient-to-br from-emerald-600/30 to-teal-900/40 text-4xl font-semibold text-emerald-200 ${className}`}>
      {initials(name)}
    </div>
  );
}
