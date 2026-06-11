import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Use a static/client-side output — no Nitro SSR server needed
    // All routing is handled by TanStack Router on the client
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 3000,
      strictPort: true,
    },
  },
});
