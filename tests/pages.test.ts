import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getInvolved, whatToExpect } from "../src/data/about";
import { aiWorkshopDecks } from "../src/data/resources/ai-workshops";
import { kataRanks, kataUrl, katas } from "../src/data/codewars";
import manualEntries from "../src/data/events/manual.json";
import { faqAnswer } from "../src/data/faq";
import { getInvolvedHome, hero as homeHero } from "../src/data/home";
import {
    distFileFor,
    listDistFiles,
    loadPage,
    postRoutes,
    routesFromSourcePages,
} from "./helpers/dist";

// Event pages come from a dynamic route, so list them from the data. The test
// build runs with LUMA_FEED=off, so only src/data/events/manual.json is used.
// Entries without a start only override a feed event, so they have no page.
const manualEvents = manualEntries.filter((entry) => "start" in entry);
const EVENT_ROUTES = manualEvents.map((event) => `/events/${event.id}/`);
const ROUTES = [...routesFromSourcePages(), ...EVENT_ROUTES];

const PAGES_WITHOUT_LAYOUT: string[] = [];
const LAYOUT_ROUTES = ROUTES.filter(
    (route) => !PAGES_WITHOUT_LAYOUT.includes(route),
);

// Every page rendered through the layout has the header, navbar and footer.
const NAV_ROUTES = LAYOUT_ROUTES;

const NAV_LINKS = {
    "About Us": "/about-us/",
    "Coding Challenges": "/coding-challenges/",
    Blog: "/blog/",
    Events: "/events/",
};

// Home page sections after the hero, in order (src/pages/index.astro).
const HOME_SECTIONS = [
    "Next meetup",
    "What we do",
    "From the blog",
    "Get involved",
];

const textOf = (doc: Document): string =>
    doc.body.textContent?.replace(/\s+/g, " ") ?? "";

describe("build output", () => {
    it("covers the expected routes", () => {
        expect(ROUTES.sort()).toEqual(
            [
                "/",
                "/404/",
                "/about-us/",
                "/blog/",
                "/coding-challenges/",
                "/events/",
                "/resources/ai-workshops/",
                ...EVENT_ROUTES,
            ].sort(),
        );
    });

    it.each(ROUTES)("builds a file for %s", (route) => {
        expect(distFileFor(route)).not.toBeNull();
    });

    it("generates Tailwind utility classes used in the markup", () => {
        const css = listDistFiles(".css")
            .map((file) => readFileSync(file, "utf8"))
            .join("\n");
        for (const utility of ["bg-yellow-700", "text-6xl", "md\\:hidden"]) {
            expect(css, utility).toContain(`.${utility}`);
        }
    });
});

describe.each(LAYOUT_ROUTES)("page %s", (route) => {
    const doc = loadPage(route);

    it("has the base document metadata", () => {
        expect(doc.documentElement.getAttribute("lang")).toBe("en-GB");
        expect(doc.querySelector("meta[charset]")).not.toBeNull();
        expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
        expect(doc.querySelector('meta[name="description"]')).not.toBeNull();
        expect(doc.title.trim()).not.toBe("");
    });

    it("defaults to the dark theme and declares both colour schemes", () => {
        expect(doc.documentElement.dataset.theme).toBe("dark");
        expect(
            doc
                .querySelector('meta[name="color-scheme"]')
                ?.getAttribute("content"),
        ).toBe("dark light");
    });

    it("links a favicon that exists", () => {
        const href = doc
            .querySelector('link[rel="icon"]')
            ?.getAttribute("href");
        expect(href).toBeTruthy();
        expect(distFileFor(href!)).not.toBeNull();
    });

    it("only references local assets that were built", () => {
        const refs = [
            ...[...doc.querySelectorAll("link[href]")].map((el) =>
                el.getAttribute("href"),
            ),
            ...[...doc.querySelectorAll("img[src], script[src]")].map((el) =>
                el.getAttribute("src"),
            ),
        ].filter((ref): ref is string => !!ref && ref.startsWith("/"));

        for (const ref of refs) {
            expect(distFileFor(ref), ref).not.toBeNull();
        }
    });

    it("only links to internal pages that exist", () => {
        const hrefs = [...doc.querySelectorAll("a[href]")]
            .map((el) => el.getAttribute("href")!)
            .filter((href) => href.startsWith("/"));

        for (const href of hrefs) {
            expect(distFileFor(href), href).not.toBeNull();
        }
    });

    it("links to Meetup only for the community group (events are on Luma)", () => {
        const hrefs = [...doc.querySelectorAll("a[href]")]
            .map((el) => el.getAttribute("href"))
            .filter((href) => href?.includes("meetup.com"));
        for (const href of hrefs) {
            expect(href).toBe("https://www.meetup.com/freecodecamp-london/");
        }
    });

    it("gives every image alt text", () => {
        for (const img of doc.querySelectorAll("img")) {
            expect(img.getAttribute("alt")?.trim(), img.outerHTML).toBeTruthy();
        }
    });
});

describe.each(NAV_ROUTES)("shell on %s", (route) => {
    const doc = loadPage(route);

    it("has one h1, header, main landmark and footer", () => {
        expect(doc.querySelectorAll("h1").length).toBe(1);
        expect(doc.querySelectorAll("header").length).toBe(1);
        expect(doc.querySelectorAll("main#main").length).toBe(1);
        expect(doc.querySelectorAll("body > footer").length).toBe(1);
    });

    it("starts with a skip link to the main content", () => {
        const skip = doc.querySelector("body > a");
        expect(skip?.getAttribute("href")).toBe("#main");
        expect(skip?.textContent).toContain("Skip to content");
    });

    it("shows the logo link in the header", () => {
        const logo = doc.querySelector('header a[href="/"]');
        expect(logo?.textContent).toContain("freeCodeCamp");
    });

    it("has a theme toggle", () => {
        const toggle = doc.querySelector("nav button.theme-toggle");
        expect(toggle).not.toBeNull();
        expect(toggle!.getAttribute("aria-pressed")).toBe("false");
        expect(toggle!.textContent).toContain("Light theme");
    });

    it("has an accessible menu toggle button", () => {
        const button = doc.querySelector("nav button#menu");
        expect(button).not.toBeNull();
        expect(button!.getAttribute("aria-label")).toBe("Menu");
        expect(button!.getAttribute("aria-expanded")).toBe("false");
        expect(button!.getAttribute("aria-controls")).toBe("mobile-menu");
        expect(doc.getElementById("mobile-menu")).not.toBeNull();
    });

    it("links to every section in the desktop and mobile menus", () => {
        for (const [label, href] of Object.entries(NAV_LINKS)) {
            const matches = [
                ...doc.querySelectorAll(`header nav a[href="${href}"]`),
            ].filter((a) => a.textContent?.trim() === label);
            expect(matches.length, label).toBe(2);
        }
    });

    it("uses trailing-slash internal links that open in the same tab", () => {
        for (const link of doc.querySelectorAll('header a[href^="/"]')) {
            const href = link.getAttribute("href")!;
            expect(href.endsWith("/"), href).toBe(true);
            expect(link.hasAttribute("target"), href).toBe(false);
        }
    });

    it("marks the current section in each menu", () => {
        const current = [
            ...doc.querySelectorAll('header nav a[aria-current="page"]'),
        ].map((a) => a.getAttribute("href"));
        const expected = Object.values(NAV_LINKS).find((href) =>
            route.startsWith(href),
        );
        expect(current).toEqual(expected ? [expected, expected] : []);
    });
});

describe("home page", () => {
    const doc = loadPage("/");
    const main = doc.querySelector("main")!;

    it("shows one h1, the tagline and both calls to action in the hero", () => {
        const hero = doc.querySelector("[data-hero]")!;
        expect(doc.querySelectorAll("h1").length).toBe(1);
        expect(hero.querySelector("h1")?.textContent).toContain("freeCodeCamp");
        expect(hero.textContent).toContain(homeHero.tagline);
        const primary = hero.querySelector(
            `a[href="${homeHero.primary.href}"]`,
        );
        expect(primary?.textContent).toContain("Join the next meetup");
        expect(doc.getElementById("next-meetup")).not.toBeNull();
        const secondary = hero.querySelector(
            'a[href="https://www.freecodecamp.org/"]',
        );
        expect(secondary?.textContent).toContain(
            "Start learning on freeCodeCamp",
        );
    });

    it("draws the hero background on a canvas hidden from assistive tech", () => {
        const canvas = doc.querySelector("[data-hero] canvas.hero-canvas");
        expect(canvas).not.toBeNull();
        expect(canvas!.getAttribute("aria-hidden")).toBe("true");
    });

    it("has the sections in order, each labelled by its h2", () => {
        const sections = [
            ...main.querySelectorAll<HTMLElement>("section[aria-labelledby]"),
        ].filter((section) => !section.hasAttribute("data-hero"));
        const headings = sections.map((section) => {
            const heading = doc.getElementById(
                section.getAttribute("aria-labelledby")!,
            );
            expect(heading?.tagName, section.outerHTML.slice(0, 80)).toBe("H2");
            return heading!.textContent!.trim();
        });
        expect(headings).toEqual(HOME_SECTIONS);
    });

    it("shows the next meetup card or its fallback", () => {
        const box = doc.querySelector("[data-next-event]")!;
        const cards = box.querySelectorAll("[data-next-candidate]");
        const fallback = box.querySelector("[data-next-fallback]")!;
        expect(fallback.hasAttribute("hidden")).toBe(cards.length > 0);
        for (const link of box.querySelectorAll('a[href*="utm_source"]')) {
            const url = new URL(link.getAttribute("href")!);
            expect(url.searchParams.get("utm_source")).toBe(
                "freecodecamp.london",
            );
            expect(url.searchParams.get("utm_campaign")).toBe("home");
        }
    });

    it.each(whatToExpect)("describes what we do: '$title'", (item) => {
        const section = doc.getElementById("what-we-do")!.closest("section")!;
        const heading = [...section.querySelectorAll("h3")].find(
            (el) => el.textContent?.trim() === item.title,
        );
        expect(heading, item.title).toBeTruthy();
        expect(heading!.parentElement!.textContent).toContain(item.text);
    });

    it.each(getInvolvedHome.links)("links to '$label'", (item) => {
        const section = doc.getElementById("get-involved")!.closest("section")!;
        const link = section.querySelector(`a[href="${item.href}"]`);
        expect(link?.textContent).toContain(item.label);
        if (item.external) {
            expect(link!.getAttribute("target")).toBe("_blank");
            expect(link!.getAttribute("rel")).toContain("noopener");
            expect(link!.textContent).toContain("(opens in a new tab)");
        } else {
            expect(link!.hasAttribute("target")).toBe(false);
        }
    });

    it("shows an icon on every Get involved card", () => {
        const cards = [
            ...doc
                .getElementById("get-involved")!
                .closest("section")!
                .querySelectorAll("li"),
        ];
        expect(cards.length).toBe(5);
        for (const card of cards) {
            const icon = card.querySelector("svg");
            expect(icon, card.textContent ?? "").not.toBeNull();
            expect(icon!.getAttribute("aria-hidden")).toBe("true");
        }
    });
});

describe("blog", () => {
    const doc = loadPage("/blog/");
    const posts = postRoutes();

    it("lists every published post with a link that resolves", () => {
        const links = [...doc.querySelectorAll("main article h2 a")].map((a) =>
            a.getAttribute("href"),
        );
        expect(links.sort()).toEqual([...posts].sort());
        for (const href of links) {
            expect(distFileFor(href!), href!).not.toBeNull();
        }
    });

    it("never uses the old /blog/posts/ URLs", () => {
        for (const file of listDistFiles(".html")) {
            expect(readFileSync(file, "utf8"), file).not.toContain(
                'href="/blog/posts/',
            );
        }
    });

    it("redirects old /blog/posts/ URLs on Cloudflare Pages", () => {
        const redirects = readFileSync(distFileFor("/_redirects")!, "utf8");
        expect(redirects).toContain("/blog/posts/test /blog/hello-world/ 301");
        expect(redirects).toContain("/blog/posts/* /blog/:splat 301");
    });

    it("publishes an RSS feed with absolute post links", () => {
        const xml = readFileSync(distFileFor("/rss.xml")!, "utf8");
        expect(xml).toContain("<rss");
        for (const route of posts) {
            expect(xml).toContain(
                `<link>https://freecodecamp.london${route}</link>`,
            );
        }
    });
});

describe.each(postRoutes())("blog post %s", (route) => {
    const doc = loadPage(route);

    it("renders inside the layout with one h1, a date and an author", () => {
        expect(doc.querySelectorAll("h1").length).toBe(1);
        expect(doc.querySelector("main article time[datetime]")).not.toBeNull();
        expect(textOf(doc)).toMatch(/By \S/);
    });

    it("is marked as an article with its own canonical URL", () => {
        expect(
            doc
                .querySelector('meta[property="og:type"]')
                ?.getAttribute("content"),
        ).toBe("article");
        expect(
            doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
        ).toBe(`https://freecodecamp.london${route}`);
    });
});

describe("events page", () => {
    const doc = loadPage("/events/");
    const text = textOf(doc);

    it("renders a single <html> document titled Events", () => {
        const html = readFileSync(distFileFor("/events/")!, "utf8");
        expect(html.match(/<html/g)?.length).toBe(1);
        expect(doc.title).toBe("Events and meetups | freeCodeCamp London");
        expect(doc.querySelector("h1")?.textContent?.trim()).toBe("Events");
    });

    it("says venues vary", () => {
        expect(text).toContain("Venues vary");
    });

    it("shows the next meetup fallback when nothing is scheduled", () => {
        const fallback = doc.querySelector("[data-next-fallback]");
        expect(fallback?.hasAttribute("hidden")).toBe(false);
        expect(fallback?.textContent).toContain("Next meetup coming soon");
        expect(
            fallback?.querySelector(
                'a[href="https://luma.com/freecodecamp.london"]',
            ),
        ).not.toBeNull();
    });

    it("lists past events newest first, each linking to its page", () => {
        const section = doc.getElementById("past-events")!.closest("section")!;
        const links = [...section.querySelectorAll("li h3 a")].map((a) =>
            a.getAttribute("href"),
        );
        const expected = [...manualEvents]
            .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
            .map((event) => `/events/${event.id}/`);
        expect(links).toEqual(expected);
    });
});

describe.each(manualEvents)("event page $id", (event) => {
    const route = `/events/${event.id}/`;
    const doc = loadPage(route);
    const text = textOf(doc);

    it("shows the title, date, time and venue", () => {
        expect(doc.title).toBe(`${event.title} | freeCodeCamp London`);
        expect(doc.querySelector("h1")?.textContent?.trim()).toBe(event.title);
        expect(text).toMatch(/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d/);
        expect(text).toMatch(/\d{2}:\d{2} to \d{2}:\d{2}/);
        if (event.venue) {
            expect(text).toContain(event.venue.name);
        }
        if ("summary" in event && event.summary) {
            expect(text).toContain(event.summary);
        }
    });

    it("says the event has ended and offers no registration", () => {
        const notice = doc.querySelector("[data-event-ended]");
        expect(notice?.hasAttribute("hidden")).toBe(false);
        expect(notice?.textContent).toContain("This event has ended.");
        expect(text).not.toContain("Register on");
    });

    it("has Event structured data when the venue address is known", () => {
        const scripts = [
            ...doc.querySelectorAll('script[type="application/ld+json"]'),
        ];
        const address = event.venue && "address" in event.venue;
        expect(scripts.length).toBe(address ? 1 : 0);
        if (!address) {
            return;
        }
        const data = JSON.parse(scripts[0].textContent!);
        expect(data["@context"]).toBe("https://schema.org");
        expect(data["@type"]).toBe("Event");
        expect(data.name).toBe(event.title);
        expect(new Date(data.startDate).getTime()).toBe(
            Date.parse(event.start),
        );
        expect(new Date(data.endDate).getTime()).toBe(Date.parse(event.end));
        expect(data.eventStatus).toBe("https://schema.org/EventScheduled");
        expect(data.location["@type"]).toBe("Place");
        expect(data.location.name).toBe(event.venue!.name);
        expect(data.location.address.streetAddress).toBeTruthy();
        expect(data.offers.price).toBe(0);
        expect(data.offers.priceCurrency).toBe("GBP");
        expect(data.organizer.name).toBe("freeCodeCamp London");
    });
});

describe("coding challenges page", () => {
    const doc = loadPage("/coding-challenges/");
    const sections = [
        ...doc.querySelectorAll<HTMLElement>("section[data-rank-section]"),
    ];

    it("has one h1 titled Coding challenges", () => {
        const headings = doc.querySelectorAll("h1");
        expect(headings.length).toBe(1);
        expect(headings[0].textContent).toContain("Coding challenges");
    });

    it("groups katas into rank sections from 8 kyu down", () => {
        expect(sections.map((section) => section.dataset.rankSection)).toEqual(
            kataRanks.map(String),
        );
        expect(kataRanks[0]).toBe(8);
        expect(sections[0].querySelector("h2")?.textContent).toContain(
            "8 kyu: start here",
        );
    });

    it.each(kataRanks)("labels the %s kyu section with its count", (rank) => {
        const section = doc.querySelector(
            `section[data-rank-section="${rank}"]`,
        )!;
        const heading = section.querySelector("h2")!;
        const count = katas.filter((kata) => kata.rank === rank).length;
        expect(section.getAttribute("aria-labelledby")).toBe(heading.id);
        expect(heading.textContent).toContain(`${rank} kyu`);
        expect(heading.textContent).toContain(`(${count})`);
        expect(section.querySelectorAll("[data-kata]").length).toBe(count);
    });

    it.each(katas)("renders '$title' with its rank and link", (kata) => {
        const link = doc.querySelector(`a[href="${kataUrl(kata.id)}"]`);
        expect(link, kata.id).not.toBeNull();
        expect(link!.textContent).toContain(kata.title);
        expect(link!.textContent).toContain("(opens in a new tab)");
        expect(link!.getAttribute("target")).toBe("_blank");
        expect(link!.getAttribute("rel")).toContain("noopener");

        const card = link!.closest("[data-kata]")!;
        expect(card.closest("section")?.getAttribute("data-rank-section")).toBe(
            String(kata.rank),
        );
        expect(card.querySelector("h3")?.textContent).toBe(kata.title);
        expect(card.textContent).toContain(`${kata.rank} kyu`);
    });

    it.each([
        "https://www.freecodecamp.org/learn/javascript-v9/",
        "https://www.freecodecamp.org/learn/full-stack-developer/",
    ])("links to the freeCodeCamp curriculum %s in a new tab", (href) => {
        const link = doc.querySelector(`main a[href="${href}"]`);
        expect(link, href).not.toBeNull();
        expect(link!.getAttribute("target")).toBe("_blank");
        expect(link!.getAttribute("rel")).toContain("noopener");
        expect(link!.textContent).toContain("(opens in a new tab)");
    });

    it("no longer calls every challenge Beginner", () => {
        expect(textOf(doc)).not.toContain("Difficulty");
        expect(textOf(doc)).not.toContain("Beginner");
    });
});

describe("about us page", () => {
    const doc = loadPage("/about-us/");

    it.each(faqAnswer)("shows the FAQ '$title'", (faq) => {
        const item = [...doc.querySelectorAll("article.faq")].find((card) =>
            card.textContent?.includes(faq.title),
        );
        expect(item, faq.title).toBeTruthy();
        expect(item!.textContent).toContain(faq.body);
    });

    it("has exactly one h1", () => {
        expect(doc.querySelectorAll("h1").length).toBe(1);
    });

    it("puts every FAQ title in an h3", () => {
        const titles = [...doc.querySelectorAll("article.faq > h3")].map(
            (heading) => heading.textContent?.trim(),
        );
        expect(titles).toEqual(faqAnswer.map((faq) => faq.title));
    });

    it("has an h2 for each section", () => {
        const headings = [...doc.querySelectorAll("h2")].map((heading) =>
            heading.textContent?.trim(),
        );
        expect(headings).toEqual([
            "What is freeCodeCamp?",
            "What happens at a meetup",
            "Code of conduct",
            "Get involved",
            "Frequently asked questions",
            "Privacy",
        ]);
    });

    it.each(whatToExpect)("describes the meetup format '$title'", (item) => {
        const heading = [...doc.querySelectorAll("h3")].find(
            (el) => el.textContent?.trim() === item.title,
        );
        expect(heading, item.title).toBeTruthy();
        expect(heading!.parentElement!.textContent).toContain(item.text);
    });

    it.each(getInvolved)("links to '$label'", (item) => {
        const link = doc.querySelector(`main a[href="${item.href}"]`);
        expect(link?.textContent).toContain(item.label);
    });

    it("links to the freeCodeCamp code of conduct", () => {
        expect(
            doc.querySelector(
                'main a[href="https://www.freecodecamp.org/news/code-of-conduct/"]',
            ),
        ).not.toBeNull();
    });

    it("has a privacy section about Cloudflare Web Analytics", () => {
        const privacy = doc.getElementById("privacy");
        expect(privacy).not.toBeNull();
        expect(privacy!.querySelector("h2")?.textContent).toContain("Privacy");
        expect(privacy!.textContent).toContain("Cloudflare Web Analytics");
        expect(
            privacy!.querySelector(
                'a[href="https://www.cloudflare.com/privacypolicy/"]',
            ),
        ).not.toBeNull();
    });

    it("labels the FAQ section with an h2", () => {
        const section = doc.querySelector(
            'section[aria-labelledby="faq-heading"]',
        );
        expect(section?.querySelector("h2#faq-heading")).not.toBeNull();
    });
});

describe("404 page", () => {
    it("explains the page is missing and links back", () => {
        const doc = loadPage("/404/");
        expect(textOf(doc)).toContain("Page not found");
        expect(doc.querySelector('main a[href="/"]')).not.toBeNull();
    });
});

describe("footer", () => {
    const doc = loadPage("/");

    it.each([
        "https://discord.gg/hmVycPYAue",
        "https://luma.com/freecodecamp.london",
        "https://www.meetup.com/freecodecamp-london/",
        "https://github.com/freeCodeCampLondon/fcc-website",
        "/about-us/",
        "https://www.freecodecamp.org/news/code-of-conduct/",
        "/about-us/#privacy",
        "https://cajogos.com/?ref=freecodecamp.london",
    ])("links to %s", (href) => {
        expect(doc.querySelector(`footer a[href="${href}"]`)).not.toBeNull();
    });

    it("credits the domain sponsor", () => {
        const credit = doc.querySelector(
            'footer a[href="https://cajogos.com/?ref=freecodecamp.london"]',
        );
        expect(
            credit?.closest("p")?.textContent?.replace(/\s+/g, " "),
        ).toContain("Proudly sponsored by CAJOGOS");
        expect(credit?.getAttribute("rel")).toContain("noopener");
        expect(credit?.getAttribute("title")).toBe(
            "They pay for the domain :)",
        );
    });
});

// Third-party scripts and frames are a privacy decision, not an accident: the
// only analytics (Cloudflare Web Analytics) is injected at the edge, not built
// into dist/. Add a host here only after updating the privacy note on About Us.
const ALLOWED_SCRIPT_HOSTS: string[] = [];

describe.each(LAYOUT_ROUTES)("third-party content on %s", (route) => {
    const doc = loadPage(route);

    it("loads no scripts or frames from unexpected hosts", () => {
        const sources = [...doc.querySelectorAll("script[src], iframe[src]")]
            .map((el) => el.getAttribute("src")!)
            .filter((src) => /^(https?:)?\/\//.test(src));
        for (const src of sources) {
            const host = new URL(src, "https://freecodecamp.london").host;
            expect(ALLOWED_SCRIPT_HOSTS, src).toContain(host);
        }
    });
});

// Site rule: every external link opens in a new tab, safely.
describe("external links", () => {
    const files = listDistFiles(".html");

    it.each(files.map((file) => [file.replace(/^.*\/dist\//, "")]))(
        "%s opens every external link in a new tab",
        (file) => {
            const html = readFileSync(
                files.find((f) => f.endsWith(file))!,
                "utf8",
            );
            const offending = [...html.matchAll(/<a\b[^>]*>/g)]
                .map((match) => match[0])
                .filter((tag) => {
                    const href = tag.match(/href="([^"]*)"/)?.[1] ?? "";
                    return (
                        /^https?:\/\//.test(href) &&
                        new URL(href).hostname !== "freecodecamp.london"
                    );
                })
                .filter(
                    (tag) =>
                        !tag.includes('target="_blank"') ||
                        !/rel="[^"]*noopener/.test(tag),
                );
            expect(offending).toEqual([]);
        },
    );
});

describe("AI workshop slides page", () => {
    const doc = loadPage("/resources/ai-workshops/");

    it("lists every deck newest first with slides, event and source links", () => {
        const cards = [...doc.querySelectorAll("main ol > li article")];
        expect(cards.length).toBe(aiWorkshopDecks.length);
        const numbers = cards.map((card) =>
            Number(card.textContent?.match(/Workshop (\d+)/)?.[1]),
        );
        expect(numbers).toEqual(
            [...aiWorkshopDecks].map((d) => d.number).sort((a, b) => b - a),
        );
        for (const deck of aiWorkshopDecks) {
            expect(
                doc.querySelector(`a[href="${deck.slidesUrl}"]`),
            ).not.toBeNull();
            expect(
                doc.querySelector(`a[href="${deck.sourceUrl}"]`),
            ).not.toBeNull();
            const eventLink = `/events/${deck.eventId}/`;
            expect(doc.querySelector(`a[href="${eventLink}"]`)).not.toBeNull();
            expect(distFileFor(eventLink), eventLink).not.toBeNull();
        }
    });

    it("explains how to get the password without publishing it", () => {
        const html = readFileSync(
            distFileFor("/resources/ai-workshops/")!,
            "utf8",
        );
        const note = doc.querySelector("[data-slides-access]");
        expect(note?.textContent).toContain("password protected");
        expect(
            note?.querySelector('a[href="https://discord.gg/hmVycPYAue"]'),
        ).not.toBeNull();
        // The password itself is never published (ask at a workshop or on Discord)
        expect(html).not.toMatch(/password:|data-slides-password|<code/i);
    });

    it("is linked from every AI workshop event page and no other event", () => {
        for (const event of manualEvents) {
            const linked = loadPage(`/events/${event.id}/`).querySelector(
                'a[href="/resources/ai-workshops/"]',
            );
            expect(Boolean(linked), event.id).toBe(
                /\|\s*AI\b/.test(event.title),
            );
        }
    });

    it("is linked from the events page and from each workshop's event page", () => {
        expect(
            loadPage("/events/").querySelector(
                'a[href="/resources/ai-workshops/"]',
            ),
        ).not.toBeNull();
        for (const deck of aiWorkshopDecks) {
            const eventPage = loadPage(`/events/${deck.eventId}/`);
            expect(
                eventPage.querySelector(`a[href="${deck.slidesUrl}"]`),
                deck.eventId,
            ).not.toBeNull();
        }
    });
});

describe("icons", () => {
    it("are decorative inline SVGs on every page (no icon images)", () => {
        for (const file of listDistFiles(".html")) {
            const html = readFileSync(file, "utf8");
            for (const svg of html.match(/<svg\b[^>]*>/g) ?? []) {
                expect(svg, file).toContain('aria-hidden="true"');
            }
        }
    });

    it("label the footer community links", () => {
        const footer = loadPage("/").querySelector("body > footer")!;
        for (const name of ["Discord", "Luma", "Meetup", "GitHub"]) {
            const link = [...footer.querySelectorAll("a")].find((a) =>
                a.textContent?.includes(name),
            );
            expect(link?.querySelector("svg"), name).not.toBeNull();
        }
    });
});
