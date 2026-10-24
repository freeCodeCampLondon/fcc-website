// The home hero's click easter egg: after COUNT_REVEAL clicks the running
// total floats up from every click or tap, and at each milestone a message
// pops up over the wordmark. Pure data and lookup, so the tests can import it
// without a browser. Messages are family-friendly (under-18s come with an
// adult), upper case and short enough for one line on a phone.

export const COUNT_REVEAL = 10;

export interface Milestone {
    at: number;
    text: string;
}

export const MILESTONES: readonly Milestone[] = [
    { at: 25, text: "HELLO, WORLD!" },
    { at: 42, text: "THE ANSWER TO EVERYTHING" },
    { at: 50, text: "CONSOLE.LOG('KEEP GOING')" },
    { at: 64, text: "64 BITS OF DEDICATION" },
    { at: 100, text: "100 CLICKS, 0 BUGS" },
    { at: 128, text: "BYTE ME (NOT REALLY)" },
    { at: 200, text: "HAVE YOU TRIED A KATA?" },
    { at: 256, text: "ONE BYTE OF CLICKS" },
    { at: 404, text: "CLICK NOT FOUND" },
    { at: 418, text: "I'M A TEAPOT. TEA BREAK?" },
    { at: 500, text: "INTERNAL CLICK ERROR" },
    { at: 1000, text: "GIT COMMIT -M 'LEGEND'" },
    { at: 1024, text: "ONE KILOCLICK" },
    { at: 1337, text: "L33T" },
    { at: 2000, text: "THE KETTLE IS ON" },
    { at: 5000, text: "YOU SHOULD GIVE A TALK" },
    { at: 9001, text: "IT'S OVER 9000!" },
    { at: 10000, text: "COME TO A MEETUP INSTEAD" },
    { at: 65536, text: "INTEGER OVERFLOW (JUST KIDDING)" },
    { at: 100000, text: "PLEASE CONTRIBUTE TO THIS WEBSITE" },
];

export function milestoneFor(count: number): string | undefined {
    return MILESTONES.find((milestone) => milestone.at === count)?.text;
}
