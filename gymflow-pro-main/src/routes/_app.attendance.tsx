import { createFileRoute } from "@tanstack/react-router";
import { Download, QrCode, Search, UserCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api/attendance.api";
import { membersApi } from "@/lib/api/members.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({ meta: [{ title: "Attendance - GymOS" }] }),
  component: AttendancePage,
});

function AttendancePage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const today = new Date().toISOString().slice(0, 10);

  // Search members for check-in
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["members", activeGymId, debouncedQuery],
    queryFn: () => membersApi.getMembers(activeGymId!, { search: debouncedQuery, limit: 6 }),
    enabled: !!activeGymId && debouncedQuery.length > 0,
  });

  // Get today's attendance
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["attendance", activeGymId, today],
    queryFn: () => attendanceApi.getGymAttendance(activeGymId!, { date: today }),
    enabled: !!activeGymId,
  });

  // Get members for monthly summary (we'll just use a general members list for now since we don't have a specific summary endpoint)
  const { data: membersData } = useQuery({
    queryKey: ["members", activeGymId, "summary"],
    queryFn: () => membersApi.getMembers(activeGymId!, { limit: 10 }),
    enabled: !!activeGymId,
  });

  const markMutation = useMutation({
    mutationFn: (memberId: string) => attendanceApi.markAttendance(activeGymId!, memberId),
    onSuccess: () => {
      toast.success("Attendance marked successfully");
      setQuery("");
      queryClient.invalidateQueries({ queryKey: ["attendance", activeGymId, today] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark attendance");
    },
  });

  const searchResults = searchData?.data?.data || [];
  const todaysLog = attendanceData?.data?.records || [];
  const summaryMembers = membersData?.data?.data || [];

  return (
    <>
      <Topbar title="Attendance" subtitle={today} />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <input type="date" defaultValue={today}
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
          <button className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm text-foreground hover:bg-elevated">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Mark attendance */}
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <h3 className="text-sm font-medium text-foreground">Mark Attendance</h3>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search member by name or ID…"
                    className="h-9 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
                </div>
                <button className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm text-foreground hover:bg-elevated">
                  <QrCode className="h-4 w-4" /> Scan
                </button>
              </div>
              <ul className="space-y-1.5">
                {searchLoading ? (
                  <li className="py-12 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-gold" />
                  </li>
                ) : debouncedQuery && searchResults.length === 0 ? (
                  <li className="py-12 text-center text-sm text-muted-foreground">
                    No members found.
                  </li>
                ) : (
                  searchResults.map((m: any) => (
                    <li key={m._id} className="flex items-center justify-between rounded-sm border border-border bg-surface px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar src={m.profilePhoto} name={m.name} size="sm" />
                        <div>
                          <p className="text-sm text-foreground">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.memberId}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => markMutation.mutate(m._id)}
                        disabled={markMutation.isPending}
                        className="flex items-center gap-1.5 rounded-sm bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50"
                      >
                        {markMutation.isPending && markMutation.variables === m._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        Mark
                      </button>
                    </li>
                  ))
                )}
                {!debouncedQuery && (
                  <li className="py-12 text-center text-sm text-muted-foreground">
                    Start typing to search and check in members.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Today's log */}
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-medium text-foreground">Today's Log</h3>
              <span className="font-mono tabular text-xs text-muted-foreground">{todaysLog.length} check-ins</span>
            </div>
            {attendanceLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
              </div>
            ) : todaysLog.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No check-ins today yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {todaysLog.map((a: any) => (
                  <li key={a._id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={a.member?.profilePhoto} name={a.member?.name || 'Unknown'} size="sm" />
                      <p className="text-sm text-foreground">{a.member?.name || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular text-xs text-muted-foreground">{new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="rounded-sm border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success">Present</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Monthly summary */}
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="text-sm font-medium text-foreground">Recent Members</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border bg-surface/50">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summaryMembers.map((m: any) => (
                <tr key={m._id} className="hover:bg-elevated/40">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={m.profilePhoto} name={m.name} size="sm" />
                      <span className="text-foreground">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{m.membershipPlan?.name || "-"}</td>
                  <td className="px-5 py-2.5 text-muted-foreground capitalize">{m.status}</td>
                  <td className="px-5 py-2.5 text-right font-mono tabular text-foreground">{m.totalPoints || 0}</td>
                </tr>
              ))}
              {summaryMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">No members found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}