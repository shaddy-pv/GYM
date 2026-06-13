import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Users, UserCheck, IndianRupee, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { StatCard } from "@/components/shared/StatCard";
import { Avatar } from "@/components/shared/Avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard.api";
import { attendanceApi } from "@/lib/api/attendance.api";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - GymOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { activeGymId } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats", activeGymId],
    queryFn: () => dashboardApi.getStats(activeGymId!),
    enabled: !!activeGymId,
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["todayAttendance", activeGymId],
    queryFn: () => attendanceApi.getTodayAttendance(activeGymId!),
    enabled: !!activeGymId,
  });

  if (statsLoading || attendanceLoading) {
    return (
      <>
        <Topbar title="Dashboard" subtitle="Overview of your gym today" />
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </>
    );
  }

  const stats = statsData?.data || {};
  const todayAttendance = attendanceData?.data?.records || [];
  
  // Calculate expiry days for expiring members
  const expiring = (stats.expiringMembers || []).map((m: any) => {
    const daysLeft = Math.ceil((+new Date(m.expiryDate) - Date.now()) / 86400000);
    return { ...m, daysLeft };
  }).sort((a: any, b: any) => a.daysLeft - b.daysLeft);

  const membershipDistribution = [
    { name: "Active", value: stats.activeMembers || 0, color: "var(--success)" },
    { name: "Expired", value: stats.expiredMembers || 0, color: "var(--danger)" },
  ];

  return (
    <>
      <Topbar title="Dashboard" subtitle="Overview of your gym today" />
      <div className="space-y-6 p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Members" value={String(stats.totalMembers || 0)} icon={Users} />
          <StatCard label="Active Members" value={String(stats.activeMembers || 0)} icon={UserCheck} />
          <StatCard label="Revenue (Month)" value={`₹${(stats.revenueThisMonth || 0).toLocaleString("en-IN")}`} icon={IndianRupee} />
          <StatCard label="Pending Dues" value={`₹${(stats.pendingDues || 0).toLocaleString("en-IN")}`} icon={AlertCircle} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="rounded-md border border-border bg-card p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">Revenue</h3>
                <p className="text-xs text-muted-foreground">Last 6 months</p>
              </div>
            </div>
            <div className="h-64">
              {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      cursor={{ fill: "var(--elevated)" }}
                      contentStyle={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                      formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="var(--gold)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No revenue data available
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-5 lg:col-span-2">
            <h3 className="mb-4 text-sm font-medium text-foreground">Membership Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={membershipDistribution} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="var(--background)">
                    {membershipDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1.5">
              {membershipDistribution.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-mono tabular text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-medium text-foreground">Recent Members</h3>
              <Link to="/members" className="flex items-center gap-1 text-xs text-gold hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {(stats.recentMembers || []).map((m: any) => (
                <li key={m._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={m.profilePhoto} name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">joined {new Date(m.joinDate).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </li>
              ))}
              {(!stats.recentMembers || stats.recentMembers.length === 0) && (
                <li className="p-5 text-center text-sm text-muted-foreground">No members yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-medium text-foreground">Expiring Soon</h3>
              <span className="text-xs text-muted-foreground">Next 14 days</span>
            </div>
            <ul className="divide-y divide-border">
              {expiring.map((m: any) => (
                <li key={m._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar src={m.profilePhoto} name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Expires {new Date(m.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <span className={
                    "rounded-sm border px-2 py-0.5 text-xs " +
                    (m.daysLeft <= 3
                      ? "border-danger/40 bg-danger/10 text-danger"
                      : "border-gold/40 bg-gold/10 text-gold")
                  }>
                    {m.daysLeft}d left
                  </span>
                </li>
              ))}
              {expiring.length === 0 && (
                <li className="p-5 text-center text-sm text-muted-foreground">No members expiring soon.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Attendance strip */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Today's Attendance</h3>
            <span className="font-mono tabular text-sm text-foreground">
              {todayAttendance.length} / {stats.activeMembers || 0}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-sm bg-elevated">
            <div
              className="h-full bg-gold"
              style={{ width: stats.activeMembers ? `${(todayAttendance.length / stats.activeMembers) * 100}%` : '0%' }}
            />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 lg:grid-cols-5">
            {todayAttendance.map((a: any) => (
              <li key={a._id} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{a.member?.name || 'Unknown'}</span>
                <span className="font-mono tabular text-muted-foreground">
                  {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}