// Shared SEO constants and helpers used by components/SEO.astro, the Open
// Graph image endpoint and structured data.

export const SITE_NAME = "freeCodeCamp London";

/** Production origin, the same as `site` in astro.config.mjs. */
export const SITE_URL = "https://freecodecamp.london";

/**
 * Browser UI colour (meta theme-color and public/site.webmanifest): the dark
 * theme's --bg token in src/styles/global.css (tests/seo.test.ts checks).
 */
export const THEME_COLOR = "#0d1321";

/**
 * Key of a page's Open Graph card in src/pages/og/[...route].ts, from its
 * route: "/" is "index", "/about-us/" is "about-us", "/events/abc/" is
 * "events/abc".
 */
export function ogImageKey(route: string): string {
    return route.replace(/^\/+|\/+$/g, "") || "index";
}

/** URL path of a page's generated Open Graph card, e.g. "/og/about-us.png". */
export function ogImagePath(route: string): string {
    return `/og/${ogImageKey(route)}.png`;
}

/**
 * Full <title> for a page: "<title> | freeCodeCamp London", unless the title
 * already names the site (the home page).
 */
export function fullTitle(title: string): string {
    return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}
