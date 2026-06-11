import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const dummy = 1;export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
