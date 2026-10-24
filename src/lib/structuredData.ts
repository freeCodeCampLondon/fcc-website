// schema.org structured data for components/JsonLd.astro.
// Validate changes with https://search.google.com/test/rich-results and
// https://validator.schema.org/.

import { SITE_NAME, SITE_URL } from "./seo";

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

export interface EventDetails {
    name: string;
    description: string;
    /** ISO 8601 with the UK offset, e.g. "2026-11-12T18:30:00+00:00". */
    startDate: string;
    endDate?: string;
    venue: {
        name: string;
        streetAddress: string;
        postalCode: string;
        addressLocality?: string;
    };
    /** RSVP page (Luma). */
    url: string;
    /** Absolute image URL; default: none (Google then uses the page). */
    image?: string;
    cancelled?: boolean;
}

/**
 * A free, in-person meetup as a schema.org Event, with the fields Google
 * requires (name, startDate, location with address) and recommends
 * (description, endDate, eventStatus, image, offers, organizer). Google only
 * reads Event markup on a page dedicated to that one event.
 */
export function eventStructuredData(event: EventDetails) {
    return {
        "@type": "Event",
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        ...(event.endDate && { endDate: event.endDate }),
        eventStatus: event.cancelled
            ? "https://schema.org/EventCancelled"
            : "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
            "@type": "Place",
            name: event.venue.name,
            address: {
                "@type": "PostalAddress",
                streetAddress: event.venue.streetAddress,
                addressLocality: event.venue.addressLocality ?? "London",
                postalCode: event.venue.postalCode,
                addressCountry: "GB",
            },
        },
        ...(event.image && { image: [event.image] }),
        offers: {
            "@type": "Offer",
            price: 0,
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
            url: event.url,
        },
        organizer: {
            "@type": "Organization",
            name: organization.name,
            url: organization.url,
        },
    };
}
