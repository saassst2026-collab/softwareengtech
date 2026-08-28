import type { ReactNode } from "react";

export function PageHero({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-hero p-5 shadow-elegant sm:p-8">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-60"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.18 130 / 0.25) 0%, transparent 70%)",
        }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-xs leading-relaxed text-foreground/70 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 [&>*]:flex-1 sm:w-auto sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
