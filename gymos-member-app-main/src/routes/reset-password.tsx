import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password - GymOS" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);
  const [show, setShow] = useState(false);
  
  // Extract token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      setErr("Invalid or missing reset token.");
      return;
    }

    setErr("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({ token, password });
      setSuccess(true);
    } catch (error: any) {
      setErr(error.response?.data?.message || error.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="-mx-0 -mb-20 flex min-h-screen flex-col bg-bg-primary">
      <div className="flex h-[35vh] flex-col items-center justify-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-soft text-3xl font-black text-gold">
          G
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gold">GymOS</h1>
      </div>

      <div className="flex-1 rounded-t-3xl border-t border-border bg-bg-secondary px-6 pt-8">
        <h2 className="text-xl font-bold">Create New Password</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {success 
            ? "Your password has been successfully reset. You can now log in." 
            : "Enter a strong new password below."}
        </p>

        {!token && !success ? (
          <div className="mt-6 rounded-lg border border-red/20 bg-red/5 p-4 text-sm text-red">
            Invalid or missing reset token. Please request a new link from the login page.
            <div className="mt-4">
              <Link to="/login" className="text-gold underline">Back to Login</Link>
            </div>
          </div>
        ) : !success ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                New Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  required
                  type={show ? "text" : "password"}
                  placeholder="Enter new password"
                  className={`w-full rounded-lg border bg-bg-surface px-4 pr-12 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                    err ? "border-red" : "border-border"
                  }`}
                  style={{ height: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Confirm New Password
              </label>
              <input
                name="confirmPassword"
                required
                type={show ? "text" : "password"}
                placeholder="Confirm new password"
                className={`w-full rounded-lg border bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                  err ? "border-red" : "border-border"
                }`}
                style={{ height: 52 }}
              />
              {err && <p className="mt-1.5 text-xs text-red">{err}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-bg-primary active:opacity-90 disabled:opacity-70 mt-6"
              style={{ height: 52 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        ) : (
          <div className="mt-8">
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-bg-primary active:opacity-90"
              style={{ height: 52 }}
            >
              Login to GymOS
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
