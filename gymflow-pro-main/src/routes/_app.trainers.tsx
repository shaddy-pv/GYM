import { createFileRoute } from "@tanstack/react-router";
import { Plus, Loader2, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Avatar } from "@/components/shared/Avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainersApi } from "@/lib/api/trainers.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/trainers")({
  head: () => ({ meta: [{ title: "Trainers - GymOS" }] }),
  component: TrainersPage,
});

function TrainersPage() {
  const { activeGymId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);

  const { data: trainersData, isLoading } = useQuery({
    queryKey: ["trainers", activeGymId],
    queryFn: () => trainersApi.getTrainers(activeGymId!),
    enabled: !!activeGymId,
  });

  const trainersList = trainersData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: FormData) => trainersApi.createTrainer(activeGymId!, data),
    onSuccess: () => {
      toast.success("Trainer added successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["trainers", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add trainer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ trainerId, data }: { trainerId: string, data: FormData }) => trainersApi.updateTrainer(activeGymId!, trainerId, data),
    onSuccess: () => {
      toast.success("Trainer updated successfully");
      setOpen(false);
      setEditingTrainer(null);
      queryClient.invalidateQueries({ queryKey: ["trainers", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update trainer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (trainerId: string) => trainersApi.deleteTrainer(activeGymId!, trainerId),
    onSuccess: () => {
      toast.success("Trainer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["trainers", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete trainer");
    },
  });

  const [assigningTrainer, setAssigningTrainer] = useState<any>(null);

  const { data: membersData } = useQuery({
    queryKey: ["members", activeGymId],
    queryFn: () => membersApi.getMembers(activeGymId!, { limit: 1000 }),
    enabled: !!activeGymId && !!assigningTrainer,
  });
  const membersList = membersData?.data || [];

  const assignMutation = useMutation({
    mutationFn: ({ memberId, trainerId }: { memberId: string, trainerId: string }) => membersApi.assignTrainer(activeGymId!, memberId, trainerId),
    onSuccess: () => {
      toast.success("Trainer assigned successfully");
      setAssigningTrainer(null);
      queryClient.invalidateQueries({ queryKey: ["trainers", activeGymId] });
      queryClient.invalidateQueries({ queryKey: ["members", activeGymId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign trainer");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Format Phone
    const phone = formData.get("phone")?.toString() || "";
    formData.set("phone", phone.replace(/\D/g, "").slice(-10));
    
    if (editingTrainer) {
      updateMutation.mutate({ trainerId: editingTrainer._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    setOpen(true);
  };

  const openCreate = () => {
    setEditingTrainer(null);
    setOpen(true);
  };

  return (
    <>
      <Topbar title="Trainers" subtitle={`${trainersList.length} active trainers`} />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex h-9 items-center gap-1.5 rounded-sm bg-gold px-4 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
            <Plus className="h-4 w-4" /> Add Trainer
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : trainersList.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground">
            No trainers added yet. Click "Add Trainer" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainersList.map((t: any) => (
              <div key={t._id} className="rounded-md border border-border bg-card p-5 transition-colors hover:border-[color-mix(in_oklch,var(--border),white_15%)] relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${t.name}?`)) {
                        deleteMutation.mutate(t._id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-muted-foreground hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <Avatar src={t.profilePhoto} name={t.name} size="lg" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.specialization} · {t.experience} years</p>
                    <p className="font-mono tabular mt-1 text-xs text-muted-foreground">{t.phone}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Members</p>
                    <p className="font-mono tabular font-semibold text-foreground">{t.assignedMembersCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Specialty</p>
                    <p className="text-foreground">{t.specialization}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <button onClick={() => setAssigningTrainer(t)} className="w-full h-9 rounded-sm bg-gold text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">Assign to Member</button>
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
              <h3 className="font-medium text-foreground">{editingTrainer ? "Edit Trainer" : "Add Trainer"}</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-card">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name *</label>
                <input name="name" required defaultValue={editingTrainer?.name} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone *</label>
                <input name="phone" required defaultValue={editingTrainer?.phone} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                <input name="email" type="email" defaultValue={editingTrainer?.email} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Specialization</label>
                <input name="specialization" defaultValue={editingTrainer?.specialization} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="Strength Training" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Experience (Years)</label>
                <input name="experience" type="number" min="0" defaultValue={editingTrainer?.experience} className="h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" placeholder="5" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Bio</label>
                <textarea name="bio" rows={3} defaultValue={editingTrainer?.bio} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-gold" placeholder="Brief biography..." />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Profile Photo</label>
                <input type="file" name="profilePhoto" accept="image/*" className="w-full text-sm text-muted-foreground file:mr-4 file:rounded-sm file:border file:border-border file:bg-surface file:px-4 file:py-2 file:text-sm file:text-foreground hover:file:bg-elevated" />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-4">
                <button type="button" onClick={() => setOpen(false)} className="rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-elevated">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-md border border-border bg-card shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="border-b border-border px-6 py-4 flex justify-between items-center bg-surface">
              <div>
                <h3 className="font-medium text-foreground">Assign Trainer</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{assigningTrainer.name}</p>
              </div>
              <button onClick={() => setAssigningTrainer(null)} className="text-muted-foreground hover:text-foreground">✕</button>
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
                      onClick={() => assignMutation.mutate({ memberId: m._id, trainerId: assigningTrainer._id })}
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