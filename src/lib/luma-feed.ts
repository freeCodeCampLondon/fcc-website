import ical, { type ParameterValue, type VEvent } from "node-ical";
import { eventId, type EventData } from "./events";

/** The group's public Luma Calendar feed (https://luma.com/freecodecamp.london). */
export const LUMA_FEED_URL =
    "https://api.lu.ma/ics/get?entity=calendar&id=cal-bbOxHrEnh0ijlK0";

export const LUMA_FEED_TIMEOUT_MS = 10_000;

// The feed has no URL field: the event link is only in the description,
// "Get up-to-date information at: https://luma.com/w6i73bgm".
const EVENT_URL = /https:\/\/luma\.com\/[A-Za-z0-9-]+/;

/** An event read from the feed, before it is validated by the collection. */
export type FeedEvent = Omit<EventData, "summary">;

const text = (value: ParameterValue | undefined): string =>
    (typeof value === "string" ? value : (value?.val ?? "")).trim();

/** OpenStreetMap link for a point, rounded to about 10cm. */
export function mapUrl(lat: number, lon: number): string {
    const [la, lo] = [lat.toFixed(6), lon.toFixed(6)];
    return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=18/${la}/${lo}`;
}

function venueOf(event: VEvent): FeedEvent["venue"] {
    const location = text(event.location);
    // Luma puts the event URL here when the address is hidden
    if (!location || /^https?:\/\//.test(location)) {
        return undefined;
    }
    const [name, ...rest] = location.split(",").map((part) => part.trim());
    const geo = event.geo as { lat?: unknown; lon?: unknown } | undefined;
    const hasGeo =
        typeof geo?.lat === "number" &&
        typeof geo.lon === "number" &&
        Number.isFinite(geo.lat) &&
        Number.isFinite(geo.lon);
    return {
        name,
        ...(rest.length > 0 && { address: rest.join(", ") }),
        ...(hasGeo && {
            mapUrl: mapUrl(geo.lat as number, geo.lon as number),
        }),
    };
}

/**
 * Maps a Luma iCal feed to events (pure, no network). Events without a start,
 * an end or a luma.com link in the description are skipped.
 */
export function parseLumaFeed(icsText: string): FeedEvent[] {
    const events: FeedEvent[] = [];
    for (const component of Object.values(ical.sync.parseICS(icsText))) {
        if (component?.type !== "VEVENT") {
            continue;
        }
        const event = component as VEvent;
        const url = text(event.description).match(EVENT_URL)?.[0];
        const title = text(event.summary);
        if (!event.start || !event.end || !url || !title) {
            continue;
        }
        const start = new Date(event.start);
        const end = new Date(event.end);
        const venue = venueOf(event);
        events.push({
            id: eventId(start, title),
            sourceId: `luma:${event.uid.replace(/@.*$/, "")}`,
            title,
            start,
            end,
            ...(venue && { venue }),
            provider: "luma",
            url,
            status: event.status === "CANCELLED" ? "cancelled" : "scheduled",
        });
    }
    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Downloads the feed text; rejects on HTTP errors and after 10 seconds. */
export async function fetchLumaFeed(
    url = LUMA_FEED_URL,
    fetchImpl: typeof fetch = fetch,
): Promise<string> {
    const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(LUMA_FEED_TIMEOUT_MS),
        headers: { accept: "text/calendar" },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.text();
}
