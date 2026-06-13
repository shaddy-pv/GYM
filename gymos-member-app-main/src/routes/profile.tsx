import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { profileApi } from "@/lib/api/profile.api";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  Dumbbell,
  LogOut,
  Settings as SettingsIcon,
  Star,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile - GymOS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { member: authMember, logout } = useAuth();
  const navigate = useNavigate();

  const { data: profileData } = useQuery({
    queryKey: ["memberProfile"],
    queryFn: profileApi.getProfile,
  });

  const member = profileData?.data || authMember || {};

  const initials = member?.name
    ? member.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")
    : "ME";

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <>
      <TopBar title="My Profile" />

      <main className="flex flex-col gap-5 px-4 pt-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-2xl font-extrabold text-gold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{member?.name || "Member"}</div>
            <div className="font-mono text-[11px] text-text-secondary">{member?.memberId || "..."}</div>
            <span className="mt-1 inline-block rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">
              {member?.fitnessGoal || "Fitness"}
            </span>
          </div>
          <Link
            to="/settings"
            aria-label="Edit"
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary active:bg-bg-surface"
          >
            <SettingsIcon size={18} />
          </Link>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <InfoTile label="Membership" value={member?.membershipPlan?.name || "None"} />
          <InfoTile label="Trainer" value={member?.trainer?.name || "Unassigned"} />
          <InfoTile label="Joined" value={member?.joinDate ? format(new Date(member.joinDate), "MMM yyyy") : "-"} />
          <InfoTile label="Expiry" value={member?.expiryDate ? format(new Date(member.expiryDate), "dd MMM yyyy") : "-"} accent />
        </div>

        <Card>
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Body Stats
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="Height" value={`${member?.height || "-"}`} unit="cm" />
            <Stat label="Weight" value={`${member?.weight || "-"}`} unit="kg" />
            <Stat
              label="BMI"
              value={member?.weight && member?.height ? (member.weight / Math.pow(member.height / 100, 2)).toFixed(1) : "-"}
              unit=""
            />
          </div>
        </Card>

        <Card>
          <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            This Month
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <MiniRow icon={<Trophy size={14} className="text-gold" />} label="Attendance" value={`${member?.stats?.attendanceCount || 0}`} />
            <MiniRow icon={<Dumbbell size={14} className="text-gold" />} label="Workouts" value={`${member?.stats?.workoutCount || 0}`} />
            <MiniRow icon={<Star size={14} className="text-gold" />} label="Points" value={`${member?.totalPoints || 0}`} />
            <MiniRow icon={<Bell size={14} className="text-gold" />} label="Notifications" value="On" />
          </div>
        </Card>

        {member?.trainer && (
          <Card className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft font-bold text-gold">
              {member.trainer.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{member.trainer.name}</div>
              <div className="text-[11px] text-text-secondary">{member.trainer.specialization || "Trainer"}</div>
            </div>
            <button className="rounded-full border border-gold/40 px-3 py-1.5 text-[11px] font-semibold text-gold">
              Contact
            </button>
          </Card>
        )}

        <Link
          to="/settings"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <span className="text-sm font-semibold">Settings</span>
          <ChevronRight size={18} className="text-text-secondary" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red/40 bg-red/10 text-sm font-semibold text-red cursor-pointer"
        >
          <LogOut size={16} /> Logout
        </button>
      </main>
    </>
  );
}

function InfoTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-bold">
        {value}
        <span className="ml-0.5 text-[10px] text-text-secondary">{unit}</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
    </div>
  );
}

function MiniRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        {icon} {label}
      </span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  );
}

