import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { DIST_DIR, ROOT_DIR } from "../helpers/paths";

// Builds the site once before the suite runs. Page tests assert against the
// generated HTML in dist/, which keeps them independent of Astro internals.
// Set SKIP_BUILD=1 to reuse an existing dist/ (for example in watch mode).
// LUMA_FEED=off keeps the build off the network: events come from
// src/data/events/manual.json only, so tests do not change when Luma does.
export default function setup(): void {
    if (process.env.SKIP_BUILD === "1" && existsSync(DIST_DIR)) {
        return;
    }

    const result = spawnSync("npx", ["astro", "build"], {
        cwd: ROOT_DIR,
        stdio: "inherit",
        env: {
            ...process.env,
            ASTRO_TELEMETRY_DISABLED: "1",
            LUMA_FEED: "off",
        },
    });

    if (result.status !== 0) {
        throw new Error(`astro build failed with exit code ${result.status}`);
    }
}
