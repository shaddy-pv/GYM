import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { getTokens } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const tokens = getTokens();
      if (!tokens?.accessToken) {
        throw redirect({ to: "/login" });
      }

      // Check if both tokens are expired — prevents dashboard flash for stale sessions
      try {
        const payload = JSON.parse(atob(tokens.accessToken.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          // Access token expired — check if refresh token is still valid
          if (!tokens.refreshToken) throw redirect({ to: "/login" });
          const refreshPayload = JSON.parse(atob(tokens.refreshToken.split(".")[1]));
          if (refreshPayload.exp * 1000 < Date.now()) {
            throw redirect({ to: "/login" });
          }
          // Refresh token is still valid — let the Axios interceptor handle the refresh
        }
      } catch (e) {
        // Re-throw TanStack Router redirect objects so navigation works correctly
        if (isRedirect(e)) throw e;
        // Any other error (e.g. malformed token) → redirect to login
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}