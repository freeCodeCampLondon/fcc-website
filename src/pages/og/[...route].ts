// Open Graph cards (1200x630 PNG) for every page, generated at build time:
// /og/index.png, /og/about-us.png and so on. SEO.astro points og:image at the
// card for the current route (see ogImagePath in src/lib/seo.ts).
//
// To give a new page a card, add it to src/data/pageMeta.ts, or for pages
// generated from data (one per event or blog post) add their entries to
// `pages` below, keyed by ogImageKey(route).
//
// The stripe, footer line and accent bar come from src/assets/og/, drawn by
// scripts/generate-og-assets.mjs.
import { getCollection } from "astro:content";
import { OGImageRoute } from "astro-og-canvas";
import { eventDescription } from "../../lib/events";
import { getPublishedPosts, postUrl } from "../../lib/posts";
import { pageMeta } from "../../data/pageMeta";
import { ogImageKey } from "../../lib/seo";

interface Card {
    title: string;
    description: string;
}

const events = await getCollection("events");
const posts = await getPublishedPosts();

const pages: Record<string, Card> = Object.fromEntries([
    ...Object.entries(pageMeta).map(([route, { title, description }]) => [
        ogImageKey(route),
        { title, description },
    ]),
    // One card per blog post (/blog/<slug>/)
    ...posts.map((post) => [
        ogImageKey(postUrl(post)),
        { title: post.data.title, description: post.data.description },
    ]),
    // One card per event page (/events/<id>/)
    ...events.map(({ id, data }) => [
        ogImageKey(`/events/${id}/`),
        { title: data.title, description: eventDescription(data) },
    ]),
]);

// Lato from @fontsource/lato (installed with npm, so builds need no network).
const font = (weight: number) =>
    `./node_modules/@fontsource/lato/files/lato-latin-${weight}-normal.woff2`;

// London theme, dark tokens from src/styles/global.css as RGB.
const navy: [number, number, number] = [0x0d, 0x13, 0x21];
const surface: [number, number, number] = [0x18, 0x22, 0x35];
const text: [number, number, number] = [0xf4, 0xf6, 0xfa];
const muted: [number, number, number] = [0xc2, 0xca, 0xd8];

export const { getStaticPaths, GET } = await OGImageRoute({
    // One PNG per key: "about-us" is /og/about-us.png (matches ogImagePath).
    getSlug: (key) => `${key}.png`,
    pages,
    getImageOptions: (_key, page: Card) => ({
        title: page.title,
        description: page.description,
        bgGradient: [navy, surface],
        bgImage: { path: "./src/assets/og/background.png" },
        logo: { path: "./src/assets/og/accent.png" },
        padding: 60,
        fonts: [font(400), font(700)],
        font: {
            title: {
                families: ["Lato"],
                weight: "Bold",
                size: 68,
                lineHeight: 1.15,
                color: text,
            },
            description: {
                families: ["Lato"],
                weight: "Normal",
                size: 34,
                lineHeight: 1.4,
                color: muted,
            },
        },
    }),
});
