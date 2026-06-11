import { createFileRoute } from "@tanstack/react-router";
import { Utensils, Plus, Loader2, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealsApi } from "@/lib/api/meals.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { membersApi } from "@/lib/api/members.api";

export const Route = createFileRoute("/_app/meals")({
  head: () => ({ meta: [{ title: "Meal Plans - GymOS" }] }),
  component: MealPlansPage,
});

const goals = ["Weight Loss", "Muscle Gain", "Endurance", "Maintenance"];

function MealPlansPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
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
    mutationFn: ({ memberId, planId }: { memberId: string, planId: string }) => membersApi.assignMealPlan(activeGymId!, memberId, planId),
    onSuccess: () => {
      toast.success("Meal plan assigned successfully");
      setAssigningPlan(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign meal plan");
    },
  });

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["mealPlans", activeGymId],
    queryFn: () => mealsApi.getPlans(activeGymId!),
    enabled: !!activeGymId,
  });

  const mealPlans = plansData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => mealsApi.createPlan(activeGymId!, data),
    onSuccess: () => {
      toast.success("Meal plan created");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["mealPlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create meal plan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string, data: any }) => mealsApi.updatePlan(activeGymId!, planId, data),
    onSuccess: () => {
      toast.success("Meal plan updated");
      setOpen(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["mealPlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update meal plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => mealsApi.deletePlan(activeGymId!, planId),
    onSuccess: () => {
      toast.success("Meal plan deleted");
      queryClient.invalidateQueries({ queryKey: ["mealPlans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete meal plan");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawGoal = formData.get("goal")?.toString() || "Weight Loss";
    const data = {
      name: formData.get("name"),
      goal: rawGoal.toLowerCase().replace(' ', '_'),
      totalCalories: Number(formData.get("totalCalories")),
      macros: {
        protein: Number(formData.get("proteinPercentage")),
        carbs: Number(formData.get("carbsPercentage")),
        fat: Number(formData.get("fatPercentage")),
      },
      meals: formData.get("meals")?.toString().split('\n\n').filter(m => m.trim() !== '').map((mealStr, index) => {
        const lines = mealStr.split('\n');
        const types = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];
        return {
          type: types[index % types.length],
          notes: lines[0],
          calories: 0,
          items: [{ name: lines.slice(1).join(', '), quantity: "1 portion", calories: 0 }]
        };
      }) || [],
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
      <Topbar title="Meal Plans" subtitle="Goal-based nutrition templates" />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : mealPlans.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
            No meal plans created yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mealPlans.map((m: any) => (
              <div key={m._id} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-[color-mix(in_oklch,var(--border),white_15%)] relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => openEdit(m)} className="text-muted-foreground hover:text-foreground">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm("Delete this plan?")) {
                        deleteMutation.mutate(m._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-elevated text-gold">
                    <Utensils className="h-4 w-4" />
                  </div>
                  <span className="font-mono tabular text-xs text-muted-foreground">{m.totalCalories} kcal</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{m.name}</h3>
                <p className="text-xs text-gold mt-1">{m.goal}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.meals?.length || 0} meals per day</p>

                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Macros</p>
                  <div className="flex h-2 w-full overflow-hidden rounded-sm bg-elevated">
                    <div className="bg-gold" style={{ width: `${m.macros?.protein || 0}%` }} />
                    <div className="bg-success" style={{ width: `${m.macros?.carbs || 0}%` }} />
                    <div className="bg-danger" style={{ width: `${m.macros?.fat || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gold">P {m.macros?.protein || 0}%</span>
                    <span className="text-success">C {m.macros?.carbs || 0}%</span>
                    <span className="text-danger">F {m.macros?.fat || 0}%</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button onClick={() => setActive(active === m._id ? null : m._id)}
                    className="flex-1 h-9 rounded-sm border border-border bg-surface text-sm text-foreground hover:bg-elevated">
                    {active === m._id ? "Hide" : "View Full Plan"}
                  </button>
                  <button onClick={() => setAssigningPlan(m)} className="h-9 rounded-sm bg-gold px-3 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">Assign</button>
                </div>

                {active === m._id && (
                  <ul className="mt-4 divide-y divide-border rounded-sm border border-border bg-surface">
                    {m.meals?.map((meal: any, i: number) => (
                      <li key={i} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{meal.notes || meal.type}</p>
                          <p className="text-xs text-muted-foreground">{meal.items?.map((i:any) => i.name).join(', ') || ''}</p>
                        </div>
                        <span className="font-mono tabular text-xs text-gold">{meal.calories > 0 ? `${meal.calories} kcal` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
          <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-elevated shadow-xl overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-card z-10 relative">
              <h3 className="font-medium text-foreground">{editingPlan ? "Edit Meal Plan" : "Create Meal Plan"}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-card">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan Name *</label>
                <input name="name" required defaultValue={editingPlan?.name} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="Keto Shred" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Goal *</label>
                <select name="goal" required defaultValue={editingPlan?.goal || "Weight Loss"} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold">
                  {goals.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Total Calories *</label>
                <input name="totalCalories" type="number" required min="500" defaultValue={editingPlan?.totalCalories || 2000} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Protein %</label>
                  <input name="proteinPercentage" type="number" min="0" max="100" defaultValue={editingPlan?.macros?.protein || 30} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Carbs %</label>
                  <input name="carbsPercentage" type="number" min="0" max="100" defaultValue={editingPlan?.macros?.carbs || 40} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Fat %</label>
                  <input name="fatPercentage" type="number" min="0" max="100" defaultValue={editingPlan?.macros?.fat || 30} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Meals (Separate meals with double blank line)</label>
                <textarea 
                  name="meals" 
                  rows={8} 
                  defaultValue={editingPlan?.meals?.map((m:any) => `${m.notes || m.type}\n${m.items?.map((i:any)=>i.name).join(', ') || ''}`).join('\n\n')} 
                  className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold whitespace-pre font-mono text-xs" 
                  placeholder={"Breakfast\nOats, 2 Eggs, Apple\n\nLunch\nChicken Breast, Brown Rice"} 
                />
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