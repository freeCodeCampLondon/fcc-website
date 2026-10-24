import { describe, expect, it } from "vitest";
import { sortKatas, toKata } from "../scripts/refresh-codewars.mjs";
import response from "./fixtures/codewars-kata.json";

// The refresh script's mapping, run on a recorded CodeWars API response so the
// tests never call the API.
describe("refresh-codewars", () => {
    it("maps an API response to a kata", () => {
        expect(toKata(response)).toEqual({
            id: "55a70521798b14d4750000a4",
            title: "Returning Strings",
            rank: 8,
            tags: ["Strings", "Fundamentals"],
            approved: true,
        });
    });

    it("collapses whitespace in titles", () => {
        expect(toKata({ ...response, name: " Two  spaces " })).toMatchObject({
            title: "Two spaces",
        });
    });

    it("skips beta katas", () => {
        expect(toKata({ ...response, approvedAt: null })).toBe(
            "not approved (beta)",
        );
    });

    it("skips katas without JavaScript", () => {
        expect(toKata({ ...response, languages: ["python"] })).toBe(
            "no JavaScript version",
        );
    });

    it("sorts easiest first, then by title", () => {
        const kata = (title: string, rank: number) => ({
            id: title,
            title,
            rank,
            tags: [],
            approved: true,
        });
        expect(
            sortKatas([kata("b", 7), kata("c", 8), kata("a", 7)]).map(
                (item) => item.id,
            ),
        ).toEqual(["c", "a", "b"]);
    });
});
