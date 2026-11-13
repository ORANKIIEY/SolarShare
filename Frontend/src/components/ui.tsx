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

/** Status pill colours on the dark platform. */
export const DARK_PILL: Record<MeterStatus, string> = {
  [MeterStatus.OK]: "bg-emerald-950/70 text-emerald-300 border-emerald-800",
  [MeterStatus.THEFT]: "bg-red-950/80 text-red-300 border-red-800",
  [MeterStatus.TAMPER]: "bg-orange-950/80 text-orange-300 border-orange-800",
  [MeterStatus.OFFLINE]: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

/** A titled card on the dark platform. */
export function Panel({
  title,
  action,
  children,
  className = "",
  id,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={`bg-d-panel border border-d-line rounded-lg ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-12 border-b border-d-line">
          <h2 id={id} className="text-[13px] font-medium text-white">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Key / value row like the dashboard's info panel. */
export function KV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 text-[13px] py-1.5">
      <dt className="text-zinc-400">{k}</dt>
      <dd className="text-zinc-100 text-right tabular-nums">{v}</dd>
    </div>
  );
}

export const darkButton =
  "inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const primaryBtn = `${darkButton} bg-white text-black hover:bg-zinc-200`;
export const secondaryBtn = `${darkButton} bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700`;
export const inputCls =
  "w-full min-h-11 rounded-md bg-d-input border border-d-line-2 px-3 text-base text-white placeholder:text-zinc-500 focus:border-zinc-400";

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
