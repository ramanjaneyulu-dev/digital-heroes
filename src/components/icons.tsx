// Crisp inline SVG icons + category emblems used across the upgraded UI.
// No external icon library: every glyph is a tiny <svg> so `npm run build` stays fast.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

/* Brand mark: a rising green dot inside a soft ring (used in headers + footer). */
export function BrandMark({ size = 20, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...rest}>
      <circle cx="12" cy="12" r="9" stroke="rgb(16 185 129 / 0.4)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" fill="rgb(52 211 153)" />
      <circle cx="12" cy="12" r="9" stroke="rgb(167 243 208 / 0.5)" strokeWidth="0.75" />
    </svg>
  );
}

/* Trust badges (used on auth pages). */
export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
    </svg>
  );
}

/* Step icons for the home "How it works" cards. */
export function HeartHandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
      <path d="M12 11v4M10 13h4" />
    </svg>
  );
}
export function ScoreCardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h3M14 11h2M8 15h3M14 15h2" />
    </svg>
  );
}
export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M10 14h4M9 20h6M12 14v6" />
    </svg>
  );
}

/* Dashboard / admin KPI icons. */
export function CreditCardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  );
}
export function TicketIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9Z" />
      <path d="M14 7v10" strokeDasharray="2 3" />
    </svg>
  );
}
export function CoinsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="9" cy="6" rx="6" ry="3" />
      <path d="M3 6v6c0 1.66 2.7 3 6 3s6-1.34 6-3V6" />
      <path d="M9 15c0 1.66 2.7 3 6 3s6-1.34 6-3V9" />
    </svg>
  );
}
export function GiftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M3 12h18M12 8v13" />
      <path d="M12 8S9 2 6.5 4.5C5 6 7 8 7 8M12 8s3-6 5.5-3.5C19 6 17 8 17 8" />
    </svg>
  );
}
export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5M17 15c2.5 0.5 4 2 4 5" />
    </svg>
  );
}
export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v16h16" />
      <path d="M7 14l3-3 3 3 5-5" />
    </svg>
  );
}
export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" />
      <path d="M14 5l4 4" />
    </svg>
  );
}
export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18h.01" />
    </svg>
  );
}

/* Category emblems for charity cards / detail. */
export function EducationEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9l9-5 9 5-9 5-9-5Z" />
      <path d="M7 11v4c0 1 2 2 5 2s5-1 5-2v-4M21 9v5" />
    </svg>
  );
}
export function WaterEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z" />
      <path d="M9 14a3 3 0 0 0 3 3" />
    </svg>
  );
}
export function EnvironmentEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21c-2-3-2-7 1-10 2-2 4-2 6 0M19 21c-1-4 0-9 3-12M5 21h14M12 12V7" />
      <path d="M12 7c0-2 1-3 3-3" />
    </svg>
  );
}
export function HealthEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12h4l2-5 3 10 2-5h7" />
    </svg>
  );
}
export function ChildrenEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-2a6 6 0 0 1 12 0v2M9 11l-2 4h4l-1 4M15 11l2 4h-4l1 4" />
    </svg>
  );
}
export function HungerEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 3c0 6 4 9 7 9s7-3 7-9M12 12v9M9 21h6" />
    </svg>
  );
}
export function AnimalsEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="11" r="3" />
      <path d="M5 8c1 1 1 3 0 4M19 8c-1 1-1 3 0 4M8 5c1 1 2 1 3 0M16 5c-1 1-2 1-3 0M9 17c-1 1-1 3 0 4M15 17c1 1 1 3 0 4" />
    </svg>
  );
}
export function DisasterEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M10 14l2-2 2 2M10 18l2-2 2 2" />
    </svg>
  );
}
export function DefaultEmblem(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

/* Map a charity category string to an emblem component. */
export function CategoryEmblem({ category, ...rest }: { category: string | null } & IconProps) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("edu")) return <EducationEmblem {...rest} />;
  if (c.includes("water") || c.includes("sanit")) return <WaterEmblem {...rest} />;
  if (c.includes("env") || c.includes("climate") || c.includes("forest")) return <EnvironmentEmblem {...rest} />;
  if (c.includes("health") || c.includes("med")) return <HealthEmblem {...rest} />;
  if (c.includes("child")) return <ChildrenEmblem {...rest} />;
  if (c.includes("hunger") || c.includes("food")) return <HungerEmblem {...rest} />;
  if (c.includes("animal")) return <AnimalsEmblem {...rest} />;
  if (c.includes("disaster") || c.includes("relief")) return <DisasterEmblem {...rest} />;
  return <DefaultEmblem {...rest} />;
}

/* Arrow chevrons used in CTAs and breadcrumbs. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/* Misc small icons. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 12 5 5 9-12" />
    </svg>
  );
}
export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
