import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_DIR } from "./helpers/paths";
import { RIVER_ALPHA, SKYLINE_ALPHA } from "../src/scripts/london-background";

// Guards WCAG AA contrast for the theme tokens in src/styles/global.css, so
// the palette can be redesigned freely without breaking readability.
const css = readFileSync(join(ROOT_DIR, "src/styles/global.css"), "utf8");

function tokens(selector: RegExp): Record<string, string> {
    const block = css.match(selector);
    if (!block) {
        throw new Error(`No token block for ${selector}`);
    }
    return Object.fromEntries(
        [...block[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [
            m[1],
            m[2],
        ]),
    );
}

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
}

const THEMES = {
    dark: tokens(/:root,\s*\[data-theme="dark"\]\s*\{([^}]*)\}/),
    light: tokens(/\[data-theme="light"\]\s*\{([^}]*)\}/),
};

// [foreground, background, minimum ratio]
const PAIRS: [string, string, number][] = [
    ["text", "bg", 4.5],
    ["text", "surface", 4.5],
    ["muted", "bg", 4.5],
    ["muted", "surface", 4.5],
    ["link", "bg", 4.5],
    ["link", "surface", 4.5],
    ["accent", "bg", 4.5],
    ["accent", "surface", 4.5],
    ["cta-text", "cta-bg", 4.5],
    ["border", "bg", 3],
    ["brand-from", "bg", 3],
    ["brand-via", "bg", 3],
    ["brand-to", "bg", 3],
    ["kyu-text", "kyu-white", 4.5],
    ["kyu-text", "kyu-yellow", 4.5],
    ["kyu-text", "kyu-blue", 4.5],
    ["kyu-text", "kyu-purple", 4.5],
];

describe.each(Object.entries(THEMES))("%s theme tokens", (_theme, values) => {
    it.each(PAIRS)("%s on %s meets %s:1", (fg, bg, minimum) => {
        expect(values[fg], `--${fg}`).toBeDefined();
        expect(values[bg], `--${bg}`).toBeDefined();
        expect(ratio(values[fg], values[bg])).toBeGreaterThanOrEqual(minimum);
    });
});

// The home hero draws the skyline and the river over its background (--bg
// fading to --surface) at partial opacity (src/scripts/london-background.ts),
// so hero text must stay readable on the darkest and lightest of those pixels.
function blend(fg: string, bg: string, alpha: number): string {
    const channel = (hex: string, i: number) =>
        parseInt(hex.slice(i, i + 2), 16);
    return `#${[1, 3, 5]
        .map((i) =>
            Math.round(channel(fg, i) * alpha + channel(bg, i) * (1 - alpha))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

describe.each(Object.entries(THEMES))(
    "%s theme hero background",
    (_theme, values) => {
        const pixels = {
            "skyline on bg": blend(values.border, values.bg, SKYLINE_ALPHA),
            "skyline on surface": blend(
                values.border,
                values.surface,
                SKYLINE_ALPHA,
            ),
            "river on surface": blend(
                values["brand-via"],
                values.surface,
                RIVER_ALPHA,
            ),
        };
        // The calls to action have their own --cta-bg and --bg backgrounds.
        it.each(Object.entries(pixels))(
            "text and muted on %s meet 4.5:1",
            (_name, pixel) => {
                for (const fg of ["text", "muted"]) {
                    expect(ratio(values[fg], pixel), fg).toBeGreaterThanOrEqual(
                        4.5,
                    );
                }
            },
        );
    },
);
