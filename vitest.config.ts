import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_OIDC_AUTHORITY: "https://localhost/SentryOS-IdP",
      VITE_OIDC_CLIENT_ID: "sentry-management-web-app",
      VITE_ADMIN_API_BASE_URL: "https://localhost/SentryOS-API",
    },
  },
});
