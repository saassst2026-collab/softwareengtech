import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "primary",
  to,
  search,
  onNavigate,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: "primary" | "info" | "warning" | "success";
  to?: string;
  search?: Record<string, string>;
  onNavigate?: () => void;
}) {
  const toneMap = {
    primary: "from-primary/25 via-primary/10 to-transparent text-primary",
    info: "from-info/25 via-info/10 to-transparent text-info",
    warning: "from-warning/40 via-warning/15 to-transparent text-warning-foreground",
    success: "from-success/25 via-success/10 to-transparent text-success",
  } as const;
  const iconBg = {
    primary: "bg-primary/10 text-primary ring-1 ring-primary/20",
    info: "bg-info/10 text-info ring-1 ring-info/20",
    warning: "bg-warning/20 text-warning-foreground ring-1 ring-warning/30",
    success: "bg-success/10 text-success ring-1 ring-success/20",
  } as const;

  const interactive = Boolean(to);
  const content = (
    <>
      <div
        className={`pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-gradient-to-tr blur-2xl ${toneMap[tone]}`}
      />
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-bl blur-3xl opacity-60 ${toneMap[tone]}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 shadow-glow backdrop-blur ${iconBg[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </>
  );

  const baseClass =
    "relative block overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-5 shadow-elegant backdrop-blur-sm";
  const interactiveClass = interactive
    ? " cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : "";

  if (interactive && to) {
    return (
      <Link
        to={to as any}
        search={search as any}
        onClick={onNavigate}
        className={baseClass + interactiveClass}
        aria-label={label}
      >
        {content}
      </Link>
    );
  }

  return <div className={baseClass + interactiveClass}>{content}</div>;
}
