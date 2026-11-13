import { CircleCheck, ShieldAlert, TriangleAlert, WifiOff, type LucideIcon } from "lucide-react";
import { MeterStatus } from "@/lib/chain";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 ${className}`}>{children}</div>;
}

/** Section heading: small numbered label, big uppercase title, optional intro. */
export function SectionHead({
  id,
  index,
  label,
  title,
  intro,
  dark = false,
  className = "",
}: {
  id: string;
  index: string;
  label: string;
  title: string;
  intro?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`max-w-3xl ${className}`}>
      <p className={`eyebrow flex items-center gap-3 mb-5 ${dark ? "text-zinc-400" : "text-zinc-600"}`}>
        <span aria-hidden="true">{index}</span>
        <span aria-hidden="true" className={`h-px w-8 ${dark ? "bg-zinc-600" : "bg-zinc-400"}`} />
        {label}
      </p>
      <h2
        id={id}
        className="text-[clamp(1.75rem,6vw,3.5rem)] font-semibold uppercase tracking-tight leading-[0.95] text-balance"
      >
        {title}
      </h2>
      {intro && (
        <p className={`mt-6 text-base sm:text-lg leading-relaxed font-medium ${dark ? "text-zinc-300" : "text-zinc-700"}`}>
          {intro}
        </p>
      )}
    </div>
  );
}

/** Tiny corner marks, a detail borrowed from print layouts. */
export function Corners({ dark = false }: { dark?: boolean }) {
  const c = dark ? "border-zinc-500" : "border-black";
  return (
    <>
      <span aria-hidden="true" className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${c}`} />
      <span aria-hidden="true" className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${c}`} />
      <span aria-hidden="true" className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${c}`} />
      <span aria-hidden="true" className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${c}`} />
    </>
  );
}

/** Colours and icon for each meter status. Status is always shown with text and an icon too. */
export const STATUS_STYLE: Record<
  MeterStatus,
  { icon: LucideIcon; pill: string; dot: string; banner: string }
> = {
  [MeterStatus.OK]: {
    icon: CircleCheck,
    pill: "bg-emerald-50 text-emerald-900 border-emerald-300",
    dot: "bg-emerald-600",
    banner: "bg-emerald-700 text-white",
  },
  [MeterStatus.THEFT]: {
    icon: TriangleAlert,
    pill: "bg-red-50 text-red-900 border-red-300",
    dot: "bg-red-600",
    banner: "bg-red-700 text-white",
  },
  [MeterStatus.TAMPER]: {
    icon: ShieldAlert,
    pill: "bg-orange-50 text-orange-900 border-orange-300",
    dot: "bg-orange-600",
    banner: "bg-orange-700 text-white",
  },
  [MeterStatus.OFFLINE]: {
    icon: WifiOff,
    pill: "bg-zinc-100 text-zinc-800 border-zinc-300",
    dot: "bg-zinc-500",
    banner: "bg-zinc-700 text-white",
  },
};

export function ExternalA({
  href,
  children,
  className = "",
  label,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}>
      {children}
    </a>
  );
}
