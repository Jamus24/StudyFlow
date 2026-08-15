"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PanelHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-5 gap-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  accent = "#2563eb",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { dir: "up" | "down"; value: string };
  accent?: string;
}) {
  return (
    <div className="card-hover relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 blur-2xl" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {trend && (
          <span className={cn("font-medium", trend.dir === "up" ? "text-blue-500" : "text-destructive")}>
            {trend.dir === "up" ? "↑" : "↓"} {trend.value}
          </span>
        )}
        {sub && <span className="text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative h-28 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="skeleton-shimmer absolute inset-0 bg-muted/40" />
        </div>
      ))}
    </div>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="skeleton-shimmer absolute inset-0 bg-muted/30" />
    </div>
  );
}
