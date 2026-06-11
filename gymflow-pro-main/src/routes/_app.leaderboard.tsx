import { createFileRoute } from "@tanstack/react-router";
import { Crown, Flame, Star, Trophy, Loader2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { gymApi } from "@/lib/api/gym.api";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard - GymOS" }] }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [range, setRange] = useState<"week" | "month" | "all">("month");
  const [scope, setScope] = useState<"gym" | "global">("gym");
  const { activeGymId } = useAuth();

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["gymLeaderboard", activeGymId, range, scope],
    queryFn: () => gymApi.getLeaderboard(activeGymId!, range, scope),
    enabled: !!activeGymId,
  });

  const ranked: any[] = leaderboardData?.data?.leaderboard || [];
  const [first, second, third, ...rest] = ranked;

  return (
    <>
      <Topbar title="Leaderboard" subtitle="This month's champions" />
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-1 rounded-sm border border-border bg-surface p-1 w-fit">
            <button
              onClick={() => setScope("gym")}
              className={cn(
                "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
                scope === "gym" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              My Gym
            </button>
            <button
              onClick={() => setScope("global")}
              className={cn(
                "rounded-sm px-4 py-1.5 text-sm font-medium transition-colors",
                scope === "global" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Global
            </button>
          </div>

          <div className="flex gap-1 rounded-sm border border-border bg-surface p-1 w-fit">
            {(["week", "month", "all"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-xs capitalize transition-colors",
                  range === r ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
                )}>
                {r === "all" ? "All time" : `This ${r}`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No data found</h3>
            <p className="text-sm text-muted-foreground">No one has earned points this {range === "all" ? "time" : range} yet.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="grid grid-cols-3 items-end gap-4">
              {second ? <PodiumCard m={second} rank={2} ringClass="ring-[#9aa0a6]" height="h-44" scope={scope} /> : <div />}
              {first ? <PodiumCard m={first} rank={1} ringClass="ring-gold" height="h-56" crown scope={scope} /> : <div />}
              {third ? <PodiumCard m={third} rank={3} ringClass="ring-[#a36b3a]" height="h-40" scope={scope} /> : <div />}
            </div>

            {/* Table */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-md border border-border bg-card mt-6">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border bg-surface/50">
                      <th className="px-4 py-3 font-medium">Rank</th>
                      <th className="px-4 py-3 font-medium">Member</th>
                      {scope === "global" && <th className="px-4 py-3 font-medium">Gym</th>}
                      <th className="px-4 py-3 font-medium text-right">Points</th>
                      <th className="px-4 py-3 font-medium text-right">Streak</th>
                      <th className="px-4 py-3 font-medium text-right">Badges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rest.slice(0, 15).map((m: any, i: number) => (
                      <tr key={m._id || m.id || i} className="hover:bg-elevated/40">
                        <td className="px-4 py-2.5 font-mono tabular text-muted-foreground">#{i + 4}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={m.name || "?"} size="sm" />
                            <span className="text-foreground">{m.name || "Unknown"}</span>
                          </div>
                        </td>
                        {scope === "global" && (
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{m.gymName || "-"}</td>
                        )}
                        <td className="px-4 py-2.5 text-right font-mono tabular text-foreground">{m.points || 0}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular text-muted-foreground">{m.currentStreak || m.streak || 0}d</td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1.5">
                            {(m.currentStreak || m.streak || 0) >= 7 && <Badge icon={<Flame className="h-3 w-3" />} label="On Fire" color="text-danger" />}
                            {i < 3 && <Badge icon={<Trophy className="h-3 w-3" />} label="Top 10%" color="text-gold" />}
                            {(m.currentStreak || m.streak || 0) >= 20 && <Badge icon={<Star className="h-3 w-3" />} label="Consistent" color="text-success" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PodiumCard({
  m, rank, ringClass, height, crown, scope
}: { m: any; rank: number; ringClass: string; height: string; crown?: boolean; scope?: string }) {
  const name = m.name || "?";
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {crown && <Crown className="absolute -top-6 left-1/2 h-6 w-6 -translate-x-1/2 text-gold" fill="currentColor" />}
        <div className={cn("rounded-full ring-2 ring-offset-4 ring-offset-background", ringClass)}>
          <Avatar name={name} size="xl" />
        </div>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{name}</p>
      {scope === "global" && m.gymName && (
        <p className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">{m.gymName}</p>
      )}
      <p className="font-mono tabular text-xs text-muted-foreground mt-1">{m.points || 0} pts</p>
      <div className={cn("mt-3 w-full rounded-t-md border border-b-0 border-border bg-card flex items-center justify-center text-3xl font-bold text-muted-foreground/40", height)}>
        {rank}
      </div>
    </div>
  );
}

function Badge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px]", color)}>
      {icon} {label}
    </span>
  );
}