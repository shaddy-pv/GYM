import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { Flame, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance.api";
import { format, startOfMonth, getDaysInMonth, getDay, parseISO } from "date-fns";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance - GymOS" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const now = new Date();
  const monthLabel = format(now, "MMMM yyyy");

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["memberAttendance"],
    queryFn: () => attendanceApi.getAttendance({ month: now.getMonth() + 1, year: now.getFullYear() }),
  });

  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ["memberStreak"],
    queryFn: attendanceApi.getStreak,
  });

  const records: any[] = attendanceData?.data?.records || [];
  const calendarData: any[] = attendanceData?.data?.calendarData || [];
  const streak = streakData?.data?.currentStreak || 0;
  const bestStreak = streakData?.data?.longestStreak || 0;

  // Build a set of present days from API data
  const presentDays = new Set<number>(
    calendarData.filter((r: any) => r.status === "present").map((r: any) => {
      try { return new Date(r.date).getDate(); } catch { return 0; }
    })
  );

  const daysInMonth = getDaysInMonth(now);
  const today = now.getDate();
  const presentCount = presentDays.size;
  const absentCount = today - 1 - presentCount; // days before today that weren't present

  // Start offset (0=Mon, need to figure weekday of month start)
  const monthStart = startOfMonth(now);
  // JS getDay(): 0=Sun...6=Sat. Convert to Mon-first: (day + 6) % 7
  const startOffset = (getDay(monthStart) + 6) % 7;

  return (
    <>
      <TopBar title="My Attendance" />
      <main className="flex flex-col gap-5 px-4 pt-4">
        {attendanceLoading || streakLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gold" size={32} /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Present" value={`${presentCount}`} tone="gold" />
              <MiniStat label="Absent" value={`${Math.max(0, absentCount)}`} tone="red" />
              <MiniStat label="Streak" value={`${streak}d`} tone="gold" />
            </div>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">{monthLabel}</div>
                <div className="text-[10px] text-text-secondary">
                  <Legend />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-text-secondary">{d}</div>
                ))}
                {/* Empty cells for offset */}
                {Array.from({ length: startOffset }).map((_, i) => (
                  <div key={`offset-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const present = presentDays.has(d);
                  const isPast = d < today;
                  const absent = isPast && !present;
                  const isToday = d === today;
                  return (
                    <div
                      key={d}
                      className={`relative aspect-square rounded-md text-center text-[11px] font-mono leading-[2.4] ${
                        present
                          ? "bg-gold-soft text-gold"
                          : absent
                            ? "bg-bg-surface text-text-disabled"
                            : "bg-bg-surface text-text-secondary"
                      } ${isToday ? "ring-2 ring-gold" : ""}`}
                    >
                      {d}
                      {absent && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="flex items-center gap-4">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{streak} day streak</div>
                <div className="text-[11px] text-text-secondary">Best: {bestStreak} days</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-text-secondary">Keep going!</div>
                <div className="text-[10px] text-gold">Streak Master</div>
              </div>
            </Card>

            <div>
              <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Recent Check-ins
              </div>
              {records.length === 0 ? (
                <p className="text-sm text-center text-text-secondary py-4">No check-ins yet this month.</p>
              ) : (
                <ul className="space-y-2">
                  {records.slice(0, 5).map((r: any, i: number) => {
                    const checkDate = r.date || r.checkInTime;
                    const dateStr = checkDate ? format(parseISO(checkDate), "MMM dd") : "-";
                    const inTime = r.checkInTime ? format(parseISO(r.checkInTime), "h:mm a") : "";
                    const outTime = r.checkOutTime ? format(parseISO(r.checkOutTime), "h:mm a") : "";
                    const timeStr = inTime ? (outTime ? `${inTime} - ${outTime}` : inTime) : "-";
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                        <Flame size={16} className="text-gold" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{dateStr}</div>
                          <div className="text-[11px] text-text-secondary">{timeStr}</div>
                        </div>
                        <div className="font-mono text-sm font-bold text-gold">+{r.pointsAwarded || 10}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "gold" | "red" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className={`font-mono text-2xl font-bold ${tone === "gold" ? "text-gold" : "text-red"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
    </div>
  );
}

function Legend() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm bg-gold-soft" /> Present
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red" /> Absent
      </span>
    </span>
  );
}

