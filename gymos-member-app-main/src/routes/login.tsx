import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login - GymOS" }] }),
  component: Login,
});

function Login() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const memberId = formData.get("memberId") as string;
    const password = formData.get("password") as string;

    try {
      const res = await authApi.login({ memberId, password });
      login(res.data.accessToken, res.data.refreshToken, res.data.member);
      navigate({ to: "/" });
    } catch (error: any) {
      setErr(error.response?.data?.message || error.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="-mx-0 -mb-20 flex min-h-screen flex-col bg-bg-primary">
      {/* Top brand area */}
      <div className="flex h-[40vh] flex-col items-center justify-center px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold-soft text-3xl font-black text-gold">
          G
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gold">GymOS</h1>
        <p className="mt-1 text-sm text-text-secondary">Your fitness. Your progress.</p>
        <div className="mt-6 h-px w-12 bg-gold/40" />
      </div>

      {/* Form */}
      <div className="flex-1 rounded-t-3xl border-t border-border bg-bg-secondary px-6 pt-8">
        <h2 className="text-xl font-bold">Welcome Back</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Login with credentials sent by your gym
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Member ID
            </label>
            <input
              name="memberId"
              required
              placeholder="Enter your Member ID"
              className={`h-13 w-full rounded-lg border bg-bg-surface px-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                err ? "border-red" : "border-border"
              }`}
              style={{ height: 52 }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Password
            </label>
            <div className="relative">
              <input
                name="password"
                required
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                className={`w-full rounded-lg border bg-bg-surface px-4 pr-12 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-gold/40 ${
                  err ? "border-red" : "border-border"
                }`}
                style={{ height: 52 }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary"
                aria-label="Toggle password"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {err && <p className="mt-1.5 text-xs text-red">{err}</p>}
          </div>

          <div className="flex justify-between items-center pt-1">
            <Link to="/forgot-password" className="text-xs text-text-secondary cursor-pointer hover:text-gold transition-colors">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-bg-primary active:opacity-90 disabled:opacity-70"
            style={{ height: 52 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>

          {/* Remove skip demo */}
        </form>
      </div>
    </div>
  );
}

