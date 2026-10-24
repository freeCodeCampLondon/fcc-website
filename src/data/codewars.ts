// CodeWars katas shown on /coding-challenges/. The data in codewars.json is
// written by `npm run data:codewars` (scripts/refresh-codewars.mjs) from the
// public CodeWars API; edit that file only to remove a kata, and add new ones
// with `npm run data:codewars -- <kata id>`.
import data from "./codewars.json";

export type Kata = {
    /** CodeWars kata id, 24 hex characters */
    id: string;
    title: string;
    /** Kyu rank: 8 is the easiest, 1 the hardest */
    rank: number;
    tags: string[];
    approved: boolean;
};

/** Sorted easiest first (8 kyu down), then by title. */
export const katas: Kata[] = data;

/** Opens the kata straight in the JavaScript trainer. */
export const kataUrl = (id: string): string =>
    `https://www.codewars.com/kata/${id}/train/javascript`;

/** Ranks present in the data, easiest first. */
export const kataRanks: number[] = [
    ...new Set(katas.map((kata) => kata.rank)),
].sort((a, b) => b - a);
