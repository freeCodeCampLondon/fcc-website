import { defineConfig, devices } from "@playwright/test";

// Browser checks for layout behaviour that happy-dom cannot compute
// (overflow, target sizes). Run after a build: npm run build && npm run test:e2e
// E2E_PORT picks the preview port, so parallel checkouts (git worktrees) do not
// test each other's builds.
const port = Number(process.env.E2E_PORT ?? 4322);

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: `http://localhost:${port}`,
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: `npx astro preview --ignore-lock --port ${port}`,
        port,
        reuseExistingServer: !process.env.CI,
    },
});
