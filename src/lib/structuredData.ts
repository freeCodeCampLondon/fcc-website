// schema.org structured data for components/JsonLd.astro.
// Validate changes with https://search.google.com/test/rich-results and
// https://validator.schema.org/.

import { eventDescription, type EventData } from "./events";
import { SITE_NAME, SITE_URL, ogImagePath } from "./seo";

/** The group as a schema.org Organization (home page, event organiser). */
export const organization = {
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [
        "https://discord.gg/hmVycPYAue",
        "https://luma.com/freecodecamp.london",
        "https://www.meetup.com/freecodecamp-london/",
        "https://github.com/freeCodeCampLondon",
    ],
};

const EVENT_STATUS: Record<EventData["status"], string> = {
    scheduled: "https://schema.org/EventScheduled",
    cancelled: "https://schema.org/EventCancelled",
    postponed: "https://schema.org/EventPostponed",
};

/**
 * A free, in-person meetup as a schema.org Event, with the fields Google
 * requires (name, startDate, location with address) and recommends
 * (description, endDate, eventStatus, image, offers, organizer, performer).
 * Google only reads Event markup on a page dedicated to that one event, so
 * `id` is the event page slug (/events/<id>/); its Open Graph card is the
 * image. Returns undefined without a venue address, which Google requires.
 */
export function eventStructuredData(id: string, event: EventData) {
    if (!event.venue?.address) {
        return undefined;
    }
    const group = {
        "@type": "Organization",
        name: organization.name,
        url: organization.url,
    };
    return {
        "@type": "Event",
        name: event.title,
        description: eventDescription(event),
        startDate: event.start.toISOString(),
        endDate: event.end.toISOString(),
        eventStatus: EVENT_STATUS[event.status],
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: event.venue.name,
            address: {
                "@type": "PostalAddress",
                streetAddress: event.venue.address,
                addressCountry: "GB",
            },
        },
        image: [`${SITE_URL}${ogImagePath(`/events/${id}/`)}`],
        offers: {
            "@type": "Offer",
            price: 0,
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
            url: event.url,
        },
        organizer: group,
        // Our meetups are run by the group itself, with no headline speaker.
        performer: group,
    };
}
