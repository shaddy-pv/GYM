import { Link } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications.api";

type Props = {
  title?: string;
  subtitle?: ReactNode;
  back?: boolean;
  showBell?: boolean;
  unread?: boolean;
  right?: ReactNode;
};

export function TopBar({ title, subtitle, back, showBell = true, right, unread }: Props) {
  const { data } = useQuery({
    queryKey: ["memberNotifications"],
    queryFn: notificationsApi.getNotifications,
    enabled: showBell,
  });

  const hasUnread = unread !== undefined ? unread : data?.data?.notifications?.some((n: any) => !n.isRead);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg-primary/90 px-4 py-3 backdrop-blur"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <Link
            to="/"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-text-secondary active:bg-bg-surface"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </Link>
        )}
        <div className="min-w-0">
          {title && <h1 className="truncate text-base font-bold tracking-tight">{title}</h1>}
          {subtitle && <div className="truncate text-xs text-text-secondary">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        {showBell && (
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-text-primary active:bg-bg-surface"
          >
            <Bell size={20} />
            {hasUnread && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold" />
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
