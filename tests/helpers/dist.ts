import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Window } from "happy-dom";
import { DIST_DIR, PAGES_DIR, ROOT_DIR } from "./paths";

/**
 * Routes derived from the page files in src/pages (recursively), e.g. "/",
 * "/about-us/" and "/blog/posts/test/". Dynamic routes ("[id].astro") and
 * endpoints (".ts") are skipped; test those from their data instead.
 */
export function routesFromSourcePages(dir = PAGES_DIR, prefix = "/"): string[] {
    const routes: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith("[")) {
            continue;
        }
        if (entry.isDirectory()) {
            routes.push(
                ...routesFromSourcePages(
                    join(dir, entry.name),
                    `${prefix}${entry.name}/`,
                ),
            );
            continue;
        }
        const match = entry.name.match(/^(.+)\.(astro|md)$/);
        if (match) {
            routes.push(
                match[1] === "index" ? prefix : `${prefix}${match[1]}/`,
            );
        }
    }
    return routes;
}

/**
 * Maps a route or URL path to the file Astro writes for it. Handles both
 * "directory" (/about-us/index.html) and "file" (/500.html) output formats.
 */
export function distFileFor(urlPath: string): string | null {
    const clean = urlPath.split(/[?#]/)[0].replace(/^\//, "");
    const candidates = [
        join(DIST_DIR, clean),
        join(DIST_DIR, clean, "index.html"),
        join(DIST_DIR, `${clean.replace(/\/$/, "")}.html`),
    ];

    return (
        candidates.find(
            (candidate) =>
                existsSync(candidate) && statSync(candidate).isFile(),
        ) ?? null
    );
}

export function readPageHtml(route: string): string {
    const file = distFileFor(route);
    if (!file) {
        throw new Error(`No built file found in dist/ for route ${route}`);
    }
    return readFileSync(file, "utf8");
}

/** Parses a built page into a DOM. Scripts are not executed. */
export function loadPage(route: string): Document {
    const window = new Window({ url: `http://localhost${route}` });
    window.document.write(readPageHtml(route));
    return window.document as unknown as Document;
}

export function listDistFiles(extension: string): string[] {
    const found: string[] = [];
    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(path);
            } else if (entry.name.endsWith(extension)) {
                found.push(path);
            }
        }
    };
    walk(DIST_DIR);
    return found;
}

/**
 * Routes of published blog posts (src/content/blog/<slug>.md, not starting
 * with "_" and not `draft: true`), e.g. "/blog/hello-world/".
 */
export function postRoutes(): string[] {
    const dir = join(ROOT_DIR, "src", "content", "blog");
    return readdirSync(dir)
        .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
        .filter(
            (file) =>
                !/^draft:\s*true\s*$/m.test(
                    readFileSync(join(dir, file), "utf8"),
                ),
        )
        .map((file) => `/blog/${file.replace(/\.md$/, "")}/`);
}
