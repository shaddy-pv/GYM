import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { leaderboardApi } from "@/lib/api/leaderboard.api";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard - GymOS" }] }),
  component: LeaderboardPage,
});

const filters = ["This Week", "This Month", "All Time"] as const;
const periodMap: Record<string, "week" | "month" | "all"> = {
  "This Week": "week",
  "This Month": "month",
  "All Time": "all",
};

function Avatar({ name, size = 44, ring }: { name: string; size?: number; ring?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gold-soft font-bold text-gold ${ring ?? ""}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function LeaderboardPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("This Week");
  const [scope, setScope] = useState<"gym" | "global">("gym");

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["memberLeaderboard", filter, scope],
    queryFn: () => leaderboardApi.getLeaderboard(periodMap[filter], scope),
  });

  const leaderboard: any[] = leaderboardData?.data?.topMembers || [];
  const [first, second, third, ...rest] = leaderboard;
  const myRank = leaderboardData?.data?.myRank;
  const myPoints = leaderboardData?.data?.myPoints;

  return (
    <>
      <TopBar title="Leaderboard" />

      <main className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex gap-2 rounded-full border border-border bg-bg-secondary p-1">
          <button
            onClick={() => setScope("gym")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              scope === "gym" ? "bg-gold text-bg-primary" : "text-text-secondary"
            }`}
          >
            My Gym
          </button>
          <button
            onClick={() => setScope("global")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              scope === "global" ? "bg-gold text-bg-primary" : "text-text-secondary"
            }`}
          >
            Global
          </button>
        </div>

        <div className="flex gap-2 rounded-full border border-border bg-bg-secondary p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
                filter === f ? "bg-gold/20 text-gold" : "text-text-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : leaderboard.length === 0 ? (
          <Card className="py-10 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-sm text-text-secondary">No leaderboard data yet. Start earning points!</p>
          </Card>
        ) : (
          <>
            {/* Podium */}
            {(first || second || third) && (
              <Card className="pt-6">
                <div className="flex items-end justify-around gap-2">
                  {second ? <PodiumItem entry={second} place={2} h="h-16" ring="ring-2 ring-text-secondary/60" /> : <div className="flex-1" />}
                  {first ? <PodiumItem entry={first} place={1} h="h-24" ring="ring-2 ring-gold" big /> : <div className="flex-1" />}
                  {third ? <PodiumItem entry={third} place={3} h="h-12" ring="ring-2 ring-red/70" /> : <div className="flex-1" />}
                </div>
              </Card>
            )}

            {/* My rank */}
            {myRank && myRank > 3 && (
              <Card className="border-gold/40">
                <div className="text-xs uppercase tracking-wider text-text-secondary">
                  Your rank
                </div>
                <div className="mt-1 text-sm">
                  You're ranked <span className="font-bold text-gold">#{myRank}</span> with{" "}
                  <span className="font-mono">{(myPoints || 0).toLocaleString()}</span> pts.
                </div>
              </Card>
            )}

            <ul className="space-y-2">
              {rest.map((row: any) => (
                <li
                  key={row.rank}
                  className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 ${
                    row.rank === myRank ? "border-l-4 border-l-gold" : ""
                  }`}
                >
                  <div className="w-6 font-mono text-sm font-bold text-text-secondary">
                    {row.rank}
                  </div>
                  <Avatar name={row.name || row.memberName || "?"} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {row.name || row.memberName} {row.rank === myRank && <span className="text-[10px] text-gold">(you)</span>}
                    </div>
                    <div className="text-[11px] text-text-secondary flex gap-2">
                      <span>🔥 {row.currentStreak || row.streak || 0}d streak</span>
                      {scope === "global" && row.gymName && (
                        <span className="truncate text-text-secondary/70 border-l border-border pl-2">
                          {row.gymName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold">{(row.points || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-text-secondary">{row.badge || "Member"}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

function PodiumItem({
  entry, place, h, ring, big,
}: { entry: any; place: number; h: string; ring: string; big?: boolean }) {
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  const name = entry.name || entry.memberName || "?";
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <Avatar name={name} size={big ? 64 : 48} ring={ring} />
      <div className="text-center">
        <div className="text-xs font-semibold">{name.split(" ")[0]}</div>
        <div className="font-mono text-xs font-bold text-gold">
          {(entry.points || 0).toLocaleString()}
        </div>
      </div>
      <div className={`flex w-full items-end justify-center rounded-t-lg bg-bg-surface text-lg ${h}`}>
        <span className="pb-1">{medal}</span>
      </div>
    </div>
  );
}

