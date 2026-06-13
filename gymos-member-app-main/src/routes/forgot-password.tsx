import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - GymOS" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const phoneOrEmail = formData.get("phoneOrEmail") as string;

    try {
      await authApi.forgotPassword({ phoneOrEmail });
      setSuccess(true);
    } catch (error: any) {
      setErr(error.response?.data?.message || error.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="-mx-0 -mb-20 flex min-h-screen flex-col bg-bg-primary">
      <div className="flex h-[35vh] flex-col items-center justify-center px-6 relative">
        <Link to="/login" className="absolute top-6 left-6 text-gold p-2">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-soft text-3xl font-black text-gold">
          G
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gold">GymOS</h1>
      </div>

      <div className="flex-1 rounded-t-3xl border-t border-border bg-bg-secondary px-6 pt-8">
        <h2 className="text-xl font-bold">Reset Password</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {success 
            ? "If an account exists, a reset link has been sent via WhatsApp and Email." 
            : "Enter your registered phone number or email to receive a reset link."}
        </p>

        {!success ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Phone Number or Email
              </label>
              <input
                name="phoneOrEmail"
                required
                placeholder="e.g. 9876543210 or email@example.com"
                className={`h-13 w-full rounded-lg border bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-gold/40 ${
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
                  <Loader2 size={18} className="animate-spin" /> Sending...
                </>
              ) : (
                "Send Reset Link"
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
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
