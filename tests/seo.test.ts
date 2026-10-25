import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { pageMeta } from "../src/data/pageMeta";
import { eventDescription, type EventData } from "../src/lib/events";
import { THEME_COLOR } from "../src/lib/seo";
import { eventStructuredData } from "../src/lib/structuredData";
import {
    distFileFor,
    listDistFiles,
    loadPage,
    postRoutes,
    routesFromSourcePages,
} from "./helpers/dist";
import { ROOT_DIR } from "./helpers/paths";

const SITE = "https://freecodecamp.london";

// Static pages plus published blog posts (dynamic routes listed from content).
const ROUTES = [...routesFromSourcePages(), ...postRoutes()];
const NOINDEX_ROUTES = ["/404/"];
const INDEXED_ROUTES = ROUTES.filter(
    (route) => !NOINDEX_ROUTES.includes(route),
);

const meta = (doc: Document, key: string): string | null =>
    doc
        .querySelector(`meta[name="${key}"], meta[property="${key}"]`)
        ?.getAttribute("content") ?? null;

describe.each(ROUTES)("SEO tags on %s", (route) => {
    const doc = loadPage(route);

    it("declares British English", () => {
        expect(doc.documentElement.getAttribute("lang")).toBe("en-GB");
    });

    it("has one title, suffixed with the site name except on the home page", () => {
        expect(doc.querySelectorAll("title").length).toBe(1);
        if (route === "/") {
            expect(doc.title).toBe(
                "freeCodeCamp London: learn to code together",
            );
        } else {
            expect(doc.title).toMatch(/^\S.* \| freeCodeCamp London$/);
        }
    });

    it("has a description of 50 to 160 characters", () => {
        const description = meta(doc, "description") ?? "";
        expect(description.length).toBeGreaterThanOrEqual(50);
        expect(description.length).toBeLessThanOrEqual(160);
    });

    it("has Open Graph and Twitter card tags", () => {
        for (const key of [
            "og:title",
            "og:description",
            "og:url",
            "og:type",
            "twitter:card",
        ]) {
            expect(meta(doc, key), key).toBeTruthy();
        }
        expect(meta(doc, "og:url")).toBe(`${SITE}${route}`);
        expect(meta(doc, "og:site_name")).toBe("freeCodeCamp London");
        expect(meta(doc, "og:locale")).toBe("en_GB");
        expect(meta(doc, "twitter:card")).toBe("summary_large_image");
    });

    it("has a generated 1200x630 Open Graph image that exists in dist/", () => {
        const image = meta(doc, "og:image") ?? "";
        expect(image.startsWith(`${SITE}/og/`), image).toBe(true);
        const file = distFileFor(new URL(image).pathname);
        expect(file, image).not.toBeNull();
        expect(pngSize(file!)).toEqual([1200, 630]);
        expect(meta(doc, "og:image:width")).toBe("1200");
        expect(meta(doc, "og:image:height")).toBe("630");
        expect(meta(doc, "og:image:alt")).toBe(meta(doc, "og:title"));
    });

    it("links the icons, touch icon and web manifest", () => {
        for (const selector of [
            'link[rel="icon"][href="/favicon.ico"]',
            'link[rel="icon"][href="/favicon.svg"]',
            'link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]',
            'link[rel="manifest"][href="/site.webmanifest"]',
        ]) {
            expect(doc.querySelector(selector), selector).not.toBeNull();
        }
        expect(meta(doc, "theme-color")).toBe(THEME_COLOR);
    });
});

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): [number, number] {
    const data = readFileSync(file);
    expect(data.subarray(1, 4).toString("latin1")).toBe("PNG");
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

describe("icons and manifest", () => {
    it.each([
        ["/apple-touch-icon.png", 180],
        ["/icon-192.png", 192],
        ["/icon-512.png", 512],
    ])("%s is a %ipx square PNG", (path, size) => {
        const file = distFileFor(path);
        expect(file, path).not.toBeNull();
        expect(pngSize(file!)).toEqual([size, size]);
    });

    it("favicon.ico is an icon file with a 32px image", () => {
        const data = readFileSync(distFileFor("/favicon.ico")!);
        expect(data.readUInt16LE(2)).toBe(1);
        const sizes = Array.from({ length: data.readUInt16LE(4) }, (_, i) =>
            data.readUInt8(6 + 16 * i),
        );
        expect(sizes).toContain(32);
    });

    it("the manifest lists icons that exist and uses the theme colour", () => {
        const manifest = JSON.parse(
            readFileSync(distFileFor("/site.webmanifest")!, "utf8"),
        );
        expect(manifest.name).toBe("freeCodeCamp London");
        expect(manifest.theme_color).toBe(THEME_COLOR);
        expect(manifest.background_color).toBe(THEME_COLOR);
        const sizes = manifest.icons.map(
            (icon: { src: string; sizes: string }) => {
                expect(distFileFor(icon.src), icon.src).not.toBeNull();
                return icon.sizes;
            },
        );
        expect(sizes).toEqual(["192x192", "512x512"]);
    });

    it("the theme colour matches the dark theme background token", () => {
        const css = readFileSync(
            join(ROOT_DIR, "src", "styles", "global.css"),
            "utf8",
        );
        expect(css).toMatch(
            new RegExp(`\\[data-theme="dark"\\] \\{[^}]*--bg: ${THEME_COLOR};`),
        );
    });
});

describe.each(INDEXED_ROUTES)("indexed page %s", (route) => {
    const doc = loadPage(route);

    it("has a canonical URL on the production site", () => {
        const canonical = doc.querySelectorAll('link[rel="canonical"]');
        expect(canonical.length).toBe(1);
        expect(canonical[0].getAttribute("href")).toBe(`${SITE}${route}`);
    });

    it("is not marked noindex", () => {
        expect(meta(doc, "robots")).toBeNull();
    });
});

describe("page metadata", () => {
    const docs = ROUTES.map((route) => loadPage(route));

    it("has an entry in src/data/pageMeta.ts for every page", () => {
        expect(Object.keys(pageMeta).sort()).toEqual(
            [...routesFromSourcePages()].sort(),
        );
    });

    it("gives every page a unique title and description", () => {
        const titles = docs.map((doc) => doc.title);
        const descriptions = docs.map((doc) => meta(doc, "description"));
        expect(new Set(titles).size).toBe(ROUTES.length);
        expect(new Set(descriptions).size).toBe(ROUTES.length);
    });

    it("uses the agreed tagline on the home page", () => {
        expect(meta(loadPage("/"), "description")).toBe(
            "Learn to code together in London. Free events, friendly people, everyone welcome whatever your background or experience.",
        );
    });
});

describe.each(NOINDEX_ROUTES)("noindex page %s", (route) => {
    const doc = loadPage(route);

    it("is marked noindex and has no canonical URL", () => {
        expect(meta(doc, "robots")).toBe("noindex");
        expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    });
});

/** Every JSON-LD block on a built page, parsed. */
function jsonLd(doc: Document): Record<string, unknown>[] {
    return [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
        (script) => JSON.parse(script.textContent ?? ""),
    );
}

describe("structured data", () => {
    it("describes the group as an Organization on the home page", () => {
        const blocks = jsonLd(loadPage("/"));
        const org = blocks.find((block) => block["@type"] === "Organization");
        expect(org).toBeDefined();
        expect(org!["@context"]).toBe("https://schema.org");
        expect(org!.name).toBe("freeCodeCamp London");
        expect(org!.url).toBe(`${SITE}/`);
        expect(org!.sameAs).toEqual(
            expect.arrayContaining([
                "https://discord.gg/hmVycPYAue",
                "https://luma.com/freecodecamp.london",
                "https://github.com/freeCodeCampLondon",
            ]),
        );
        const logo = org!.logo as string;
        expect(logo.startsWith(`${SITE}/`)).toBe(true);
        expect(distFileFor(new URL(logo).pathname), logo).not.toBeNull();
    });

    it("gives every Event its required fields on every built page", () => {
        for (const file of listDistFiles(".html")) {
            const window = new Window();
            window.document.write(readFileSync(file, "utf8"));
            const doc = window.document as unknown as Document;
            for (const block of jsonLd(doc)) {
                if (block["@type"] !== "Event") {
                    continue;
                }
                const location = block.location as {
                    address?: { streetAddress?: string };
                };
                expect(block.name, file).toBeTruthy();
                expect(block.startDate, file).toBeTruthy();
                expect(location?.address?.streetAddress, file).toBeTruthy();
                // Recommended fields Search Console reports when missing
                expect(block.description, file).toBeTruthy();
                expect(block.performer, file).toBeTruthy();
                for (const image of block.image as string[]) {
                    expect(image.startsWith(`${SITE}/`), file).toBe(true);
                    expect(
                        distFileFor(new URL(image).pathname),
                        image,
                    ).not.toBeNull();
                }
            }
        }
    });

    it("builds Event data for a free, in-person meetup", () => {
        const id = "2026-11-12-coding-meetup";
        const meetup: EventData = {
            id,
            title: "Coding meetup",
            start: new Date("2026-11-12T18:30:00+00:00"),
            end: new Date("2026-11-12T21:00:00+00:00"),
            venue: { name: "Example venue", address: "1 Example Street" },
            provider: "luma",
            url: "https://luma.com/example",
            status: "scheduled",
        };
        const event = eventStructuredData(id, meetup);
        expect(event).toMatchObject({
            "@type": "Event",
            description: eventDescription(meetup),
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode:
                "https://schema.org/OfflineEventAttendanceMode",
            location: {
                "@type": "Place",
                address: {
                    streetAddress: "1 Example Street",
                    addressCountry: "GB",
                },
            },
            image: [`${SITE}/og/events/${id}.png`],
            offers: { price: 0, priceCurrency: "GBP" },
            organizer: { name: "freeCodeCamp London" },
            performer: { name: "freeCodeCamp London" },
        });
        expect(
            eventStructuredData(id, { ...meetup, venue: { name: "Online" } }),
        ).toBeUndefined();
    });
});

describe("crawl files", () => {
    const sitemapUrls = (): string[] => {
        const xml = readFileSync(distFileFor("/sitemap-0.xml")!, "utf8");
        return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    };

    it("robots.txt allows crawling and points at the sitemap index", () => {
        const robots = readFileSync(distFileFor("/robots.txt")!, "utf8");
        expect(robots).toContain("User-agent: *");
        expect(robots).toContain("Allow: /");
        expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`);
    });

    it("the sitemap index lists sitemap-0.xml", () => {
        const xml = readFileSync(distFileFor("/sitemap-index.xml")!, "utf8");
        expect(xml).toContain(`<loc>${SITE}/sitemap-0.xml</loc>`);
    });

    it("the sitemap lists every indexed page and no noindex page", () => {
        const urls = sitemapUrls();
        for (const route of routesFromSourcePages()) {
            const url = `${SITE}${route}`;
            if (NOINDEX_ROUTES.includes(route)) {
                expect(urls, url).not.toContain(url);
            } else {
                expect(urls, url).toContain(url);
            }
        }
    });
});
