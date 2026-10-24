import type { IconName } from "../components/Icon.astro";

export type AboutItem = {
    title: string;
    text: string;
};

export type AboutLink = {
    label: string;
    text: string;
    href: string;
    icon: IconName;
};

// Who we are: one string per paragraph.
export const intro: string[] = [
    "freeCodeCamp London is a friendly community of people learning to code in London, from complete beginners to experienced developers.",
    "We meet up to learn together, help each other out and share what we are building. Our events are free, relaxed and open to everyone, whatever your background or experience.",
];

// What freeCodeCamp is: one string per paragraph.
export const aboutFreeCodeCamp: string[] = [
    "freeCodeCamp is a nonprofit that offers a free, self-paced coding curriculum with interactive lessons, projects and certifications, used by millions of learners around the world.",
    "freeCodeCamp London is a local community group in the freeCodeCamp family, so you can learn alongside people in your city as well as online.",
];

// What happens at a meetup. The format varies by event; each event page has the details.
export const whatToExpect: AboutItem[] = [
    {
        title: "Workshops and talks",
        text: "Some events have a hands-on workshop or a short talk on a tool, language or topic, followed by time to try it out and ask questions.",
    },
    {
        title: "Coding together and getting help",
        text: "Bring whatever you are working on, a freeCodeCamp lesson, a personal project or a coding challenge, and work on it with others. Stuck? Someone is usually happy to take a look.",
    },
    {
        title: "Show and tell",
        text: "Members share projects, recent learnings or anything coding related. It is a great way to get feedback and see what others are building. Want to present? Let us know on Discord.",
    },
];

// Ways to take part, shown in the "Get involved" section.
export const getInvolved: AboutLink[] = [
    {
        label: "Join us on Discord",
        text: "Chat with members, ask questions and share resources between events.",
        href: "https://discord.gg/hmVycPYAue",
        icon: "discord",
    },
    {
        label: "Follow us on Luma",
        text: "See upcoming events and register for the next meetup.",
        href: "https://luma.com/freecodecamp.london",
        icon: "calendar",
    },
    {
        label: "Join our Meetup group",
        text: "Our long-running community group on Meetup, with thousands of members across London.",
        href: "https://www.meetup.com/freecodecamp-london/",
        icon: "meetup",
    },
    {
        label: "Contribute to this website",
        text: "The site is open source and a good place to make your first pull request.",
        href: "https://github.com/freeCodeCampLondon/fcc-website/blob/main/CONTRIBUTING.md",
        icon: "github",
    },
];
