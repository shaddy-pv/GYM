import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/Card";
import { ChevronRight, LogOut, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile.api";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - GymOS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [t, setT] = useState({ workout: true, fee: true, streak: true });
  const [time, setTime] = useState("07:00");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to change password");
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return toast.error("Fill in all fields");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (!/[A-Z]/.test(newPassword)) return toast.error("Password must contain an uppercase letter");
    if (!/[0-9]/.test(newPassword)) return toast.error("Password must contain a number");
    changePasswordMutation.mutate({ currentPassword, newPassword, confirmPassword });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <>
      <TopBar title="Settings" back showBell={false} />
      <main className="flex flex-col gap-5 px-4 pt-4">
        <Group title="Account">
          <button
            type="button"
            onClick={() => setShowChangePassword((p) => !p)}
            className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left last:border-0"
          >
            <span className="text-sm">Change Password</span>
            <ChevronRight size={16} className={`text-text-secondary transition-transform ${showChangePassword ? "rotate-90" : ""}`} />
          </button>
          {showChangePassword && (
            <div className="border-t border-border px-4 py-3 space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
              >
                {changePasswordMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Update Password
              </button>
            </div>
          )}
        </Group>

        <Group title="Notifications">
          <Toggle
            label="Workout reminders"
            on={t.workout}
            onChange={(v) => setT((p) => ({ ...p, workout: v }))}
          />
          <Toggle
            label="Fee alerts"
            on={t.fee}
            onChange={(v) => setT((p) => ({ ...p, fee: v }))}
          />
          <Toggle
            label="Streak alerts"
            on={t.streak}
            onChange={(v) => setT((p) => ({ ...p, streak: v }))}
          />
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm">Reminder time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-md border border-border bg-bg-surface px-2 py-1 font-mono text-sm text-gold focus:outline-none"
            />
          </div>
        </Group>

        <Group title="App">
          <Row label="Clear cache" />
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm">Version</span>
            <span className="font-mono text-xs text-text-secondary">1.0.0</span>
          </div>
        </Group>

        <button
          onClick={handleLogout}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red/40 bg-red/10 text-sm font-semibold text-red cursor-pointer"
        >
          <LogOut size={16} /> Logout
        </button>
      </main>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </div>
      <Card className="overflow-hidden p-0">{children}</Card>
    </div>
  );
}

function Row({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left last:border-0"
    >
      <span className="text-sm">{label}</span>
      <ChevronRight size={16} className="text-text-secondary" />
    </button>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          on ? "bg-gold" : "bg-bg-surface border border-border"
        }`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg-primary transition-transform ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

