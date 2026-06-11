import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Tag, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi } from "@/lib/api/plans.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/plans")({
  head: () => ({ meta: [{ title: "Membership Plans - GymOS" }] }),
  component: PlansPage,
});

function PlansPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const { data: plansData, isLoading } = useQuery({
    queryKey: ["plans", activeGymId],
    queryFn: () => plansApi.getPlans(activeGymId!),
    enabled: !!activeGymId,
  });

  const plans = plansData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => plansApi.createPlan(activeGymId!, data),
    onSuccess: () => {
      toast.success("Plan created successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["plans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create plan");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string, data: any }) => plansApi.updatePlan(activeGymId!, planId, data),
    onSuccess: () => {
      toast.success("Plan updated successfully");
      setOpen(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["plans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update plan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => plansApi.deletePlan(activeGymId!, planId),
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["plans", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete plan");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const months = Number(formData.get("durationInMonths"));
    const data = {
      name: formData.get("name"),
      durationDays: months * 30,   // backend needs days
      price: Number(formData.get("price")),
      description: formData.get("description"),
      features: formData.get("features")?.toString().split("\n").filter(f => f.trim() !== "") || [],
    };

    if (editingPlan) {
      updateMutation.mutate({ planId: editingPlan._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setOpen(true);
  };

  const openCreate = () => {
    setEditingPlan(null);
    setOpen(true);
  };

  return (
    <>
      <Topbar title="Membership Plans" subtitle="Configure pricing & perks" />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
            No plans configured yet. Click "New Plan" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((p: any) => (
              <div key={p._id} className="flex flex-col rounded-md border border-border bg-card p-5 transition-colors hover:border-[color-mix(in_oklch,var(--border),white_15%)]">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-elevated text-gold">
                    <Tag className="h-4 w-4" />
                  </div>
                  <span className="rounded-sm border border-border bg-surface px-2 py-0.5 text-xs text-muted-foreground">{p.durationDays ? `${Math.round(p.durationDays / 30)} Months` : "–"}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                <p className="font-mono tabular mt-2 text-2xl font-bold text-foreground">₹{p.price.toLocaleString("en-IN")}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features?.map((perk: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" /> <span className="leading-tight">{perk}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => openEdit(p)} className="h-9 flex-1 rounded-sm border border-border bg-surface text-sm text-foreground hover:bg-elevated">Edit</button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${p.name}?`)) {
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
                <input name="name" required defaultValue={editingPlan?.name} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="e.g. Pro Annual" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Duration (Months) *</label>
                  <input name="durationInMonths" type="number" required min="1" defaultValue={editingPlan ? Math.round((editingPlan?.durationDays || 30) / 30) : undefined} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="12" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Price (₹) *</label>
                  <input name="price" type="number" required min="0" defaultValue={editingPlan?.price} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="15000" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
                <textarea name="description" rows={2} defaultValue={editingPlan?.description} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Brief summary of the plan..." />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Features (One per line)</label>
                <textarea name="features" rows={5} defaultValue={editingPlan?.features?.join("\n")} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold whitespace-pre" placeholder={"Full gym access\nLocker room\n2 Guest passes/month"} />
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
    </>
  );
}