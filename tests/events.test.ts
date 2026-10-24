import { describe, expect, it } from "vitest";
import {
    eventId,
    formatEventDate,
    formatEventTime,
    formatEventTimes,
    registrationLink,
    splitEvents,
    type EventData,
} from "../src/lib/events";

// Fixed dates only: these tests never read the real clock.
function event(
    id: string,
    start: string,
    end: string,
    status: EventData["status"] = "scheduled",
): EventData {
    return {
        id,
        title: id,
        start: new Date(start),
        end: new Date(end),
        provider: "luma",
        url: "https://luma.com/example",
        status,
    };
}

const PAST = event(
    "2026-06-11-past",
    "2026-06-11T17:00:00Z",
    "2026-06-11T20:00:00Z",
);
const OLDER = event(
    "2026-02-26-older",
    "2026-02-26T18:00:00Z",
    "2026-02-26T21:00:00Z",
);
const RUNNING = event(
    "2026-10-28-running",
    "2026-10-28T18:00:00Z",
    "2026-10-28T21:00:00Z",
);
const LATER = event(
    "2026-11-25-later",
    "2026-11-25T18:00:00Z",
    "2026-11-25T21:00:00Z",
);
const CANCELLED = event(
    "2026-11-04-cancelled",
    "2026-11-04T18:00:00Z",
    "2026-11-04T21:00:00Z",
    "cancelled",
);

describe("splitEvents", () => {
    it("splits into next, upcoming (soonest first) and past (newest first)", () => {
        const now = new Date("2026-10-24T12:00:00Z");
        const { next, upcoming, past } = splitEvents(
            [OLDER, LATER, PAST, RUNNING],
            now,
        );
        expect(next).toBe(RUNNING);
        expect(upcoming).toEqual([RUNNING, LATER]);
        expect(past).toEqual([PAST, OLDER]);
    });

    it("counts an event in progress as upcoming", () => {
        const now = new Date("2026-10-28T19:30:00Z");
        const { next, upcoming } = splitEvents([RUNNING, LATER], now);
        expect(next).toBe(RUNNING);
        expect(upcoming).toEqual([RUNNING, LATER]);
    });

    it("moves an event to past once it has ended", () => {
        const now = new Date("2026-10-28T21:00:00Z");
        const { next, past } = splitEvents([RUNNING, LATER], now);
        expect(next).toBe(LATER);
        expect(past).toEqual([RUNNING]);
    });

    it("lists cancelled events but never makes them next", () => {
        const now = new Date("2026-10-29T12:00:00Z");
        const { next, upcoming } = splitEvents([CANCELLED, LATER], now);
        expect(next).toBe(LATER);
        expect(upcoming).toEqual([CANCELLED, LATER]);
    });

    it("has no next event when nothing is scheduled", () => {
        const now = new Date("2026-10-29T12:00:00Z");
        expect(splitEvents([CANCELLED, PAST], now).next).toBeUndefined();
        expect(splitEvents([], now)).toEqual({
            next: undefined,
            upcoming: [],
            past: [],
        });
    });

    it("accepts collection entries with a data field", () => {
        const now = new Date("2026-10-24T12:00:00Z");
        const entries = [PAST, RUNNING].map((data) => ({ id: data.id, data }));
        const { next, past } = splitEvents(entries, now);
        expect(next?.id).toBe(RUNNING.id);
        expect(past.map((entry) => entry.id)).toEqual([PAST.id]);
    });
});

describe("date and time formatting (Europe/London)", () => {
    it("gives 18:00 in British Summer Time", () => {
        expect(formatEventTime(new Date("2026-07-01T17:00:00Z"))).toBe("18:00");
    });

    it("gives 18:00 in Greenwich Mean Time", () => {
        expect(formatEventTime(new Date("2026-10-28T18:00:00Z"))).toBe("18:00");
    });

    it("formats the date and the time range", () => {
        expect(formatEventDate(RUNNING.start)).toBe(
            "Wednesday 28 October 2026",
        );
        expect(formatEventTimes(RUNNING)).toBe("18:00 to 21:00");
    });

    it("uses the London date for late events", () => {
        // 23:30 UTC on 30 June is 00:30 BST on 1 July
        const date = new Date("2026-06-30T23:30:00Z");
        expect(formatEventDate(date)).toBe("Wednesday 1 July 2026");
    });
});

describe("eventId", () => {
    it("uses the London date and the title after the last '|'", () => {
        expect(
            eventId(
                new Date("2026-10-28T18:00:00Z"),
                "freeCodeCamp x Encode | AI - Jev Workshop: give your AI agents a fast, cheap brain",
            ),
        ).toBe("2026-10-28-ai-jev-workshop-give-your-ai");
    });

    it("keeps titles without '|' and drops punctuation and accents", () => {
        expect(
            eventId(new Date("2026-06-30T23:30:00Z"), "Café & Code Night!"),
        ).toBe("2026-07-01-cafe-code-night");
    });
});

describe("registrationLink", () => {
    it("adds UTM parameters", () => {
        const link = new URL(
            registrationLink({ url: "https://luma.com/w6i73bgm" }, "events"),
        );
        expect(link.origin + link.pathname).toBe("https://luma.com/w6i73bgm");
        expect(Object.fromEntries(link.searchParams)).toEqual({
            utm_source: "freecodecamp.london",
            utm_medium: "website",
            utm_campaign: "events",
        });
    });

    it("keeps an existing query string", () => {
        const link = new URL(
            registrationLink(
                { url: "https://www.eventbrite.co.uk/e/123?aff=abc" },
                "event-page",
            ),
        );
        expect(link.searchParams.get("aff")).toBe("abc");
        expect(link.searchParams.get("utm_campaign")).toBe("event-page");
    });
});
