// Slides from Andy's (andysign on GitHub) AI workshops at freeCodeCamp London,
// one deck per event in the AI series. Each deck's repository was created a
// few days before its workshop, which is how decks map to events. Add the next
// deck here after each workshop.

export interface AiWorkshopDeck {
    /** Workshop number in the series (01, 02, ...). */
    number: number;
    /** Event id in src/data/events/manual.json (the event page slug). */
    eventId: string;
    slidesUrl: string;
    sourceUrl: string;
}

const deck = (number: number, eventId: string): AiWorkshopDeck => {
    const name = `ai-london-${String(number).padStart(2, "0")}`;
    return {
        number,
        eventId,
        slidesUrl: `https://andysign.github.io/${name}/`,
        sourceUrl: `https://github.com/andysign/${name}`,
    };
};

export const presenter = {
    name: "Andy",
    github: "andysign",
};

export const aiWorkshopDecks: AiWorkshopDeck[] = [
    deck(1, "2025-07-23-ai-edition-beginners-guide-to-private"),
    deck(2, "2025-08-27-ai-edition-creating-your-first-local"),
    deck(3, "2025-11-05-ai-edition-make-your-own-local"),
    deck(4, "2025-12-08-ai-workshop-make-your-own-private"),
    deck(5, "2026-02-26-ai-workshop-demystifying-openclaw-the-new"),
    deck(6, "2026-03-25-ai-workshop-breaking-down-openclaw-from"),
    deck(7, "2026-06-11-ai-workshop-vibecoding-using-local-ais"),
    deck(8, "2026-08-19-ai-workshop-hermes-agent-w-your"),
    deck(9, "2026-10-28-ai-jev-workshop-give-your-ai"),
];

export const deckForEvent = (eventId: string) =>
    aiWorkshopDecks.find((d) => d.eventId === eventId);

/**
 * Events in the AI workshop series, recognised by their title, e.g.
 * "freeCodeCamp x Encode | AI - Workshop: ..." or "freeCodeCamp | AI Edition - ...".
 * Their event pages link to the slides page, including upcoming ones.
 */
export const isAiWorkshopEvent = (title: string) => /\|\s*AI\b/.test(title);
