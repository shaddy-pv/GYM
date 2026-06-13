import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";
import { gymApi } from "@/lib/api/gym.api";
import { setTokens, getTokens } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - GymOS" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const tokens = getTokens();
      if (tokens?.accessToken) {
        // Only redirect to dashboard if refresh token is still valid
        try {
          const refreshPayload = JSON.parse(atob(tokens.refreshToken?.split(".")[1] || ""));
          if (refreshPayload.exp * 1000 > Date.now()) {
            throw redirect({ to: "/" });
          }
        } catch (e) {
          // If token is malformed or expired, stay on login page
        }
      }
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { login, setGymId } = useAuth();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      // 1. Login
      const loginData = await authApi.login(credentials);
      const { accessToken, refreshToken, owner } = loginData.data;

      // 2. Set tokens temporarily to fetch gyms
      setTokens({ accessToken, refreshToken });

      // 3. Fetch gyms
      const gymsData = await gymApi.getMyGyms();
      const gyms = gymsData.data;

      return { owner, gyms, accessToken, refreshToken };
    },
    onSuccess: (data) => {
      login(data.owner);

      if (data.gyms.length === 0) {
        nav({ to: "/create-gym" });
      } else if (data.gyms.length === 1) {
        setGymId(data.gyms[0]._id);
        nav({ to: "/" });
      } else {
        nav({ to: "/select-gym" });
      }
    },
    onError: (err: any) => {
      setError(err.message || "Invalid credentials");
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
            Manage your gym.<br />
            <span className="text-gold">Own your growth.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            Members, payments, attendance, plans and leaderboards - one fast, focused dashboard.
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

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your gym.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const form = new FormData(e.currentTarget);
              const email = String(form.get("email") || "");
              const password = String(form.get("password") || "");
              if (!email.includes("@")) { setError("Enter a valid email."); return; }
              loginMutation.mutate({ email, password });
            }}
            className="mt-8 space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input name="email" type="email" required placeholder="owner@gym.in"
                className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative">
                <input name="password" type={show ? "text" : "password"} required placeholder="••••••••"
                  className="h-10 w-full rounded-sm border border-border bg-surface px-3 pr-10 text-sm text-foreground outline-none focus:border-gold" />
                <button type="button" onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="accent-[var(--gold)]" />
                Remember me
              </label>
              <Link to="/reset-password" className="text-gold hover:underline">Forgot password?</Link>
            </div>

            {error && (
              <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={loginMutation.isPending}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-gold text-sm font-medium text-gold-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-60">
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-gold hover:underline">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}