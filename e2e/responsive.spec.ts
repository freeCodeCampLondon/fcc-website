import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { postRoutes, routesFromSourcePages } from "../tests/helpers/dist";
import { ROOT_DIR } from "../tests/helpers/paths";

// Event pages come from a dynamic route; the archive always has these.
const EVENT_ROUTES = (
    JSON.parse(
        readFileSync(join(ROOT_DIR, "src/data/events/manual.json"), "utf8"),
    ) as { id: string; start?: string }[]
)
    .filter((event) => event.start)
    .map((event) => `/events/${event.id}/`);
const ROUTES = [...routesFromSourcePages(), ...EVENT_ROUTES, ...postRoutes()];
const WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440];

// Elements whose right edge passes the viewport, described for the failure message.
async function overflowingElements(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return [...document.querySelectorAll("body *")]
            .filter((element) => {
                const box = element.getBoundingClientRect();
                return box.width > 0 && box.right > width + 1;
            })
            .slice(0, 5)
            .map((element) => {
                const classes = element.getAttribute("class") ?? "";
                return `${element.tagName.toLowerCase()}.${classes.slice(0, 60)}`;
            });
    });
}

for (const width of WIDTHS) {
    test.describe(`${width}px wide`, () => {
        test.use({ viewport: { width, height: 900 } });

        for (const route of ROUTES) {
            test(`${route} has no horizontal overflow`, async ({ page }) => {
                await page.goto(route);
                const { scrollWidth, clientWidth } = await page.evaluate(
                    () => ({
                        scrollWidth: document.documentElement.scrollWidth,
                        clientWidth: document.documentElement.clientWidth,
                    }),
                );
                expect(
                    scrollWidth,
                    `overflowing: ${(await overflowingElements(page)).join(", ")}`,
                ).toBeLessThanOrEqual(clientWidth);
            });

            test(`${route} has touch targets of at least 24px`, async ({
                page,
            }) => {
                await page.goto(route);
                // Links inside running text, including blog post bodies, are exempt (WCAG 2.5.8 inline exception)
                const small = await page.evaluate(() =>
                    [...document.querySelectorAll("a, button")]
                        .filter(
                            (element) =>
                                !element.closest("p, li li, td, .post-content"),
                        )
                        .filter((element) => {
                            const box = element.getBoundingClientRect();
                            // Visually hidden elements (sr-only skip link) are 1x1px until focused
                            const visible =
                                box.width > 1 &&
                                getComputedStyle(element).visibility !==
                                    "hidden";
                            return (
                                visible && (box.width < 24 || box.height < 24)
                            );
                        })
                        .map(
                            (element) =>
                                `${element.tagName.toLowerCase()} "${element.textContent?.trim().slice(0, 30)}"`,
                        ),
                );
                expect(small).toEqual([]);
            });

            test(`${route} keeps the header on one row`, async ({ page }) => {
                await page.goto(route);
                const height = await page.evaluate(
                    () =>
                        document
                            .querySelector("header")!
                            .getBoundingClientRect().height,
                );
                // One row is 76px (44px buttons plus padding); two rows would be over 100px
                expect(height).toBeLessThan(100);
            });

            test(`${route} body text is at least 16px`, async ({ page }) => {
                await page.goto(route);
                const size = await page.evaluate(() =>
                    parseFloat(getComputedStyle(document.body).fontSize),
                );
                expect(size).toBeGreaterThanOrEqual(16);
            });
        }
    });
}

test.describe("mobile menu", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("is reachable and shows the links when opened", async ({ page }) => {
        await page.goto("/about-us/");
        const button = page.getByRole("button", { name: "Menu" });
        await expect(button).toBeVisible();
        await button.click();
        await expect(button).toHaveAttribute("aria-expanded", "true");
        const menu = page.locator("#mobile-menu");
        await expect(menu.getByRole("link", { name: "Events" })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
    });
});
