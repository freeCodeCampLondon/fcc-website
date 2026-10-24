import type { IconName } from "../components/Icon.astro";
// Copy for the home page (src/pages/index.astro and src/components/home/).
// The "What we do" cards reuse whatToExpect from about.ts.
import { pageMeta } from "./pageMeta";

export type HomeLink = {
    label: string;
    href: string;
};

export type InvolvedLink = HomeLink & {
    text: string;
    /** Opens in a new tab (external sites) */
    external: boolean;
    /** Icon shown on the card (see src/components/Icon.astro) */
    icon: IconName;
};

export const hero = {
    /** The agreed tagline, also the home page meta description */
    tagline: pageMeta["/"].description,
    primary: { label: "Join the next meetup", href: "#next-meetup" },
    secondary: {
        label: "Start learning on freeCodeCamp",
        href: "https://www.freecodecamp.org/",
    },
} satisfies {
    tagline: string;
    primary: HomeLink;
    secondary: HomeLink;
};

export const whatWeDo = {
    heading: "What we do",
    intro: "Every meetup is a little different, but most include some of these.",
    more: { label: "More about our meetups", href: "/about-us/" },
};

export const getInvolvedHome: { heading: string; links: InvolvedLink[] } = {
    heading: "Get involved",
    links: [
        {
            label: "Join us on Discord",
            text: "Chat with members, ask questions and share resources between events.",
            href: "https://discord.gg/hmVycPYAue",
            external: true,
            icon: "discord",
        },
        {
            label: "Follow us on Luma",
            text: "See upcoming events and register for the next meetup.",
            href: "https://luma.com/freecodecamp.london",
            external: true,
            icon: "calendar",
        },
        {
            label: "Join our Meetup group",
            text: "Our long-running community group on Meetup, with thousands of members across London.",
            href: "https://www.meetup.com/freecodecamp-london/",
            external: true,
            icon: "meetup",
        },
        {
            label: "Help build this website",
            text: "The site is open source on GitHub and a good place to make your first pull request.",
            href: "https://github.com/freeCodeCampLondon/fcc-website",
            external: true,
            icon: "github",
        },
        {
            label: "Write for the blog",
            text: "Share a meetup recap, a tutorial or what you are learning. Posts are submitted as a pull request.",
            href: "/blog/",
            external: false,
            icon: "pen",
        },
    ],
};
