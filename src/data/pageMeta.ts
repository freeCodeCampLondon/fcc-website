// Title and description of each page, keyed by route. Pages pass their entry
// to Layout; the Open Graph image endpoint (src/pages/og/[...route].ts) draws
// the same text on each page's social card.
//
// Titles: short and specific; SEO.astro appends " | freeCodeCamp London".
// Descriptions: 120 to 160 characters, written for search results and link
// previews. Every page needs its own (tests/seo.test.ts checks uniqueness).

export interface PageMeta {
    title: string;
    description: string;
    noindex?: boolean;
}

export const pageMeta = {
    "/": {
        title: "freeCodeCamp London: learn to code together",
        description:
            "Learn to code together in London. Free events, friendly people, everyone welcome whatever your background or experience.",
    },
    "/about-us/": {
        title: "About us",
        description:
            "Who we are: a free, beginner-friendly community of people learning to code in London, part of the freeCodeCamp family. Answers to common questions.",
    },
    "/events/": {
        title: "Events and meetups",
        description:
            "Upcoming freeCodeCamp London meetups: free, friendly evenings of coding challenges, project showcases and chat. Find the date, time and venue.",
    },
    "/coding-challenges/": {
        title: "Coding challenges",
        description:
            "Practise JavaScript with freeCodeCamp certifications and hand-picked Codewars katas for every level. Try them alone or bring them to a meetup.",
    },
    "/blog/": {
        title: "Blog",
        description:
            "News, write-ups and tutorials from the freeCodeCamp London community: meetup recaps, learning tips and stories from people learning to code.",
    },
    "/resources/ai-workshops/": {
        title: "AI workshop slides",
        description:
            "Slides from every freeCodeCamp London AI workshop: run language models privately on your own machine, build local agents and assistants, and more.",
    },
    "/404/": {
        title: "Page not found",
        description:
            "Sorry, there is nothing at this address. Head back to the freeCodeCamp London home page, see upcoming events or try a coding challenge.",
        noindex: true,
    },
} satisfies Record<string, PageMeta>;
