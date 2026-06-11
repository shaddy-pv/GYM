import { cn } from "@/lib/utils";
import type { MemberStatus } from "@/lib/mock-data";

const map: Record<MemberStatus, { label: string; dot: string; text: string }> = {
  active:   { label: "Active",   dot: "bg-success", text: "text-success" },
  expired:  { label: "Expired",  dot: "bg-danger",  text: "text-danger" },
  expiring: { label: "Expiring", dot: "bg-gold",    text: "text-gold" },
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-0.5 text-xs">
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      <span className={s.text}>{s.label}</span>
    </span>
  );
}