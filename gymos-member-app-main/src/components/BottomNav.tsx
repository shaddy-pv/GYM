import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, House, Trophy, User, Utensils } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: House },
  { to: "/workout", label: "Workout", Icon: Dumbbell },
  { to: "/meals", label: "Meals", Icon: Utensils },
  { to: "/leaderboard", label: "Ranks", Icon: Trophy },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-secondary"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch justify-between px-2">
        {tabs.map(({ to, label, Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="relative flex h-full flex-col items-center justify-center gap-1"
              >
                <span
                  className={`absolute top-1.5 h-1 w-1 rounded-full transition-opacity ${
                    active ? "bg-gold opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  size={22}
                  className={active ? "text-gold" : "text-text-secondary"}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    active ? "text-gold" : "text-text-secondary"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
