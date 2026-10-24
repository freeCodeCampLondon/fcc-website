import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT_DIR } from "./helpers/paths";
import {
    aiWorkshopDecks,
    isAiWorkshopEvent,
} from "../src/data/resources/ai-workshops";
import { describe, expect, it } from "vitest";
import {
    aboutFreeCodeCamp,
    getInvolved,
    intro,
    whatToExpect,
} from "../src/data/about";
import { kataUrl, katas } from "../src/data/codewars";
import manualEvents from "../src/data/events/manual.json";
import { eventSchema, londonDate } from "../src/lib/events";
import { overrideSchema } from "../src/lib/events-loader";
import { faqAnswer } from "../src/data/faq";

// Entries with a sourceId and no dates only override fields of a feed event.
const isOverride = (entry: object): boolean =>
    "sourceId" in entry && !("start" in entry);
const overrides = manualEvents.filter(isOverride);
const parsed = manualEvents
    .filter((entry) => !isOverride(entry))
    .map((entry) => ({ entry, result: eventSchema.safeParse(entry) }));

describe("events/manual.json", () => {
    it("has at least one event", () => {
        expect(manualEvents.length).toBeGreaterThan(0);
    });

    it.each(parsed)("$entry.id matches the event schema", ({ result }) => {
        expect(result.error?.issues ?? []).toEqual([]);
    });

    it.each(parsed)("$entry.id ends after it starts", ({ result }) => {
        expect(result.data!.end.getTime()).toBeGreaterThan(
            result.data!.start.getTime(),
        );
    });

    it.each(parsed)(
        "$entry.id starts with its London date and uses an https url",
        ({ result }) => {
            const event = result.data!;
            expect(event.id.startsWith(`${londonDate(event.start)}-`)).toBe(
                true,
            );
            expect(new URL(event.url).protocol).toBe("https:");
            if (event.venue?.mapUrl) {
                expect(new URL(event.venue.mapUrl).protocol).toBe("https:");
            }
        },
    );

    it("has valid overrides", () => {
        for (const entry of overrides) {
            expect(
                overrideSchema.safeParse(entry).error?.issues ?? [],
                JSON.stringify(entry),
            ).toEqual([]);
        }
    });

    it("writes dates as ISO 8601 with an offset", () => {
        for (const { entry } of parsed) {
            for (const value of [entry.start, entry.end]) {
                expect(value, entry.id).toMatch(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/,
                );
            }
        }
    });

    it("uses unique ids and source ids", () => {
        const ids = parsed.map(({ entry }) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);

        const sourceIds = manualEvents
            .map((entry) => ("sourceId" in entry ? entry.sourceId : undefined))
            .filter(Boolean);
        expect(new Set(sourceIds).size).toBe(sourceIds.length);
    });
});

describe("codewars", () => {
    it("has at least one kata", () => {
        expect(katas.length).toBeGreaterThan(0);
    });

    it.each(katas)("'$title' is a valid kata", (kata) => {
        expect(kata.id).toMatch(/^[0-9a-f]{24}$/);
        expect(kata.title).not.toBe("");
        expect(kata.title).toBe(kata.title.trim());
        expect(Number.isInteger(kata.rank)).toBe(true);
        expect(kata.rank).toBeGreaterThanOrEqual(1);
        expect(kata.rank).toBeLessThanOrEqual(8);
        expect(Array.isArray(kata.tags)).toBe(true);
        expect(kata.approved).toBe(true);
    });

    it("does not list the same kata twice", () => {
        const ids = katas.map((kata) => kata.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("is sorted easiest first, then by title", () => {
        const sorted = [...katas].sort(
            (a, b) => b.rank - a.rank || a.title.localeCompare(b.title, "en"),
        );
        expect(katas.map((kata) => kata.id)).toEqual(
            sorted.map((kata) => kata.id),
        );
    });

    it("builds JavaScript trainer URLs", () => {
        expect(kataUrl("55a70521798b14d4750000a4")).toBe(
            "https://www.codewars.com/kata/55a70521798b14d4750000a4/train/javascript",
        );
    });
});

describe("faq", () => {
    it("has at least one entry", () => {
        expect(faqAnswer.length).toBeGreaterThan(0);
    });

    it.each(faqAnswer)("'$title' has a title and body", (faq) => {
        expect(faq.title.trim()).not.toBe("");
        expect(faq.body.trim()).not.toBe("");
    });

    it("has unique titles", () => {
        const titles = faqAnswer.map((faq) => faq.title.trim().toLowerCase());
        expect(new Set(titles).size).toBe(titles.length);
    });

    it.each(faqAnswer)(
        "'$title' has no leading or trailing whitespace",
        (faq) => {
            expect(faq.title).toBe(faq.title.trim());
            expect(faq.body).toBe(faq.body.trim());
        },
    );
});

describe("about", () => {
    const strings = [
        ...intro,
        ...aboutFreeCodeCamp,
        ...whatToExpect.flatMap((item) => [item.title, item.text]),
        ...getInvolved.flatMap((item) => [item.label, item.text, item.href]),
    ];

    it("has intro and freeCodeCamp paragraphs", () => {
        expect(intro.length).toBeGreaterThan(0);
        expect(aboutFreeCodeCamp.length).toBeGreaterThan(0);
    });

    it("has at least three things to expect at a meetup", () => {
        expect(whatToExpect.length).toBeGreaterThanOrEqual(3);
    });

    it("has no empty strings or leading or trailing whitespace", () => {
        const bad = strings.filter(
            (text) => text === "" || text !== text.trim(),
        );
        expect(bad).toEqual([]);
    });

    it.each(getInvolved)("'$label' links over https", (item) => {
        expect(item.href).toMatch(/^https:\/\//);
    });
});

describe("blog posts", () => {
    const dir = join(ROOT_DIR, "src/content/blog");
    const files = readdirSync(dir).filter(
        (file) => file.endsWith(".md") && !file.startsWith("_"),
    );

    it("has at least one post", () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)("%s is named as a lowercase hyphenated slug", (file) => {
        expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.md$/);
    });
});

describe("AI workshop decks", () => {
    const ids = new Set(manualEvents.map((event) => event.id));

    it.each(aiWorkshopDecks)("deck $number points at a real event", (deck) => {
        expect(ids.has(deck.eventId), deck.eventId).toBe(true);
        expect(deck.slidesUrl).toMatch(
            /^https:\/\/andysign\.github\.io\/ai-london-\d{2}\/$/,
        );
    });

    it("numbers the decks 1 to n without gaps", () => {
        expect(aiWorkshopDecks.map((d) => d.number)).toEqual(
            aiWorkshopDecks.map((_, index) => index + 1),
        );
    });
});

describe("isAiWorkshopEvent", () => {
    it.each([
        "freeCodeCamp | AI Edition - Beginners Guide to Private LLMs",
        "freeCodeCamp x Encode | AI - Workshop: Vibecoding Using Local AIs",
        "freeCodeCamp x Encode | AI - Jev Workshop: give your AI agents a fast, local brain",
    ])("recognises %s", (title) => {
        expect(isAiWorkshopEvent(title)).toBe(true);
    });

    it.each(["freeCodeCamp Meetup", "Hackathon | Build with AIR quality data"])(
        "ignores %s",
        (title) => {
            expect(isAiWorkshopEvent(title)).toBe(false);
        },
    );
});
