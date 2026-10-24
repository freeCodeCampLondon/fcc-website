import { z } from "astro/zod";

// Events come from several providers (Luma today, others possible), so the
// model is provider-neutral. See AGENTS.md ("Events") for where the data
// lives and how the Luma feed is merged with src/data/events/manual.json.

export const PROVIDERS = ["luma", "meetup", "eventbrite", "other"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
    luma: "Luma",
    meetup: "Meetup",
    eventbrite: "Eventbrite",
    other: "the event page",
};

export const TIME_ZONE = "Europe/London";

export const eventFields = z.object({
    // "2026-10-28-ai-jev-workshop": the London date plus a slug, also the page slug
    id: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
    // "luma:evt-ko44LNFt2Rq9E6C", used to match feed events with manual overrides
    sourceId: z.string().optional(),
    title: z.string().min(1),
    // Our own one or two sentences
    summary: z.string().optional(),
    // ISO 8601 with an offset
    start: z.coerce.date(),
    end: z.coerce.date(),
    // Absent for online events or hidden addresses
    venue: z
        .object({
            name: z.string(),
            address: z.string().optional(),
            mapUrl: z.url().optional(),
        })
        .optional(),
    provider: z.enum(PROVIDERS),
    // Registration or event page on the provider
    url: z.url(),
    status: z
        .enum(["scheduled", "cancelled", "postponed"])
        .default("scheduled"),
});

export const eventSchema = eventFields.refine(
    (event) => event.end > event.start,
    "end must be after start",
);

export type EventData = z.infer<typeof eventSchema>;

/** Collection entries ({ id, data }) and plain event objects both work. */
type EventLike = EventData | { data: EventData };
const dataOf = <T extends EventLike>(event: T): EventData =>
    "data" in event ? event.data : event;

export interface SplitEvents<T> {
    /** The first scheduled upcoming event, if any */
    next: T | undefined;
    /** Events that have not ended yet (in progress counts), soonest first */
    upcoming: T[];
    /** Events that have ended, newest first */
    past: T[];
}

/**
 * Splits events around `now`. Cancelled (and postponed) events are listed but
 * never become `next`.
 */
export function splitEvents<T extends EventLike>(
    events: readonly T[],
    now: Date,
): SplitEvents<T> {
    const byStart = [...events].sort(
        (a, b) => dataOf(a).start.getTime() - dataOf(b).start.getTime(),
    );
    const upcoming = byStart.filter((event) => dataOf(event).end > now);
    const past = byStart.filter((event) => dataOf(event).end <= now).reverse();
    const next = upcoming.find((event) => dataOf(event).status === "scheduled");
    return { next, upcoming, past };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

const isoDateFormat = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/** "Wednesday 28 October 2026" in London time. */
export function formatEventDate(date: Date): string {
    // Built from parts: some ICU versions put a comma after the weekday.
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        dateFormat.formatToParts(date).find((p) => p.type === type)?.value;
    return `${part("weekday")} ${part("day")} ${part("month")} ${part("year")}`;
}

/** "18:00" in London time (GMT or BST as appropriate). */
export function formatEventTime(date: Date): string {
    return timeFormat.format(date);
}

/** "18:00 to 21:00" in London time. */
export function formatEventTimes(
    event: Pick<EventData, "start" | "end">,
): string {
    return `${formatEventTime(event.start)} to ${formatEventTime(event.end)}`;
}

/** "2026-10-28": the calendar date in London. */
export function londonDate(date: Date): string {
    return isoDateFormat.format(date);
}

/**
 * Builds the event id from the London date and the title: the part after
 * the last "|" (Luma titles start with "freeCodeCamp x Encode |"), at most
 * six words. "freeCodeCamp x Encode | AI - Jev Workshop: give your ..." on
 * 28 October 2026 gives "2026-10-28-ai-jev-workshop-give-your-ai".
 */
export function eventId(start: Date, title: string): string {
    const words = (title.split("|").pop() ?? title)
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean)
        .slice(0, 6);
    return `${londonDate(start)}-${words.join("-") || "event"}`;
}

/**
 * The provider URL with UTM parameters so registrations from the site show
 * up in the provider's insights. Existing query parameters are kept.
 */
export function registrationLink(
    event: Pick<EventData, "url">,
    campaign: string,
): string {
    const url = new URL(event.url);
    url.searchParams.set("utm_source", "freecodecamp.london");
    url.searchParams.set("utm_medium", "website");
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
}

/**
 * Meta description for an event page: its own summary, or a generated
 * sentence with the date and venue, kept within 160 characters.
 */
export function eventDescription(event: EventData): string {
    const base =
        event.summary ??
        `${event.title}: a free freeCodeCamp London meetup on ${formatEventDate(event.start)}${
            event.venue ? ` at ${event.venue.name}` : ""
        }.`;
    const text =
        base.length >= 50
            ? base
            : `${base} Free and open to everyone learning to code in London.`;
    return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`;
}
