import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { gymApi } from "@/lib/api/gym.api";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/create-gym")({
  head: () => ({ meta: [{ title: "Create Gym - GymOS" }] }),
  component: CreateGymPage,
});

function CreateGymPage() {
  const nav = useNavigate();
  const { setGymId } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const createGymMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await gymApi.createGym(data);
      return res.data; // This is the created gym object
    },
    onSuccess: (gym) => {
      setGymId(gym._id);
      nav({ to: "/" });
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create gym");
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gold text-gold-foreground">
            <Dumbbell className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </div>
        
        <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          Let's setup your first gym
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter the details of your fitness center to get started.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const form = new FormData(e.currentTarget);
            const name = String(form.get("name") || "");
            const addressString = String(form.get("address") || "");
            const phone = String(form.get("phone") || "");
            const email = String(form.get("email") || "");

            // Backend expects an address object, not a simple string
            const address = { street: addressString };

            createGymMutation.mutate({ name, address, phone, email });
          }}
          className="mt-8 space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Gym Name</label>
            <input name="name" type="text" required placeholder="Iron Forge Fitness"
              className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Address</label>
            <textarea name="address" required placeholder="42 MG Road, Bengaluru" rows={2}
              className="w-full rounded-sm border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-gold" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Contact Phone</label>
              <input name="phone" type="tel" required placeholder="+91 9876543210"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Contact Email</label>
              <input name="email" type="email" placeholder="hello@gym.in"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
            </div>
          </div>

          {error && (
            <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={createGymMutation.isPending}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-gold text-sm font-medium text-gold-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-60">
            {createGymMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Gym"}
          </button>
        </form>
      </div>
    </div>
  );
}
