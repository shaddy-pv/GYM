import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Coins, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { pointsApi } from "@/lib/api/points.api";
import { format, parseISO } from "date-fns";

export const Route = createFileRoute("/points")({
  head: () => ({ meta: [{ title: "Points & Rewards - GymOS" }] }),
  component: PointsPage,
});

function PointsPage() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["memberPointsSummary"],
    queryFn: pointsApi.getPointsSummary,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["memberPointsHistory"],
    queryFn: pointsApi.getPointsHistory,
  });

  const { data: badgesData, isLoading: badgesLoading } = useQuery({
    queryKey: ["memberBadges"],
    queryFn: pointsApi.getBadges,
  });

  const summary = summaryData?.data || {};
  const history: any[] = historyData?.data?.history || [];
  const badges: any[] = badgesData?.data?.earned || badgesData?.data?.locked || [];

  const isLoading = summaryLoading || historyLoading || badgesLoading;

  return (
    <>
      <TopBar title="My Points" />
      <main className="flex flex-col gap-5 px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : (
          <>
            <Card className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft">
                <Coins className="text-gold" size={26} />
              </div>
              <div className="mt-3 font-mono text-5xl font-extrabold text-gold">
                {(summary.totalPoints || 0).toLocaleString()}
              </div>
              <div className="text-xs text-text-secondary">pts</div>
              <div className="mt-2 text-sm">
                <span className="text-text-secondary">Rank</span>{" "}
                <span className="font-bold">#{summary.rank || "-"}</span>{" "}
                <span className="text-text-secondary">in your gym</span>
              </div>
            </Card>

            {badges.length > 0 && (
              <section>
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  My Badges
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((b: any) => (
                    <div
                      key={b.name || b._id}
                      className={`rounded-xl border p-4 text-center ${
                        b.earned
                          ? "border-gold/40 bg-gold-soft"
                          : "border-border bg-card opacity-70"
                      }`}
                    >
                      <div className={`text-3xl ${b.earned ? "" : "grayscale"}`}>{b.icon || "🏅"}</div>
                      <div className="mt-2 text-sm font-semibold">{b.name}</div>
                      <div className="text-[10px] text-text-secondary">{b.hint || b.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Card>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                How to Earn
              </div>
              <ul className="mt-3 space-y-2.5 text-sm">
                <Row label="Complete an exercise" v={`+${summary.pointsPerExercise || 15} pts`} />
                <Row label="Daily attendance" v={`+${summary.pointsPerCheckIn || 10} pts`} />
                <Row label="Full workout done" v="+50 pts" />
                <Row label="7-day streak bonus" v="+100 pts" />
              </ul>
            </Card>

            {history.length > 0 && (
              <section>
                <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  History
                </div>
                <div className="space-y-4">
                  {history.map((group) => (
                    <div key={group.date}>
                      <div className="mb-1.5 px-1 text-xs text-text-secondary flex justify-between">
                        <span>{group.date}</span>
                        <span className="text-gold font-semibold">+{group.dayTotal} pts</span>
                      </div>
                      <ul className="space-y-2">
                        {group.records.map((it: any, i: number) => (
                          <li
                            key={i}
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                          >
                            <span className="text-sm">{it.label || it.description || it.type}</span>
                            <span className="font-mono text-sm font-bold text-gold">+{it.points}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {history.length === 0 && (
              <Card className="py-10 text-center">
                <div className="text-4xl mb-3">⭐</div>
                <p className="text-sm text-text-secondary">No points history yet. Start working out to earn!</p>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <li className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="font-mono text-xs font-bold text-gold">{v}</span>
    </li>
  );
}

