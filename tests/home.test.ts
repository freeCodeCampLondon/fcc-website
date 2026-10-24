import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
    COUNT_REVEAL,
    MILESTONES,
    milestoneFor,
} from "../src/scripts/click-milestones";
import { STORAGE_KEY } from "../src/scripts/click-counter";
import { listDistFiles, loadPage } from "./helpers/dist";
import { DIST_DIR } from "./helpers/paths";

// Numbers and words that have no place in a family-friendly joke.
const BLOCKED_NUMBERS = [69, 420, 666, 6969, 80085];
const BLOCKED_WORDS =
    /\b(nice|sex|weed|drunk|beer|damn|hell|kill|die|dead|stupid|idiot|wtf|omg)\b/i;

describe("click counter milestones", () => {
    it("reveals the running total from ten clicks", () => {
        expect(COUNT_REVEAL).toBe(10);
    });

    it("has at least 15 surprises", () => {
        expect(MILESTONES.length).toBeGreaterThanOrEqual(15);
    });

    it("are ascending, unique and all after the reveal", () => {
        let previous = COUNT_REVEAL;
        for (const { at } of MILESTONES) {
            expect(at, `${at} after ${previous}`).toBeGreaterThan(previous);
            previous = at;
        }
        expect(new Set(MILESTONES.map((m) => m.text)).size).toBe(
            MILESTONES.length,
        );
    });

    it.each(MILESTONES)("'$text' fits one line in upper case", ({ text }) => {
        expect(text.length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(40);
        expect(text).toBe(text.toUpperCase());
    });

    it.each(MILESTONES)("'$text' is family-friendly", ({ at, text }) => {
        expect(BLOCKED_NUMBERS).not.toContain(at);
        expect(text).not.toMatch(BLOCKED_WORDS);
    });

    it("looks milestones up by exact count", () => {
        expect(milestoneFor(25)).toBe("HELLO, WORLD!");
        expect(milestoneFor(404)).toBe("CLICK NOT FOUND");
        for (const count of [0, 1, 9, 10, 11, 26, 99, 101]) {
            expect(milestoneFor(count), `count ${count}`).toBeUndefined();
        }
    });
});

describe("click counter on the built home page", () => {
    const doc = loadPage("/");
    const hero = doc.querySelector("[data-hero]")!;

    it("has a hidden layer for the floating numbers", () => {
        const layer = hero.querySelector(".hero-floaters");
        expect(layer?.getAttribute("aria-hidden")).toBe("true");
    });

    it("has a polite live region for the milestone messages", () => {
        const live = hero.querySelector("[data-hero-live]");
        expect(live?.getAttribute("aria-live")).toBe("polite");
        expect(live?.classList.contains("sr-only")).toBe(true);
    });

    it("ships the messages and the storage key in the page script", () => {
        const scripts = [...doc.querySelectorAll("script")].map((script) => {
            const src = script.getAttribute("src");
            return src
                ? readFileSync(join(DIST_DIR, src), "utf8")
                : (script.textContent ?? "");
        });
        const js = scripts.join("\n");
        expect(js).toContain("HELLO, WORLD!");
        expect(js).toContain(STORAGE_KEY);
        expect(js).toContain("localStorage");
    });

    it("keeps the home page scripts under 15 KB gzipped", () => {
        const bytes = [...doc.querySelectorAll("script")]
            .filter(
                (script) =>
                    script.getAttribute("type") !== "application/ld+json",
            )
            .map((script) => {
                const src = script.getAttribute("src");
                const code = src
                    ? readFileSync(join(DIST_DIR, src), "utf8")
                    : (script.textContent ?? "");
                return gzipSync(code).length;
            })
            .reduce((sum, size) => sum + size, 0);
        expect(bytes).toBeLessThan(15 * 1024);
    });

    it("styles the floaters and the milestone, with reduced motion variants", () => {
        const css = listDistFiles(".css")
            .map((file) => readFileSync(file, "utf8"))
            .join("\n");
        expect(css).toMatch(/\.hero-count\b/);
        expect(css).toMatch(/\.hero-milestone\b/);
        expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    });
});
