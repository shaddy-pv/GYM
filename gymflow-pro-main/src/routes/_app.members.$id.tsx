import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { membersApi } from "@/lib/api/members.api";
import { attendanceApi } from "@/lib/api/attendance.api";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/members/$id")({
  head: () => ({ meta: [{ title: "Member - GymOS" }] }),
  component: MemberDetail,
});

const TABS = ["Overview", "Attendance", "Payments", "Points"] as const;

function MemberDetail() {
  const { id } = Route.useParams();
  const { activeGymId } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ["member", activeGymId, id],
    queryFn: () => membersApi.getMember(activeGymId!, id),
    enabled: !!activeGymId && !!id,
  });

  const { data: statsData } = useQuery({
    queryKey: ["memberStats", activeGymId, id],
    queryFn: () => membersApi.getMemberStats(activeGymId!, id),
    enabled: !!activeGymId && !!id,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["memberAttendance", activeGymId, id],
    queryFn: () => attendanceApi.getMemberAttendance(activeGymId!, id, { limit: 30 }),
    enabled: !!activeGymId && !!id && tab === "Attendance",
  });

  // Filter payments by memberId on the backend directly using the memberId query param
  const { data: paymentsData } = useQuery({
    queryKey: ["memberPayments", activeGymId, id],
    queryFn: async () => {
      const res = await apiClient.get(`/gyms/${activeGymId}/payments`, { params: { memberId: id, limit: 50 } });
      return res.data;
    },
    enabled: !!activeGymId && !!id && tab === "Payments",
  });

  // Points history for this member
  const { data: pointsData } = useQuery({
    queryKey: ["memberPoints", activeGymId, id],
    queryFn: async () => {
      const res = await apiClient.get(`/gyms/${activeGymId}/points/member/${id}`, { params: { limit: 50 } });
      return res.data;
    },
    enabled: !!activeGymId && !!id && tab === "Points",
  });

  const resetMutation = useMutation({
    mutationFn: () => membersApi.resetPassword(activeGymId!, id!),
    onSuccess: (res) => {
      setNewPassword(res.data.newPassword);
    },
  });

  if (memberLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!memberData?.data) {
    return <div className="p-12 text-center text-muted-foreground">Member not found.</div>;
  }

  const member = memberData.data;
  // Backend getMemberStats returns { member, stats: {...}, recentPayments, pointsHistory, ... }
  const rawStats = statsData?.data?.stats;
  const stats = { 
    totalAttendance: rawStats?.totalAttendance ?? 0,
    streak: rawStats?.currentStreak ?? 0,
    longestStreak: rawStats?.longestStreak ?? 0,
  };
  // Attendance: paginatedResponse wraps records in { data: records[], pagination }
  const attendanceRecords = attendanceData?.data?.data ?? attendanceData?.data?.records ?? [];
  const totalAttendanceFromHistory = attendanceData?.data?.pagination?.total ?? stats.totalAttendance;
  // Payments: paginatedResponse wraps in { data: payments[], pagination }
  const memberPayments = paymentsData?.data?.data ?? [];
  // Points history: paginatedResponse wraps in { data: history[], pagination }
  const pointsHistory = pointsData?.data?.data ?? [];
  const totalPoints = member.totalPoints ?? 0;

  return (
    <>
      <Topbar title={member.name} subtitle={member.memberId} />
      <div className="space-y-6 p-6">
        <Link to="/members" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        {/* Header card */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar src={member.profilePhoto} name={member.name} size="xl" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">{member.name}</h2>
                <StatusBadge status={member.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{member.email || 'No email'} · {member.phone}</p>
              <p className="mt-1 text-xs text-muted-foreground">Trainer: {member.trainer?.name || "None"}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { l: "Points", v: member.totalPoints || 0 },
                { l: "Streak", v: `${stats.streak || 0}d` },
                { l: "Attendance", v: stats.totalAttendance },
                { l: "Plan", v: member.membershipPlan?.name || "None" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="font-mono tabular mt-1 text-lg font-semibold text-foreground">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "relative px-4 py-2.5 text-sm transition-colors",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
              {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-gold" />}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          {tab === "Overview" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Section title="Personal Info">
                  <Row k="Gender" v={member.gender || "Not specified"} />
                  <Row k="DOB" v={member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "Not specified"} />
                  <Row k="Phone" v={member.phone} />
                  <Row k="Email" v={member.email || "N/A"} />
                  <Row k="Joined" v={new Date(member.joinDate).toLocaleDateString()} />
                </Section>
                <Section title="App Credentials">
                  <Row k="Login URL" v="app.gymOS.com" />
                  <Row k="User ID" v={member.memberId} />
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Password</span>
                      {newPassword ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground bg-surface px-2 py-1 rounded border border-border select-all">
                            {newPassword}
                          </span>
                          <button onClick={() => setNewPassword(null)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            if (window.confirm("Reset this member's password? Their current password will stop working.")) {
                              resetMutation.mutate();
                            }
                          }}
                          disabled={resetMutation.isPending}
                          className="text-xs bg-gold/10 text-gold hover:bg-gold/20 px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                        >
                          {resetMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                          Generate New Password
                        </button>
                      )}
                    </div>
                  </div>
                </Section>
              </div>
              <Section title="Membership">
                <Row k="Plan" v={member.membershipPlan?.name || "None"} />
                <Row k="Expires" v={new Date(member.expiryDate).toLocaleDateString()} />
                <Row k="Trainer" v={member.trainer?.name || "None"} />
                <div className="mt-3">
                  <p className="mb-1.5 text-xs text-muted-foreground">Goals</p>
                  <div className="flex flex-wrap gap-2">
                    {member.goals?.map((g: string) => (
                      <span key={g} className="rounded-sm border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs text-gold capitalize">{g.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              </Section>
            </div>
          )}
          {tab === "Attendance" && (
            <div>
              {/* Stats row */}
              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat l="Total Present" v={String(stats.totalAttendance)} />
                <Stat l="Current Streak" v={`${stats.streak}d`} />
                <Stat l="Longest Streak" v={`${stats.longestStreak}d`} />
                <Stat
                  l="Last Check-in"
                  v={member.lastCheckIn ? new Date(member.lastCheckIn).toLocaleDateString() : "—"}
                />
              </div>
              {/* Attendance list */}
              {attendanceData && attendanceRecords.length === 0 ? (
                <div className="rounded-sm border border-border py-10 text-center text-sm text-muted-foreground">
                  No attendance records found for this member.
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {attendanceRecords.map((a: any) => (
                    <li key={a._id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Check-in: {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {a.checkOutTime && ` · Check-out: ${new Date(a.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                      <div className="text-right">
                        {a.pointsAwarded > 0 && (
                          <span className="text-xs font-medium text-gold">+{a.pointsAwarded} pts</span>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{a.markedBy}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "Payments" && (
            <div>
              {memberPayments.length === 0 ? (
                <div className="rounded-sm border border-border py-10 text-center text-sm text-muted-foreground">
                  No payment records found for this member.
                </div>
              ) : (
                <div className="space-y-3">
                  {memberPayments.map((p: any) => (
                    <div key={p._id} className="rounded-sm border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{p.membershipPlan?.name || "Membership"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Receipt: {p.receiptNumber || "—"} ·{" "}
                            {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Invoice Total</p>
                          <p className="font-mono font-semibold text-foreground">₹{p.amount?.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount Paid</p>
                          <p className="font-mono font-semibold text-foreground">₹{(p.paidAmount ?? 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Balance Due</p>
                          <p className={`font-mono font-semibold ${p.balanceAmount > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                            {p.balanceAmount > 0 ? `₹${p.balanceAmount.toLocaleString("en-IN")}` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Method</p>
                          <p className="capitalize text-foreground">{p.method || "—"}</p>
                        </div>
                        {p.paidAt && (
                          <div>
                            <p className="text-xs text-muted-foreground">Paid On</p>
                            <p className="text-foreground">{new Date(p.paidAt).toLocaleDateString("en-IN")}</p>
                          </div>
                        )}
                        {p.dueDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Due Date</p>
                            <p className={`${new Date(p.dueDate) < new Date() && p.status !== 'paid' ? 'text-danger' : 'text-foreground'}`}>
                              {new Date(p.dueDate).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Transaction history for partial payments */}
                      {p.transactions?.length > 1 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Transaction History</p>
                          <div className="space-y-1.5">
                            {p.transactions.map((t: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(t.paidAt).toLocaleDateString("en-IN")} · {t.method} · #{t.receiptNumber}
                                </span>
                                <span className="font-mono font-medium text-foreground">₹{t.amount?.toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Points" && (
            <div>
              {/* Points balance */}
              <div className="mb-6 flex items-center gap-4 rounded-sm border border-gold/30 bg-gold/5 px-5 py-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="font-mono text-3xl font-bold text-gold">{totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
              {/* Points history */}
              {pointsData && pointsHistory.length === 0 ? (
                <div className="rounded-sm border border-border py-10 text-center text-sm text-muted-foreground">
                  No points transactions found for this member.
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {pointsHistory.map((ph: any) => {
                    const isPositive = ph.points > 0;
                    const Icon = isPositive ? TrendingUp : TrendingDown;
                    return (
                      <li key={ph._id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isPositive ? 'bg-success/10' : 'bg-danger/10'}`}>
                            <Icon className={`h-3.5 w-3.5 ${isPositive ? 'text-success' : 'text-danger'}`} />
                          </span>
                          <div>
                            <p className="text-sm font-medium capitalize text-foreground">
                              {ph.type?.replace(/_/g, " ") || "Transaction"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ph.description || "—"} · {new Date(ph.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-mono text-sm font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                          {isPositive ? "+" : ""}{ph.points}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}
function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{l}</p>
      <p className="font-mono tabular text-lg font-semibold text-foreground">{v}</p>
    </div>
  );
}