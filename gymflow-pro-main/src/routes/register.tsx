import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";
import { setTokens } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Sign up - GymOS" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await authApi.register(data);
      const { accessToken, refreshToken, owner } = res.data;
      setTokens({ accessToken, refreshToken });
      return owner;
    },
    onSuccess: (owner) => {
      login(owner);
      nav({ to: "/create-gym" }); // After sign up, redirect to create first gym
    },
    onError: (err: any) => {
      setError(err.message || "Failed to register");
    },
  });

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gold text-gold-foreground">
            <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">GymOS</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Start your free trial.<br />
            <span className="text-gold">No credit card required.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Join thousands of serious gyms using GymOS. Get 14 days free to manage your members, payments, and attendance.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 GymOS · Built for serious gyms</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gold text-gold-foreground">
              <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">GymOS</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Create account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter your details to get started.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const form = new FormData(e.currentTarget);
              const name = String(form.get("name") || "");
              const email = String(form.get("email") || "");
              const password = String(form.get("password") || "");
              let phone = String(form.get("phone") || "");
              // Strip all non-digits and take the last 10 digits to handle +91 formatting gracefully
              phone = phone.replace(/\D/g, "").slice(-10);
              
              if (!email.includes("@")) { setError("Enter a valid email."); return; }
              if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
              if (!/[A-Z]/.test(password)) { setError("Password must contain an uppercase letter."); return; }
              if (!/[0-9]/.test(password)) { setError("Password must contain a number."); return; }
              if (!/^[6-9]\d{9}$/.test(phone)) { setError("Invalid Indian phone number (10 digits)."); return; }
              
              registerMutation.mutate({ name, email, password, phone });
            }}
            className="mt-8 space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input name="name" type="text" required placeholder="John Doe"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input name="email" type="email" required placeholder="owner@gym.in"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Phone</label>
              <input name="phone" type="tel" required placeholder="+91 9876543210"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <input name="password" type="password" required placeholder="••••••••" minLength={6}
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
            </div>

            {error && (
              <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={registerMutation.isPending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-gold text-sm font-medium text-gold-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-60">
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/" className="text-gold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
