import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  trend?: { value: string; positive?: boolean };
  icon: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: Props) {
  return (
    <div className="rounded-md border border-border bg-card p-5 transition-colors hover:border-[color-mix(in_oklch,var(--border),white_15%)]">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
      </div>
      <p className="font-mono tabular mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {trend && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            trend.positive ? "text-success" : "text-danger",
          )}
        >
          {trend.positive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}