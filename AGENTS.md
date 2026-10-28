# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Gemini CLI, Copilot, Cursor and others) working in this repository. Tool-specific files such as `CLAUDE.md` should import or point to this file rather than duplicate it.

## Project

Static website for the freeCodeCamp London community group (https://freecodecamp.london/), built with Astro 7 + Tailwind CSS 4 (via `@tailwindcss/vite`, entry `src/styles/global.css`) + TypeScript (strict). Production is built and published by Cloudflare Pages from the repository; GitHub Actions only runs checks and never deploys. Contributors are often new developers, so the workflow is fork, branch, then PR against `main` in `freeCodeCampLondon/fcc-website` (see `CONTRIBUTING.md`; new contributors add themselves to its list).

## Public repository: no secrets

This repository is public. Anything committed, including agent instruction files like this one, is visible to everyone.

- Never commit credentials, API keys, tokens, passwords, private URLs or `.env` files (`.env` and `.env.production` are gitignored; keep it that way).
- The site is fully static and needs no secrets to build or run (the Luma feed it reads at build time is public). If a feature seems to need one, stop and ask a maintainer instead of adding it.
- Do not add personal contact details (emails, phone numbers, addresses) beyond the public links already on the site.
- Keep agent instruction files free of machine-specific paths, personal tooling or private configuration; put those in your own user-level config, not in this repo.

## Commands

```bash
npm install
npm run dev          # Astro dev server (http://localhost:4321)
npm run build        # astro check (type-check) && astro build -> dist/
npm run preview      # serve the built dist/
npm run lint         # ESLint over src/**/*.{js,ts,jsx,tsx,astro}
npm run format       # Prettier check (what CI runs)
npm run format:fix   # Prettier write
npm test             # astro build, then the Vitest suite
npm run test:watch   # watch mode, reusing the existing dist/ (SKIP_BUILD=1)
npm run test:e2e     # Playwright browser checks against astro preview (build first; E2E_PORT=4xxx to use another port)
npm run data:codewars              # refresh src/data/codewars.json from the CodeWars API
npm run data:codewars -- <kata id> # also add a kata
npx vitest run tests/data.test.ts          # one test file
npx vitest run -t "mobile menu toggle"     # tests matching a name
```

CI (`.github/workflows/ci.yml`, Node from `.nvmrc`) runs `npm run lint`, `npm run format`, `npx astro check` and `npm test` on every pull request and on pushes to `main`; all must pass before a PR is mergeable. The manual `rebuild.yml` workflow (Actions > Rebuild site > Run workflow) triggers a Cloudflare Pages deploy hook (secret `CLOUDFLARE_PAGES_DEPLOY_HOOK`; it skips with a notice when the secret is not set) so the Luma feed is re-read; run it after adding an event on Luma. A weekly `links.yml` workflow checks every link in the built site with lychee and keeps one "Broken links report" issue open while links are broken. Dependabot (`.github/dependabot.yml`) opens grouped weekly npm updates; Astro majors are left to planned upgrades. `npm run build` additionally runs `astro check`, which type-checks `tests/` too.

## Tests

Vitest 5 plus happy-dom, in `tests/`:

- `tests/setup/build.ts` (global setup) runs `astro build` once with `LUMA_FEED=off` (no network, events from `manual.json` only); set `SKIP_BUILD=1` to reuse `dist/`. The build runs with its clock moved to just after the last `manual.json` event ends (`tests/setup/fixed-clock.mjs`), so every manual event is past and results do not depend on the time of day, even when an event is added on its own day.
- `pages.test.ts` asserts against the built HTML in `dist/`, not Astro internals, so it should survive Astro upgrades unchanged: every `src/pages` file builds, metadata, local assets and internal links resolve, navbar, Tailwind CSS is generated, and each page renders the data from `src/data/`.
- `interactions.test.ts` runs the inline navbar toggle, theme and event freshness scripts (with a stubbed `Date.now`) against the built markup, checks the FAQ cards and the coding challenge filters, and drives the click counter easter egg (`startClickCounter`) with `pointerdown` events in happy-dom.
- `home.test.ts` covers the home page logic: the click counter milestones (ascending, unique, after `COUNT_REVEAL`, short, upper case, family-friendly blocklist), the easter egg wiring in the built page and the script budget (all home page scripts under 15 KB gzipped).
- `contrast.test.ts` checks every theme token pair against WCAG AA, and the hero text against the skyline and river that the home canvas draws over its background (`SKYLINE_ALPHA`, `RIVER_ALPHA`).
- `text-snapshots.test.ts` keeps the visible text of every page in `tests/__snapshots__/text/*.txt` to catch whitespace and wording regressions (for example after formatter or compiler upgrades). After an intended content change, review the diff and run `npx vitest run -u`.
- `e2e/faq.spec.ts` checks every FAQ answer is visible without a click and not clipped, at 320px and 1280px.
- `e2e/home.spec.ts` checks the home hero effects in Chromium: no console errors, the animation runs and pauses off screen (by counting `requestAnimationFrame` calls), one still frame with reduced motion, a redraw on theme change, and the click counter on a 375px touch screen.
- `e2e/responsive.spec.ts` (Playwright, Chromium) checks every page at 320 to 1440px: no horizontal overflow, touch targets of at least 24px outside running text, body text of at least 16px, a one-row header, and the mobile menu. Routes come from `src/pages`, so new pages are covered automatically. Layout behaviour belongs here because happy-dom does not compute layout.
- `data.test.ts` validates the `src/data/` files (events against the collection schema with unique ids, CodeWars kata ids and ranks); `refresh-codewars.test.ts` runs the refresh script's mapping on a recorded API response in `tests/fixtures/`.
- `seo.test.ts` checks the head of every built page (title suffix, unique titles and descriptions of 50 to 160 characters, canonical URL, Open Graph and Twitter tags, `og:image` built at 1200x630, `lang="en-GB"`, icons), the 404 `noindex`, the icons and manifest, `robots.txt` and the sitemap, and the JSON-LD (home `Organization`, and `Event` required fields on any page that has one).

- `luma-feed.test.ts` covers the feed parser, the merge with `manual.json` and the fallback against the saved feed `tests/fixtures/luma-calendar.ics`; it never fetches.
- `events.test.ts` covers the event helpers in `src/lib/events.ts` with fixed dates; tests never depend on the real clock.

`pages.test.ts` also checks every event page (`/events/<id>/`, listed from `manual.json`) and its `Event` JSON-LD. When adding a page, add its route to the expected list in `pages.test.ts`; when adding nav entries, update `NAV_LINKS` there.

When adding a page, add its route to the expected list in `pages.test.ts` and its title and description to `src/data/pageMeta.ts` (see SEO below); when adding nav entries, update `NAV_LINKS` there.

## Plans

Work plans live in `docs/plan/` as Markdown named `YYYY-MM-DD-slug.md` (the date the plan was written). They double as documentation while the work is in progress. When a plan has been fully executed, delete its file in the same change that completes it.

Each plan has a table at the top with its **Order**, dependencies and status, then findings (with sources), decisions, tasks with verification steps and commit messages, test changes, open questions and a "Done when" checklist. When several plans are in flight, keep a burndown list in `docs/plan/README.md` with their order and tick plans off there (delete it when every plan is done). Check a plan's "Depends on" row first, and resolve any decision marked **Needs answer** with a maintainer before starting.

## Architecture

- **Routing**: file-based in `src/pages/` (`.astro` and Markdown pages). Every page renders through `src/layouts/Layout.astro`, which provides the skip link, `Header` (logo, `Navbar`, `ThemeToggle`), `<main id="main">` with the shared container, and `Footer`; pages only render their content and must have exactly one `<h1>`. `404.astro` builds `404.html`, which Cloudflare Pages serves for unknown URLs.
- **Navigation**: menu items live in `src/components/Navbar.astro` (one array for desktop and mobile). Internal links end with `/` (Astro builds `<page>/index.html`; links without the slash cost a redirect on Cloudflare). The current section gets `aria-current="page"`; the mobile menu button uses `aria-expanded`/`aria-controls` and closes on Escape.
- **Content as data**: page content that changes over time lives in `src/data/`, not in markup:

  - `events/manual.json`: the `events` content collection (`src/content.config.ts`, schema and helpers in `src/lib/events.ts`); see "Events" below
  - `codewars.json`: CodeWars katas (id, title, kyu rank, tags), written by `npm run data:codewars` (`scripts/refresh-codewars.mjs`, a manual run against the public CodeWars API: builds and tests never call it; beta katas are skipped). `codewars.ts` exports the typed `katas` list and `kataUrl(id)`; rendered via `components/challenges/`
  - `faq.ts`: typed list rendered via `components/faq/` on `about-us.astro`
  - `home.ts`: home page copy (hero calls to action, section headings, "Get involved" links); the "What we do" cards reuse `whatToExpect` from `about.ts`

  Updating events, challenges or FAQs should be a data-file edit only.

- **SEO and sharing** (`site` is `https://freecodecamp.london` in `astro.config.mjs`):

  - Page metadata: every `Layout` takes the props of `src/components/SEO.astro`: `title`, `description`, optional `image`, `imageAlt`, `type` (`website` or `article`) and `noindex`. Static pages keep theirs in `src/data/pageMeta.ts`, keyed by route, and render `<Layout {...pageMeta["/events/"]}>`. Titles are short and specific (SEO appends " | freeCodeCamp London" unless the title already names the site, as the home page does); descriptions are 120 to 160 characters and unique. SEO renders the title, description, canonical URL (omitted when `noindex`), Open Graph and Twitter card tags, the icons and the web manifest link.
  - Social images: `src/pages/og/[...route].ts` (`astro-og-canvas`, Lato from `@fontsource/lato`, so no network at build) draws a 1200x630 card per `pageMeta` entry at `/og/<key>.png` (`/` is `index`, `/about-us/` is `about-us`, `/events/abc/` is `events/abc`; see `ogImageKey()` in `src/lib/seo.ts`). `og:image` defaults to the card for the current route, so a page generated from data (one per event or blog post) adds its entries to `pages` in that endpoint, or passes its own `image`. The stripe, footer line and accent bar are committed PNGs in `src/assets/og/` from `node scripts/generate-og-assets.mjs`.
  - Structured data: `src/components/JsonLd.astro` renders schema.org JSON-LD; put it in the head with `<JsonLd slot="head" data={...} />` inside `Layout`. `src/lib/structuredData.ts` has the `organization` (rendered on the home page) and `eventStructuredData()`, which builds a free, in-person `Event` (required and recommended fields, price 0 GBP, organiser freeCodeCamp London) for a page dedicated to one event; Google ignores `Event` markup on list pages. Validate with the Rich Results Test and validator.schema.org.
  - Crawling: `@astrojs/sitemap` writes `sitemap-index.xml` and `sitemap-0.xml` (the 404 page is filtered out in `astro.config.mjs`); `public/robots.txt` points at the index.

- **Events**: one provider-neutral `events` collection (Luma, Meetup, Eventbrite or other). Each event has an `id` of the London date plus a slug (`2026-10-28-ai-jev-workshop-give-your-ai`, also its page slug), optional `sourceId` (`luma:evt-...`), `title`, optional `summary`, `start`/`end` as ISO 8601 with an offset, optional `venue` (`name`, `address`, `mapUrl`), `provider`, `url` (registration or event page) and `status`. Format dates and times only with the helpers in `src/lib/events.ts` (always Europe/London, so BST is handled); build provider links with `registrationLink()` (adds UTM parameters). Upcoming events are imported at build time from the group's public Luma Calendar feed (`src/lib/luma-feed.ts`, URL constant `LUMA_FEED_URL`) by the loader in `src/lib/events-loader.ts`, which merges it with `src/data/events/manual.json`. Past meetups and events from other providers are added by hand to `manual.json`; an entry with a feed event's `sourceId` and only some fields (for example `summary` or a shorter `title`) overrides that event; duplicate ids fail the build. If the feed fails, the build warns and uses `manual.json` alone (it never fails because Luma is down). Set `LUMA_FEED=off` to build without fetching (tests do). A manual GitHub Actions workflow (`rebuild.yml`) calls a Cloudflare Pages deploy hook to publish new Luma events without a code change. Pages: `src/pages/events/index.astro` (next meetup, upcoming, past archive) and `src/pages/events/[id].astro` (one page per event, with `Event` JSON-LD when the venue address is known); `src/components/NextEvent.astro` shows the next scheduled meetup anywhere. `src/components/events/EventFreshness.astro` is a small inline script that hides events which ended since the last build (see its comment for the `data-event-*` attributes).

- **Resources**: `/resources/ai-workshops/` lists the slides from Andy's AI workshops, from `src/data/resources/ai-workshops.ts` (one entry per deck, mapped to its event id). After each workshop, add the next deck there; the event page then shows a "Workshop slides" link automatically.
- **Blog**: Markdown posts in `src/content/blog/<slug>.md` (content collection `blog` in `src/content.config.ts`; files starting with `_` such as `_template.md` are ignored). Posts live at `/blog/<slug>/` (`src/pages/blog/[...slug].astro`), the list at `/blog/`, the feed at `/rss.xml` (`@astrojs/rss`). `src/lib/posts.ts` has `getPublishedPosts()` (newest first; drafts only in `astro dev`), `postUrl()` and `formatPostDate()`. Old `/blog/posts/...` URLs redirect with 301 via `public/_redirects` (Cloudflare Pages). Contributor steps are in `CONTRIBUTING.md` ("Writing a blog post"). Tests list post routes with `postRoutes()` from `tests/helpers/dist.ts`.
- **Home page** (`src/pages/index.astro`, components in `src/components/home/`): sections in order are the hero (the only `<h1>`, the agreed tagline, "Join the next meetup" to `#next-meetup` and "Start learning on freeCodeCamp"), the next meetup (`NextEvent`, `utm_campaign=home`), "What we do", "From the blog" (the latest post) and "Get involved". The site does not mention money or prices. Each section is a `<section aria-labelledby>` with an `<h2>`.

  - Background: `src/scripts/london-background.ts` draws "London at night" on the hero canvas (`aria-hidden`): our own skyline drawings (no TfL or other trademarked marks), the Thames, drifting code stars that link up around the pointer, and a ripple plus a burst of code glyphs on click or tap (not on links or buttons). It reads colours from the theme tokens and redraws when `data-theme` changes, caps DPR at 2, scales the star count with the hero area, pauses when the tab is hidden or the hero is off screen, draws one still frame with `prefers-reduced-motion`, and starts after `load` when the browser is idle so it never delays the first paint. No third-party libraries.
  - Easter egg: `src/scripts/click-counter.ts` counts taps on the hero background in `localStorage["fcclondon.clicks"]` (keeps working for the visit when storage is blocked); from `COUNT_REVEAL` (10) the running total floats up from the pointer, and at each milestone in `src/scripts/click-milestones.ts` a message pops over the wordmark and is written to a polite live region. Keep messages family-friendly, upper case and at most 40 characters (`tests/home.test.ts`). Styles are `.hero-count` and `.hero-milestone` in `global.css` (`@layer components`), with fade-only reduced motion variants. The effects are pointer-only by design; keyboard users lose nothing.

- **Assets**: SVG icons imported from `src/assets/images/` (processed by Astro); `public/` holds files served as-is: `favicon.svg`, `robots.txt`, `site.webmanifest`, and `favicon.ico`, `apple-touch-icon.png` and `icon-192.png`/`icon-512.png`, which `node scripts/generate-icons.mjs` generates from `favicon.svg` with sharp (rerun and commit after changing the SVG).
- Styling is Tailwind utility classes inline, with occasional scoped `<style>` blocks per component.

## Conventions

- Versions: use the latest **LTS** Node.js (pinned in `.nvmrc`, currently 26; used by local development, CI and Cloudflare Pages) and the latest stable release of dependencies; when a tool has LTS releases, prefer its latest LTS.

- Prettier with `prettier-plugin-astro`; 4-space indentation for `.js/.ts/.jsx/.tsx/.astro` (`.prettierrc`). Existing code uses double quotes and semicolons.
- Colours come only from the theme tokens in `src/styles/global.css` (`bg-bg`, `bg-surface`, `text-text`, `text-muted`, `text-link`, `text-accent`, `border-border`, `bg-cta`/`text-cta-text`, `from-brand-from via-brand-via to-brand-to`); no colour literals in components. Dark is the default (`<html data-theme="dark">`); `ThemeToggle` switches to light. `tests/contrast.test.ts` enforces WCAG AA for every token pair, so palette changes only touch `global.css`.
- Accessibility lint is strict (`eslint-plugin-astro`'s `jsx-a11y-strict` via `eslint-plugin-jsx-a11y-x`).
- Astro 7's `astro preview` runs as a background daemon with a lock file when there is no terminal; Playwright starts it with `--ignore-lock` so it owns its server. Stop stray servers with `npx astro preview stop`.
- External links always open in a new tab with `target="_blank" rel="noopener noreferrer"` (and ideally a visually hidden "(opens in a new tab)"). Markdown posts get this automatically from the Sätteri plugin in `src/lib/markdown-external-links.mjs`; `pages.test.ts` fails the build on any external link without it.
- `.mjs` files (for example `astro.config.mjs`) are formatted with Prettier's default 2-space indentation; the 4-space override covers `.js/.ts/.jsx/.tsx/.astro` only.
- `compressHTML: true` in `astro.config.mjs` is deliberate: Astro 7's default (`"jsx"`) removes whitespace between inline elements.
- Tailwind 4 utilities live in CSS cascade layers, so global element styles must sit in `@layer base` or they override utilities.
- ESLint 10 flat config (`eslint.config.js`): JS recommended + typescript-eslint + eslint-plugin-astro recommended, browser globals (Node globals for tests).

## Known quirks
