import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Loader } from "astro/loaders";
import { z } from "astro/zod";
import { eventFields } from "./events";
import {
    LUMA_FEED_URL,
    fetchLumaFeed,
    parseLumaFeed,
    type FeedEvent,
} from "./luma-feed";

export const MANUAL_EVENTS_PATH = "src/data/events/manual.json";

/**
 * An entry in manual.json that only changes fields of a feed event with the
 * same sourceId (for example a summary or a shorter title).
 */
export const overrideSchema = eventFields
    .partial()
    .extend({ sourceId: z.string() });

type Entry = Record<string, unknown>;

export interface MergeResult {
    /** Unvalidated event data, validated by the collection schema next */
    events: Entry[];
    /** Overrides whose event is not in the feed (feed off or event removed) */
    unmatched: Entry[];
}

const isOverrideOnly = (entry: Entry): boolean =>
    typeof entry.sourceId === "string" &&
    !("start" in entry && "end" in entry && "url" in entry);

/**
 * Merges the feed into the manual entries:
 * - a manual entry with the same sourceId as a feed event overrides its
 *   fields (venue fields one by one)
 * - feed events without a manual entry are added as they are
 * - other manual entries are added as they are
 * - two events with the same id throw
 */
export function mergeEvents(manual: Entry[], feed: FeedEvent[]): MergeResult {
    const bySourceId = new Map(
        manual
            .filter((entry) => typeof entry.sourceId === "string")
            .map((entry) => [entry.sourceId as string, entry]),
    );
    const used = new Set<Entry>();
    const events: Entry[] = feed.map((event) => {
        const override = event.sourceId && bySourceId.get(event.sourceId);
        if (!override) {
            return { ...event };
        }
        used.add(override);
        const venue =
            event.venue || override.venue
                ? { ...event.venue, ...(override.venue as object) }
                : undefined;
        return { ...event, ...override, ...(venue && { venue }) };
    });

    const unmatched: Entry[] = [];
    for (const entry of manual) {
        if (used.has(entry)) {
            continue;
        }
        if (isOverrideOnly(entry)) {
            unmatched.push(entry);
        } else {
            events.push(entry);
        }
    }

    const seen = new Set<string>();
    for (const event of events) {
        const id = String(event.id);
        if (seen.has(id)) {
            throw new Error(
                `Duplicate event id "${id}": give one of them a different id in ${MANUAL_EVENTS_PATH}, or add the feed event's sourceId to the manual entry so it overrides the feed event instead.`,
            );
        }
        seen.add(id);
    }
    return { events, unmatched };
}

interface Logger {
    info(message: string): void;
    warn(message: string): void;
}

export interface LoadOptions {
    manual: Entry[];
    /** false when LUMA_FEED=off (tests and offline builds) */
    feedEnabled: boolean;
    fetchFeed?: () => Promise<string>;
    logger: Logger;
}

/**
 * Manual entries plus the Luma feed. The build never fails because Luma is
 * down: any feed error falls back to the manual entries with a warning.
 */
export async function loadEvents({
    manual,
    feedEnabled,
    fetchFeed = () => fetchLumaFeed(LUMA_FEED_URL),
    logger,
}: LoadOptions): Promise<MergeResult> {
    let feed: FeedEvent[] = [];
    if (!feedEnabled) {
        logger.info("LUMA_FEED=off: using manual events only");
    } else {
        try {
            feed = parseLumaFeed(await fetchFeed());
            logger.info(`Luma feed: ${feed.length} event(s)`);
        } catch (error) {
            logger.warn(
                `Luma feed unavailable, using manual events only: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }
    const result = mergeEvents(manual, feed);
    if (feedEnabled && result.unmatched.length > 0) {
        logger.warn(
            `Skipped ${result.unmatched.length} manual override(s) with no matching feed event: ${result.unmatched
                .map((entry) => entry.sourceId)
                .join(", ")}`,
        );
    }
    return result;
}

/** Astro content loader for the events collection. */
export function eventsLoader(): Loader {
    return {
        name: "events-loader",
        load: async ({ store, parseData, generateDigest, logger, watcher }) => {
            const path = resolve(MANUAL_EVENTS_PATH);
            const sync = async () => {
                const manual = JSON.parse(
                    await readFile(path, "utf8"),
                ) as Entry[];
                const { events } = await loadEvents({
                    manual,
                    feedEnabled: process.env.LUMA_FEED !== "off",
                    logger,
                });
                store.clear();
                for (const event of events) {
                    const id = String(event.id);
                    const data = await parseData({ id, data: event });
                    store.set({ id, data, digest: generateDigest(data) });
                }
            };

            await sync();
            watcher?.add(path);
            watcher?.on("change", async (changed) => {
                if (resolve(changed) === path) {
                    await sync();
                }
            });
        },
    };
}
