import { expect, test } from "@playwright/test";

// FAQ answers are always shown (no accordion). Check every answer is visible
// and nothing inside a card is clipped, on a phone and on a desktop.
for (const width of [320, 1280]) {
    test.describe(`FAQ at ${width}px`, () => {
        test.use({ viewport: { width, height: 900 } });

        test("shows every answer in full without a click", async ({ page }) => {
            await page.goto("/about-us/");
            const cards = page.locator("article.faq");
            const count = await cards.count();
            expect(count).toBeGreaterThan(0);

            for (let index = 0; index < count; index++) {
                await expect(cards.nth(index).locator("p")).toBeVisible();
            }

            const clipped = await page.evaluate(() =>
                [...document.querySelectorAll<HTMLElement>("article.faq")]
                    .filter((card) => {
                        const box = card.getBoundingClientRect();
                        return [...card.children].some((child) => {
                            const inner = child.getBoundingClientRect();
                            return (
                                inner.bottom > box.bottom + 1 ||
                                inner.right > box.right + 1
                            );
                        });
                    })
                    .map((card) => card.querySelector("h3")?.textContent),
            );
            expect(clipped).toEqual([]);
        });
    });
}
