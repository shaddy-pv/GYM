import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Dumbbell, Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password - GymOS" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Extract token from URL search params manually since we aren't strongly typing the search params in tanstack right now
  const token = new URLSearchParams(window.location.search).get("token");

  const resetMutation = useMutation({
    mutationFn: async (data: any) => {
      if (token) {
        return await authApi.resetPassword({ token, newPassword: data.password });
      } else {
        return await authApi.forgotPassword(data.email);
      }
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong.");
    },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gold text-gold-foreground">
            <Dumbbell className="h-6 w-6" strokeWidth={2.5} />
          </div>
        </div>
        
        {success ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {token ? "Password updated" : "Check your email"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {token 
                ? "Your password has been successfully reset. You can now sign in." 
                : "We have sent a password reset link to your email."}
            </p>
            <Link to="/login" className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-sm bg-gold text-sm font-medium text-gold-foreground hover:bg-[color-mix(in_oklch,var(--gold),black_10%)]">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
              {token ? "Create new password" : "Reset your password"}
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {token 
                ? "Please enter your new password below." 
                : "Enter your email address and we will send you a link to reset your password."}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                const form = new FormData(e.currentTarget);
                
                if (token) {
                  const password = String(form.get("password") || "");
                  if (password.length < 6) {
                    setError("Password must be at least 6 characters.");
                    return;
                  }
                  resetMutation.mutate({ password });
                } else {
                  const email = String(form.get("email") || "");
                  if (!email.includes("@")) {
                    setError("Enter a valid email.");
                    return;
                  }
                  resetMutation.mutate({ email });
                }
              }}
              className="mt-8 space-y-4"
            >
              {token ? (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New Password</label>
                  <input name="password" type="password" required placeholder="••••••••" minLength={6}
                    className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
                  <input name="email" type="email" required placeholder="owner@gym.in"
                    className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-gold" />
                </div>
              )}

              {error && (
                <p className="rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={resetMutation.isPending}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-gold text-sm font-medium text-gold-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--gold),black_10%)] disabled:opacity-60">
                {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (token ? "Update password" : "Send reset link")}
              </button>
              
              <div className="pt-2 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back to sign in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
