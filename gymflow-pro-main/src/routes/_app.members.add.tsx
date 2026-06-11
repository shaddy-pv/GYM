import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Upload, Loader2, Key, User, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "@/lib/api/members.api";
import { plansApi } from "@/lib/api/plans.api";
import { trainersApi } from "@/lib/api/trainers.api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/members/add")({
  head: () => ({ meta: [{ title: "Add Member - GymOS" }] }),
  component: AddMember,
});

const goalOptions = ["Weight Loss", "Muscle Gain", "Maintenance", "Flexibility", "Cardio", "Strength"];

const fieldCls =
  "h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold";
const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";

function AddMember() {
  const nav = useNavigate();
  const { activeGymId } = useAuth();
  const [goals, setGoals] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleGoal = (g: string) =>
    setGoals((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const { data: plansData } = useQuery({
    queryKey: ["plans", activeGymId],
    queryFn: () => plansApi.getPlans(activeGymId!),
    enabled: !!activeGymId,
  });

  const { data: trainersData } = useQuery({
    queryKey: ["trainers", activeGymId],
    queryFn: () => trainersApi.getTrainers(activeGymId!),
    enabled: !!activeGymId,
  });

  const plans = plansData?.data || [];
  const trainers = trainersData?.data || [];

  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState<{ id: string; pass: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => membersApi.createMember(activeGymId!, data),
    onSuccess: (res) => {
      // res.data contains the new member including temporaryPassword
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
      if (res?.data?.temporaryPassword) {
        setCredentials({ id: res.data.memberId, pass: res.data.temporaryPassword });
        toast.success("Member created successfully!");
      } else {
        toast.success("Member created successfully");
        nav({ to: "/members" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create member");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Format Goals to snake_case array string for backend
    const formattedGoals = goals.map(g => g.toLowerCase().replace(' ', '_'));
    formData.set("goals", JSON.stringify(formattedGoals));
    
    // Format Phone
    const phone = formData.get("phone")?.toString() || "";
    formData.set("phone", phone.replace(/\D/g, "").slice(-10)); // Extract last 10 digits

    // Format Gender
    const gender = formData.get("gender")?.toString() || "Male";
    formData.set("gender", gender.toLowerCase());

    // Fix assignedTrainer to trainerId
    const trainer = formData.get("assignedTrainer");
    if (trainer) formData.set("trainerId", trainer);
    formData.delete("assignedTrainer");

    // Fix emergency contact
    const ecName = formData.get("emergencyContactName");
    const ecPhone = formData.get("emergencyContactPhone");
    if (ecName || ecPhone) {
      formData.set("emergencyContact", JSON.stringify({ name: ecName, phone: ecPhone }));
    }
    formData.delete("emergencyContactName");
    formData.delete("emergencyContactPhone");

    // Fix health notes
    const health = formData.get("healthIssues");
    if (health) formData.set("healthNotes", health);
    formData.delete("healthIssues");

    if (file) {
      formData.set("profilePhoto", file);
    }
    
    createMutation.mutate(formData);
  };

  return (
    <>
      <Topbar title="Add Member" subtitle="Create a new gym membership" />
      <div className="p-6 relative">
        {credentials && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
            <div className="w-full max-w-md rounded-md border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">Member Created!</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  WhatsApp and Email notifications are not configured yet. Please share these credentials manually with the member so they can log in to the Member App.
                </p>
                
                <div className="w-full space-y-3 rounded-sm border border-border bg-surface p-4 text-left">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5"/> Member ID</label>
                    <code className="block rounded bg-background px-3 py-2 font-mono text-sm text-foreground select-all">{credentials.id}</code>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Key className="h-3.5 w-3.5"/> Password</label>
                    <code className="block rounded bg-background px-3 py-2 font-mono text-sm text-foreground select-all">{credentials.pass}</code>
                  </div>
                </div>

                <button
                  onClick={() => nav({ to: "/members" })}
                  className="mt-6 w-full rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]"
                >
                  I have copied the credentials
                </button>
              </div>
            </div>
          </div>
        )}

        <Link to="/members" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to members
        </Link>

        <form
          onSubmit={handleSubmit}
          className="rounded-md border border-border bg-card p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input name="name" className={fieldCls} placeholder="Arjun Mehta" required />
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input name="phone" className={fieldCls} placeholder="+91 98765 43210" required />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input name="email" type="email" className={fieldCls} placeholder="name@email.com" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input name="dateOfBirth" type="date" className={fieldCls} />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <div className="flex gap-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground hover:border-gold">
                      <input type="radio" name="gender" value={g} className="accent-[var(--gold)]" defaultChecked={g === "Male"} />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Profile Photo</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-20 w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-surface text-sm text-muted-foreground hover:border-gold hover:text-foreground"
                >
                  {file ? (
                    <span className="text-foreground">{file.name}</span>
                  ) : (
                    <><Upload className="h-4 w-4" /> Upload photo</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Membership Plan *</label>
                <select name="membershipPlanId" className={fieldCls} required>
                  <option value="">Select plan…</option>
                  {plans.map((p: any) => (
                    <option key={p._id} value={p._id}>{p.name} - ₹{p.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Join Date *</label>
                <input name="joinDate" type="date" className={fieldCls} required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className={labelCls}>Assigned Trainer</label>
                <select name="assignedTrainer" className={fieldCls}>
                  <option value="">None</option>
                  {trainers.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Emergency Contact Name</label>
                <input name="emergencyContactName" className={fieldCls} placeholder="Family member" />
              </div>
              <div>
                <label className={labelCls}>Emergency Contact Phone</label>
                <input name="emergencyContactPhone" className={fieldCls} placeholder="+91…" />
              </div>
              <div>
                <label className={labelCls}>Health Notes</label>
                <textarea name="healthIssues" rows={3} className={cn(fieldCls, "h-auto py-2 resize-none")} placeholder="Allergies, injuries, conditions…" />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-6">
            <label className={labelCls}>Goals</label>
            <div className="flex flex-wrap gap-2">
              {goalOptions.map((g) => {
                const active = goals.includes(g);
                return (
                  <button
                    key={g} type="button" onClick={() => toggleGoal(g)}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border bg-surface text-muted-foreground hover:border-gold/50 hover:text-foreground",
                    )}
                  >{g}</button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-6">
            <Link to="/members" className="rounded-sm border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-elevated">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-sm bg-gold px-4 py-2 text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Member
            </button>
          </div>
        </form>
      </div>
    </>
  );
}