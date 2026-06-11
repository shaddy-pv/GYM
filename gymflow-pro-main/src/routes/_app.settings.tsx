import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gymApi } from "@/lib/api/gym.api";
import { plansApi } from "@/lib/api/plans.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings - GymOS" }] }),
  component: SettingsPage,
});

const SECTIONS = ["Gym Profile", "Plans", "Points", "Notifications"] as const;

function SettingsPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<(typeof SECTIONS)[number]>("Gym Profile");

  const { data: gymData, isLoading: gymLoading } = useQuery({
    queryKey: ["gym", activeGymId],
    queryFn: () => gymApi.getGym(activeGymId!),
    enabled: !!activeGymId,
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["plans", activeGymId],
    queryFn: () => plansApi.getPlans(activeGymId!),
    enabled: !!activeGymId,
  });

  const updateGymMutation = useMutation({
    mutationFn: (data: any) => gymApi.updateGym(activeGymId!, data),
    onSuccess: () => {
      toast.success("Gym profile updated");
      queryClient.invalidateQueries({ queryKey: ["gym", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["myGyms"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update gym");
    },
  });

  const updatePointsMutation = useMutation({
    mutationFn: (data: any) => gymApi.updatePointsConfig(activeGymId!, data),
    onSuccess: () => {
      toast.success("Points configuration updated");
      queryClient.invalidateQueries({ queryKey: ["gym", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update points config");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateGymMutation.mutate(formData);
  };

  const handlePointsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      pointsPerExercise: Number(formData.get("pointsPerExercise")),
      pointsPerCheckIn: Number(formData.get("pointsPerCheckIn")),
      streakBonus7Day: Number(formData.get("streakBonus7Day")),
      streakBonus30Day: Number(formData.get("streakBonus30Day")),
    };
    updatePointsMutation.mutate(data);
  };

  const gym = gymData?.data;
  const plans = plansData?.data || [];

  return (
    <>
      <Topbar title="Settings" subtitle="Configure your gym" />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)}
              className={cn(
                "rounded-sm px-3 py-2 text-left text-sm transition-colors whitespace-nowrap",
                section === s ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-elevated hover:text-foreground",
              )}>{s}</button>
          ))}
        </nav>

        <div className="rounded-md border border-border bg-card p-6">
          {section === "Gym Profile" && (
            gymLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
                <Field name="name" label="Gym Name" defaultValue={gym?.name} required />
                <Field name="address" label="Address" defaultValue={gym?.address} required />
                <Field name="phone" label="Phone" defaultValue={gym?.phone} />
                <Field name="email" label="Email" defaultValue={gym?.email} type="email" />
                <div className="pt-4 border-t border-border">
                  <button type="submit" disabled={updateGymMutation.isPending} className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50">
                    {updateGymMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            )
          )}

          {section === "Plans" && (
            plansLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No membership plans configured. Go to Plans page to create some.</p>
            ) : (
              <ul className="divide-y divide-border">
                {plans.map((p: any) => (
                  <li key={p._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.durationInMonths} Months</p>
                    </div>
                    <span className="font-mono tabular text-foreground">₹{p.price.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {section === "Points" && (
            gymLoading ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
            ) : (
              <form onSubmit={handlePointsSubmit} className="space-y-4 max-w-md">
                <Field name="pointsPerExercise" label="Points per exercise completed" defaultValue={gym?.pointsConfig?.pointsPerExercise || "10"} type="number" required />
                <Field name="pointsPerCheckIn" label="Points per check-in" defaultValue={gym?.pointsConfig?.pointsPerCheckIn || "5"} type="number" required />
                <Field name="streakBonus7Day" label="7-day streak bonus" defaultValue={gym?.pointsConfig?.streakBonus7Day || "50"} type="number" required />
                <Field name="streakBonus30Day" label="30-day streak bonus" defaultValue={gym?.pointsConfig?.streakBonus30Day || "200"} type="number" required />
                <div className="pt-4 border-t border-border">
                  <button type="submit" disabled={updatePointsMutation.isPending} className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50">
                    {updatePointsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Config
                  </button>
                </div>
              </form>
            )
          )}

          {section === "Notifications" && (
            <div className="space-y-3 max-w-md">
              {["WhatsApp reminders", "Email reminders", "Renewal alerts", "Birthday wishes"].map((n) => (
                <label key={n} className="flex items-center justify-between rounded-sm border border-border bg-surface px-4 py-3">
                  <span className="text-sm text-foreground">{n}</span>
                  <input type="checkbox" defaultChecked className="accent-[var(--gold)]" />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ name, label, defaultValue, type = "text", required = false }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold"
      />
    </div>
  );
}