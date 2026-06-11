import { createFileRoute } from "@tanstack/react-router";
import { Activity, Plus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exercisesApi } from "@/lib/api/exercises.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { membersApi } from "@/lib/api/members.api";

export const Route = createFileRoute("/_app/exercises")({
  head: () => ({ meta: [{ title: "Exercise Plans - GymOS" }] }),
  component: ExercisePlansPage,
});

const goals = ["All", "Weight Loss", "Muscle Gain", "Endurance", "Flexibility", "Maintenance"];

function ExercisePlansPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [goalFilter, setGoalFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [assigningPlan, setAssigningPlan] = useState<any>(null);

  const { data: membersData } = useQuery({
    queryKey: ["members", activeGymId],
    queryFn: () => membersApi.getMembers(activeGymId!, { limit: 1000 }),
    enabled: !!activeGymId && !!assigningPlan,
  });
  const membersList = membersData?.data || [];

  const assignMutation = useMutation({
    mutationFn: ({ memberId, planId }: { memberId: string, planId: string }) => membersApi.assignExercisePlan(activeGymId!, memberId, planId),
    onSuccess: () => {
      toast.success("Exercise plan assigned successfully");
      setAssigningPlan(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign exercise plan");
    },
  });

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["exercisePlans", activeGymId],
    queryFn: () => exercisesApi.getPlans(activeGymId!),
    enabled: !!activeGymId,
  });

  const plans = plansData?.data || [];
  const filtered = plans.filter((p: any) => goalFilter === "All" || p.goal === goalFilter);

  const createMutation = useMutation({
    mutationFn: (data: any) => exercisesApi.createPlan(activeGymId!, data),
    onSuccess: () => {
      toast.success("Exercise plan created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["exercisePlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create plan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string, data: any }) => exercisesApi.updatePlan(activeGymId!, planId, data),
    onSuccess: () => {
      toast.success("Exercise plan updated");
      setOpen(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["exercisePlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => exercisesApi.deletePlan(activeGymId!, planId),
    onSuccess: () => {
      toast.success("Exercise plan deleted");
      queryClient.invalidateQueries({ queryKey: ["exercisePlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete plan");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawGoal = formData.get("goal")?.toString() || "Muscle Gain";
    const data = {
      name: formData.get("name"),
      goal: rawGoal.toLowerCase().replace(' ', '_'),
      daysPerWeek: Number(formData.get("daysPerWeek")),
      schedule: [
        {
          day: "monday",
          focusArea: formData.get("description")?.toString() || "",
          exercises: formData.get("exercises")?.toString().split('\n').filter(e => e.trim() !== '').map(name => ({
            name,
            sets: 3,
            reps: 10
          })) || []
        }
      ]
    };

    if (editingPlan) {
      updateMutation.mutate({ planId: editingPlan._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setOpen(true);
  };

  return (
    <>
      <Topbar title="Exercise Plans" subtitle="Templates assignable to members" />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {goals.map((g) => (
              <button key={g} onClick={() => setGoalFilter(g)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-xs transition-colors",
                  goalFilter === g
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}>{g}</button>
            ))}
          </div>
          <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
            No exercise plans created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p: any) => (
              <div key={p._id} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-[color-mix(in_oklch,var(--border),white_15%)] relative group">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-elevated text-gold">
                    <Activity className="h-4 w-4" />
                  </div>
                  <span className="rounded-sm border border-gold/40 bg-gold/10 px-2 py-0.5 text-xs text-gold">{p.goal}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Days/week</p>
                    <p className="font-mono tabular font-semibold text-foreground">{p.daysPerWeek || p.days || 3}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Exercises</p>
                    <p className="font-mono tabular font-semibold text-foreground">{p.exercises?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setAssigningPlan(p)} className="flex-1 h-9 rounded-sm bg-gold text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">Assign</button>
                  <button onClick={() => openEdit(p)} className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground hover:bg-elevated">Edit</button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Delete this plan?")) {
                        deleteMutation.mutate(p._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="h-9 px-3 flex items-center justify-center rounded-sm border border-border bg-surface text-danger hover:bg-elevated disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No plans found for the selected goal.
              </div>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-xl overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-card z-10 relative">
              <h3 className="font-medium text-foreground">{editingPlan ? "Edit Plan" : "Create Plan"}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-card">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan Name *</label>
                <input name="name" required defaultValue={editingPlan?.name} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="Beginner Strength" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal *</label>
                <select name="goal" required defaultValue={editingPlan?.goal || "Muscle Gain"} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                  {goals.filter(g => g !== "All").map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Days Per Week</label>
                <input name="daysPerWeek" type="number" min="1" max="7" defaultValue={editingPlan?.daysPerWeek || editingPlan?.days || 3} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea name="description" rows={3} defaultValue={editingPlan?.description} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Plan details..." />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Exercises (One per line)</label>
                <textarea name="exercises" rows={6} defaultValue={editingPlan?.exercises?.map((e:any) => typeof e === 'string' ? e : e.name).join('\n')} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold whitespace-pre" placeholder={"Bench Press\nSquats\nDeadlifts"} />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-elevated">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-surface">
              <div>
                <h3 className="font-medium text-foreground">Assign Plan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{assigningPlan.name}</p>
              </div>
              <button onClick={() => setAssigningPlan(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {membersList.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No members found.</p>
              ) : (
                membersList.map((m: any) => (
                  <div key={m._id} className="flex items-center justify-between rounded-sm border border-border bg-surface p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                    <button 
                      onClick={() => assignMutation.mutate({ memberId: m._id, planId: assigningPlan._id })}
                      disabled={assignMutation.isPending}
                      className="rounded-sm bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold hover:text-gold-foreground disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}