import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarCheck, CreditCard, Tag,
  Dumbbell, Activity, Utensils, Trophy, Settings,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/plans", label: "Membership Plans", icon: Tag },
  { to: "/trainers", label: "Trainers", icon: Dumbbell },
  { to: "/exercises", label: "Exercise Plans", icon: Activity },
  { to: "/meals", label: "Meal Plans", icon: Utensils },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gold text-gold-foreground">
              <Dumbbell className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-semibold tracking-tight text-foreground">GymOS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-elevated text-foreground"
                      : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gold" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar name="Owner Singh" size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">Owner Singh</p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
            </div>
          )}
          {!collapsed && (
            <Link
              to="/login"
              className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-elevated hover:text-danger"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}