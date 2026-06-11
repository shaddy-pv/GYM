import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Key } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { membersApi } from "@/lib/api/members.api";
import { attendanceApi } from "@/lib/api/attendance.api";
import { paymentsApi } from "@/lib/api/payments.api";
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

  const { data: paymentsData } = useQuery({
    queryKey: ["payments", activeGymId, "member", id],
    queryFn: () => paymentsApi.getPayments(activeGymId!, { limit: 50, search: member?.name }), // Approximating filter
    enabled: !!activeGymId && !!id && tab === "Payments",
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
  const stats = statsData?.data || { totalAttendance: 0, streak: 0 };
  const memberPayments = paymentsData?.data?.data?.filter((p: any) => p.member?._id === id) || [];
  const attendanceRecords = attendanceData?.data?.records || [];

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
              <div className="mb-4 flex gap-6 text-sm">
                <Stat l="Total Present" v={String(stats.totalAttendance)} />
                <Stat l="Current streak" v={`${stats.streak || 0}d`} />
              </div>
              <ul className="divide-y divide-border border border-border rounded-sm">
                {attendanceRecords.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">No attendance records found</li>
                ) : (
                  attendanceRecords.map((a: any) => (
                    <li key={a._id} className="flex justify-between p-3 text-sm">
                      <span className="text-foreground">{new Date(a.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">{new Date(a.checkInTime).toLocaleTimeString()}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {tab === "Payments" && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Plan</th>
                  <th className="py-2 font-medium">Method</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memberPayments.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No payments yet.</td></tr>
                )}
                {memberPayments.map((p: any) => (
                  <tr key={p._id}>
                    <td className="py-2.5 font-mono tabular text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-2.5 text-foreground">{p.plan?.name || "-"}</td>
                    <td className="py-2.5 text-muted-foreground">{p.paymentMethod}</td>
                    <td className="py-2.5 text-right font-mono tabular text-foreground">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 text-right text-xs"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Points" && (
            <ul className="space-y-2 text-sm">
              <li className="p-4 text-center text-muted-foreground">
                Point history requires additional endpoints, but current balance is {member.totalPoints || 0}
              </li>
            </ul>
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