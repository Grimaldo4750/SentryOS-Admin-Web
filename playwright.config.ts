import { defineConfig, devices } from "@playwright/test";

// E2E runs against the dev server with MSW enabled: the in-page worker mocks the Admin API and
// the OIDC discovery/token endpoints, while each spec intercepts the full-page authorize
// navigation (see tests/e2e/helpers/oidc.ts). No real backend is required.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_ENABLE_MSW: "true",
    },
  },
});
