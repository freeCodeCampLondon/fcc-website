import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DIST_DIR, ROOT_DIR } from "../helpers/paths";

// Builds the site once before the suite runs. Page tests assert against the
// generated HTML in dist/, which keeps them independent of Astro internals.
// Set SKIP_BUILD=1 to reuse an existing dist/ (for example in watch mode).
// LUMA_FEED=off keeps the build off the network: events come from
// src/data/events/manual.json only, so tests do not change when Luma does.
// The build's clock is also moved to just after the last manual.json event
// ends (or left alone when that is already past), so every manual event is in
// the past and tests do not change with the time of day they run.
function buildNow(): string {
    const events = JSON.parse(
        readFileSync(
            join(ROOT_DIR, "src", "data", "events", "manual.json"),
            "utf8",
        ),
    ) as { end: string }[];
    const lastEnd = Math.max(...events.map((event) => Date.parse(event.end)));
    return new Date(Math.max(Date.now(), lastEnd + 60_000)).toISOString();
}

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
            TEST_BUILD_NOW: buildNow(),
            NODE_OPTIONS: [
                process.env.NODE_OPTIONS,
                `--import=${pathToFileURL(join(ROOT_DIR, "tests", "setup", "fixed-clock.mjs")).href}`,
            ]
                .filter(Boolean)
                .join(" "),
        },
    });

    if (result.status !== 0) {
        throw new Error(`astro build failed with exit code ${result.status}`);
    }
}
