import { expect, test, type Page } from "@playwright/test";

// The home page hero effects (src/scripts/london-background.ts). Animation
// frames are counted by wrapping requestAnimationFrame before the page loads.
async function countFrames(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const original = window.requestAnimationFrame.bind(window);
        const counted = window as unknown as { frames: number };
        counted.frames = 0;
        window.requestAnimationFrame = (callback) => {
            counted.frames += 1;
            return original(callback);
        };
    });
}

const frames = (page: Page) =>
    page.evaluate(() => (window as unknown as { frames: number }).frames);

const canvas = (page: Page) => page.locator("[data-hero] canvas");

test("loads the home page without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
        if (message.type() === "error") {
            errors.push(message.text());
        }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-mode", "animated");
    await page.mouse.move(400, 300);
    await page.mouse.click(300, 250);
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
});

test("animates the background and pauses it off screen", async ({ page }) => {
    await countFrames(page);
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-mode", "animated");
    const start = await frames(page);
    await page.waitForTimeout(500);
    expect(await frames(page)).toBeGreaterThan(start + 5);

    await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForTimeout(300);
    const paused = await frames(page);
    await page.waitForTimeout(500);
    expect(await frames(page)).toBe(paused);
});

test.describe("click counter on a phone", () => {
    test.use({ viewport: { width: 375, height: 800 }, hasTouch: true });

    test("floats the running total from the tenth tap", async ({ page }) => {
        await page.goto("/");
        const box = (await page.locator("[data-hero]").boundingBox())!;
        const tap = () => page.touchscreen.tap(box.x + 30, box.y + 30);
        for (let i = 0; i < 9; i++) {
            await tap();
        }
        await expect(page.locator(".hero-count")).toHaveCount(0);
        await tap();
        await expect(page.locator(".hero-count").last()).toHaveText("10");
        expect(
            await page.evaluate(() => localStorage.getItem("fcclondon.clicks")),
        ).toBe("10");
    });

    test("shows a milestone message over the wordmark", async ({ page }) => {
        await page.addInitScript(() =>
            localStorage.setItem("fcclondon.clicks", "24"),
        );
        await page.goto("/");
        const box = (await page.locator("[data-hero]").boundingBox())!;
        await page.touchscreen.tap(box.x + 30, box.y + 30);
        const message = page.locator(".hero-milestone");
        await expect(message).toHaveText("HELLO, WORLD!");
        await expect(page.locator("[data-hero-live]")).toHaveText(
            "HELLO, WORLD!",
        );
        // It stays inside the viewport on a phone
        const bounds = (await message.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
    });
});

test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("draws one still frame and runs no animation loop", async ({
        page,
    }) => {
        await countFrames(page);
        await page.goto("/");
        await expect(canvas(page)).toHaveAttribute("data-mode", "static");
        await page.waitForTimeout(1000);
        expect(await frames(page)).toBe(0);
        // The still frame was drawn: some canvas pixels are not transparent
        const drawn = await canvas(page).evaluate((element) => {
            const node = element as HTMLCanvasElement;
            const data = node
                .getContext("2d")!
                .getImageData(0, 0, node.width, node.height).data;
            return data.some((value, index) => index % 4 === 3 && value > 0);
        });
        expect(drawn).toBe(true);
    });
});

test("redraws in the new colours when the theme changes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-mode", "static");
    const snapshot = () =>
        canvas(page).evaluate((element) =>
            (element as HTMLCanvasElement).toDataURL(),
        );
    const dark = await snapshot();
    await page.locator("header .theme-toggle").first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await snapshot()).not.toBe(dark);
});
