import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { eventSchema } from "../src/lib/events";
import { loadEvents, mergeEvents } from "../src/lib/events-loader";
import {
    LUMA_FEED_URL,
    fetchLumaFeed,
    parseLumaFeed,
} from "../src/lib/luma-feed";
import { ROOT_DIR } from "./helpers/paths";

// The Luma Calendar feed as saved on 24 October 2026 (public event data).
// These tests never touch the network.
const FIXTURE = readFileSync(
    join(ROOT_DIR, "tests/fixtures/luma-calendar.ics"),
    "utf8",
);
const SOURCE_ID = "luma:evt-ko44LNFt2Rq9E6C";
const ARCHIVED = {
    id: "2026-08-19-ai-workshop-hermes-agent-w-your",
    sourceId: "luma:evt-YH2wzaFok65vcBx",
    title: "Hermes Agent workshop",
    start: "2026-08-19T17:45:00+01:00",
    end: "2026-08-19T21:15:00+01:00",
    provider: "luma",
    url: "https://luma.com/axzt5ade",
};

const silentLogger = () => ({ info: vi.fn(), warn: vi.fn() });

describe("parseLumaFeed", () => {
    const events = parseLumaFeed(FIXTURE);
    const [event] = events;

    it("parses the one event in the feed", () => {
        expect(events).toHaveLength(1);
        expect(event.sourceId).toBe(SOURCE_ID);
        expect(event.provider).toBe("luma");
        expect(event.title).toBe(
            "freeCodeCamp x Encode | AI - Jev Workshop: give your AI agents a fast, cheap brain for making decisions safely, locally & creatively!",
        );
    });

    it("builds the id from the London date and the title", () => {
        expect(event.id).toBe("2026-10-28-ai-jev-workshop-give-your-ai");
    });

    it("takes the dates from DTSTART and DTEND", () => {
        expect(event.start.toISOString()).toBe("2026-10-28T18:00:00.000Z");
        expect(event.end.toISOString()).toBe("2026-10-28T21:00:00.000Z");
    });

    it("takes the event URL from the description", () => {
        expect(event.url).toBe("https://luma.com/w6i73bgm");
    });

    it("splits the location into venue name and address, with a map link", () => {
        expect(event.venue).toEqual({
            name: "Encode Hub",
            address: "41 Pitfield St, London N1 6DA, UK",
            mapUrl: "https://www.openstreetmap.org/?mlat=51.527586&mlon=-0.083770#map=18/51.527586/-0.083770",
        });
    });

    it("maps TENTATIVE to scheduled and CANCELLED to cancelled", () => {
        expect(event.status).toBe("scheduled");
        const [cancelled] = parseLumaFeed(
            FIXTURE.replace("STATUS:TENTATIVE", "STATUS:CANCELLED"),
        );
        expect(cancelled.status).toBe("cancelled");
    });

    it("gives no venue when the location is a URL", () => {
        const [hidden] = parseLumaFeed(
            FIXTURE.replace(
                /^LOCATION:.*$/m,
                "LOCATION:https://luma.com/event/evt-ko44LNFt2Rq9E6C",
            ),
        );
        expect(hidden.venue).toBeUndefined();
    });

    it("skips events without a luma.com link", () => {
        expect(
            parseLumaFeed(FIXTURE.replace(/https:\/\/luma\.com\/\w+/, "")),
        ).toEqual([]);
    });

    it("produces events that pass the collection schema", () => {
        expect(eventSchema.safeParse(event).success).toBe(true);
    });
});

describe("mergeEvents", () => {
    const feed = parseLumaFeed(FIXTURE);

    it("adds feed events next to the manual ones", () => {
        const { events } = mergeEvents([ARCHIVED], feed);
        expect(events.map((event) => event.id)).toEqual([
            "2026-10-28-ai-jev-workshop-give-your-ai",
            ARCHIVED.id,
        ]);
    });

    it("applies manual overrides by sourceId, venue fields one by one", () => {
        const { events, unmatched } = mergeEvents(
            [
                {
                    sourceId: SOURCE_ID,
                    title: "AI agents workshop with Jev",
                    summary: "Give your AI agents a fast, cheap brain.",
                    venue: { name: "Encode Hub, Shoreditch" },
                },
            ],
            feed,
        );
        expect(unmatched).toEqual([]);
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            id: "2026-10-28-ai-jev-workshop-give-your-ai",
            title: "AI agents workshop with Jev",
            summary: "Give your AI agents a fast, cheap brain.",
            url: "https://luma.com/w6i73bgm",
            venue: {
                name: "Encode Hub, Shoreditch",
                address: "41 Pitfield St, London N1 6DA, UK",
            },
        });
        expect(eventSchema.safeParse(events[0]).success).toBe(true);
    });

    it("keeps a full manual entry over the feed event with the same sourceId", () => {
        const manual = {
            ...ARCHIVED,
            sourceId: SOURCE_ID,
            id: "2026-10-28-jev",
        };
        const { events } = mergeEvents([manual], feed);
        expect(events).toHaveLength(1);
        expect(events[0].id).toBe("2026-10-28-jev");
    });

    it("sets aside overrides with no feed event", () => {
        const override = { sourceId: "luma:evt-gone", summary: "Gone" };
        const { events, unmatched } = mergeEvents([override, ARCHIVED], []);
        expect(events).toEqual([ARCHIVED]);
        expect(unmatched).toEqual([override]);
    });

    it("fails on duplicate ids with a clear message", () => {
        const clash = { ...ARCHIVED, id: feed[0].id, sourceId: undefined };
        expect(() => mergeEvents([clash], feed)).toThrow(
            /Duplicate event id "2026-10-28-ai-jev-workshop-give-your-ai"/,
        );
    });
});

describe("loadEvents", () => {
    it("merges the feed when it loads", async () => {
        const logger = silentLogger();
        const { events } = await loadEvents({
            manual: [ARCHIVED],
            feedEnabled: true,
            fetchFeed: async () => FIXTURE,
            logger,
        });
        expect(events).toHaveLength(2);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("falls back to the manual data with a warning when the feed fails", async () => {
        const logger = silentLogger();
        const { events } = await loadEvents({
            manual: [ARCHIVED],
            feedEnabled: true,
            fetchFeed: () => Promise.reject(new Error("HTTP 503")),
            logger,
        });
        expect(events).toEqual([ARCHIVED]);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("HTTP 503"),
        );
    });

    it("falls back when the feed is not iCal", async () => {
        const logger = silentLogger();
        const { events } = await loadEvents({
            manual: [ARCHIVED],
            feedEnabled: true,
            fetchFeed: async () => "<html>Service unavailable</html>",
            logger,
        });
        expect(events).toEqual([ARCHIVED]);
    });

    it("does not fetch when the feed is off (LUMA_FEED=off)", async () => {
        const fetchFeed = vi.fn();
        const { events } = await loadEvents({
            manual: [ARCHIVED],
            feedEnabled: false,
            fetchFeed,
            logger: silentLogger(),
        });
        expect(fetchFeed).not.toHaveBeenCalled();
        expect(events).toEqual([ARCHIVED]);
    });
});

describe("fetchLumaFeed", () => {
    it("requests the calendar feed with a timeout", async () => {
        const fetchImpl = vi.fn(
            async () => new Response(FIXTURE, { status: 200 }),
        );
        await expect(fetchLumaFeed(LUMA_FEED_URL, fetchImpl)).resolves.toBe(
            FIXTURE,
        );
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(url).toBe(
            "https://api.lu.ma/ics/get?entity=calendar&id=cal-bbOxHrEnh0ijlK0",
        );
        expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it("rejects on an HTTP error", async () => {
        const fetchImpl = vi.fn(
            async () => new Response("", { status: 502, statusText: "Bad" }),
        );
        await expect(fetchLumaFeed(LUMA_FEED_URL, fetchImpl)).rejects.toThrow(
            "HTTP 502",
        );
    });
});
