import { afterEach, describe, expect, it, vi } from "vitest";
import { faqAnswer } from "../src/data/faq";
import { katas } from "../src/data/codewars";
import { STORAGE_KEY, startClickCounter } from "../src/scripts/click-counter";
import { loadPage } from "./helpers/dist";

// Each test runs exactly the inline code it checks against the built markup.
describe("mobile menu toggle", () => {
    const route = "/about-us/";

    function setUp() {
        const doc = loadPage(route);
        const script = [...doc.querySelectorAll("script:not([src])")]
            .map((el) => el.textContent ?? "")
            .find((code) => code.includes("navmenu-toggle"));
        expect(script, "inline navbar script").toBeTruthy();

        new Function("document", script!)(doc);

        const button = doc.getElementById("menu")!;
        const mobileMenu = doc.getElementById("mobile-menu")!;
        const [openIcon, closeIcon] = [
            ...doc.querySelectorAll("#menu path.navmenu-toggle"),
        ];
        return { doc, button, mobileMenu, openIcon, closeIcon };
    }

    it("starts closed with the hamburger icon showing", () => {
        const { button, mobileMenu, openIcon, closeIcon } = setUp();
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(mobileMenu.classList.contains("hidden")).toBe(true);
        expect(openIcon.classList.contains("hidden")).toBe(false);
        expect(closeIcon.classList.contains("hidden")).toBe(true);
    });

    it("opens the menu and swaps to the close icon on click", () => {
        const { button, mobileMenu, openIcon, closeIcon } = setUp();
        button.click();
        expect(button.getAttribute("aria-expanded")).toBe("true");
        expect(mobileMenu.classList.contains("hidden")).toBe(false);
        expect(openIcon.classList.contains("hidden")).toBe(true);
        expect(closeIcon.classList.contains("hidden")).toBe(false);
    });

    it("closes again on a second click", () => {
        const { button, mobileMenu, openIcon } = setUp();
        button.click();
        button.click();
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(mobileMenu.classList.contains("hidden")).toBe(true);
        expect(openIcon.classList.contains("hidden")).toBe(false);
    });

    it("closes on Escape and returns focus to the button", () => {
        const { doc, button, mobileMenu } = setUp();
        button.click();
        const view = doc.defaultView as unknown as typeof globalThis;
        doc.dispatchEvent(new view.KeyboardEvent("keydown", { key: "Escape" }));
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(mobileMenu.classList.contains("hidden")).toBe(true);
        expect(doc.activeElement).toBe(button);
    });
});

describe("FAQ cards", () => {
    const doc = loadPage("/about-us/");
    const cards = [...doc.querySelectorAll<HTMLElement>("article.faq")];

    it("shows every answer without needing a click", () => {
        expect(cards.length).toBe(faqAnswer.length);
        expect(doc.querySelector("main details")).toBeNull();
        for (const card of cards) {
            expect(card.querySelector("p")?.hasAttribute("hidden")).toBe(false);
        }
    });

    it("has no inline click handlers", () => {
        expect(doc.querySelector("main [onclick]")).toBeNull();
    });
});

describe("theme", () => {
    // Runs the inline head script and the toggle script against the built page
    // with a controllable localStorage.
    function setUp(stored: string | null, { throws = false } = {}) {
        const doc = loadPage("/about-us/");
        const store = new Map<string, string>();
        if (stored !== null) {
            store.set("theme", stored);
        }
        const localStorage = {
            getItem: (key: string) => {
                if (throws) {
                    throw new Error("blocked");
                }
                return store.get(key) ?? null;
            },
            setItem: (key: string, value: string) => {
                if (throws) {
                    throw new Error("blocked");
                }
                store.set(key, value);
            },
        };
        const scripts = [...doc.querySelectorAll("script:not([src])")].map(
            (el) => el.textContent ?? "",
        );
        const run = (code: string) =>
            new Function("document", "localStorage", code)(doc, localStorage);
        run(
            scripts.find(
                (code) =>
                    code.includes('"theme"') && !code.includes("theme-toggle"),
            )!,
        );
        return { doc, store, run, scripts };
    }

    it("defaults to dark", () => {
        const { doc } = setUp(null);
        expect(doc.documentElement.dataset.theme).toBe("dark");
    });

    it.each([
        ["light", "light"],
        ["dark", "dark"],
        ["garbage", "dark"],
    ])("stored %s gives %s", (stored, expected) => {
        const { doc } = setUp(stored);
        expect(doc.documentElement.dataset.theme).toBe(expected);
    });

    it("stays dark when storage is blocked", () => {
        const { doc } = setUp("light", { throws: true });
        expect(doc.documentElement.dataset.theme).toBe("dark");
    });

    it("toggle switches theme, updates aria-pressed and remembers the choice", () => {
        const { doc, store, run, scripts } = setUp(null);
        run(scripts.find((code) => code.includes("theme-toggle"))!);
        const button = doc.querySelector<HTMLButtonElement>(".theme-toggle")!;
        expect(button.getAttribute("aria-pressed")).toBe("false");

        button.click();
        expect(doc.documentElement.dataset.theme).toBe("light");
        expect(button.getAttribute("aria-pressed")).toBe("true");
        expect(store.get("theme")).toBe("light");

        button.click();
        expect(doc.documentElement.dataset.theme).toBe("dark");
        expect(store.get("theme")).toBe("dark");
    });
});

describe("coding challenge filters", () => {
    function setUp({ runScript = true } = {}) {
        const doc = loadPage("/coding-challenges/");
        const script = [...doc.querySelectorAll("script:not([src])")]
            .map((el) => el.textContent ?? "")
            .find((code) => code.includes("kata-filters"));
        expect(script, "inline filter script").toBeTruthy();
        if (runScript) {
            new Function("document", script!)(doc);
        }

        const view = doc.defaultView as unknown as typeof globalThis;
        const form = doc.getElementById("kata-filters") as HTMLFormElement;
        const search = doc.getElementById("kata-search") as HTMLInputElement;
        const status = doc.getElementById("kata-status")!;
        const cards = [...doc.querySelectorAll<HTMLElement>("[data-kata]")];
        const visible = () => cards.filter((card) => !card.hidden);
        const titles = () =>
            visible().map((card) => card.querySelector("h3")!.textContent);
        const checkRank = (rank: number) => {
            const box = form.querySelector<HTMLInputElement>(
                `input[name="rank"][value="${rank}"]`,
            )!;
            box.checked = true;
            box.dispatchEvent(new view.Event("change", { bubbles: true }));
        };
        const type = (term: string) => {
            search.value = term;
            search.dispatchEvent(new view.Event("input", { bubbles: true }));
        };
        const tagButton = (tag: string) =>
            form.querySelector<HTMLButtonElement>(`[data-tag="${tag}"]`)!;
        const section = (rank: number) =>
            doc.querySelector<HTMLElement>(
                `section[data-rank-section="${rank}"]`,
            )!;
        return {
            doc,
            form,
            status,
            cards,
            visible,
            titles,
            checkRank,
            type,
            tagButton,
            section,
        };
    }

    it("leaves every card visible and the filter bar hidden without JavaScript", () => {
        const { form, cards, visible } = setUp({ runScript: false });
        expect(form.hidden).toBe(true);
        expect(cards.length).toBe(katas.length);
        expect(visible().length).toBe(katas.length);
    });

    it("shows the filter bar and the full count once the script runs", () => {
        const { form, visible, status } = setUp();
        expect(form.hidden).toBe(false);
        expect(visible().length).toBe(katas.length);
        expect(status.textContent).toBe(`${katas.length} challenges shown`);
        expect(status.getAttribute("role")).toBe("status");
    });

    it("selecting 8 kyu shows exactly the 8 kyu cards", () => {
        const { checkRank, visible, status, section } = setUp();
        const expected = katas.filter((kata) => kata.rank === 8).length;
        checkRank(8);
        expect(visible().length).toBe(expected);
        expect(visible().every((card) => card.dataset.rank === "8")).toBe(true);
        expect(status.textContent).toBe(`${expected} challenges shown`);
        expect(section(8).hidden).toBe(false);
        expect(section(7).hidden).toBe(true);
        expect(section(8).querySelector("[data-count]")!.textContent).toBe(
            `(${expected})`,
        );
    });

    it("matches titles case-insensitively", () => {
        const { type, titles, status } = setUp();
        const expected = katas
            .filter((kata) => kata.title.toLowerCase().includes("array"))
            .map((kata) => kata.title);
        type("ARRAY");
        expect(titles().sort()).toEqual(expected.sort());
        expect(status.textContent).toBe(`${expected.length} challenges shown`);
    });

    it("filters by topic with toggle buttons", () => {
        const { tagButton, visible } = setUp();
        const button = tagButton("strings");
        button.click();
        expect(button.getAttribute("aria-pressed")).toBe("true");
        expect(visible().length).toBe(
            katas.filter((kata) => kata.tags.includes("Strings")).length,
        );
        button.click();
        expect(button.getAttribute("aria-pressed")).toBe("false");
        expect(visible().length).toBe(katas.length);
    });

    it("updates section counts and says when nothing matches", () => {
        const { type, status, section } = setUp();
        type("no kata is called this");
        expect(status.textContent).toBe("No challenges match these filters");
        expect(section(8).hidden).toBe(true);
    });

    it("clearing the filters shows every card again", () => {
        const { doc, checkRank, type, tagButton, visible, status, section } =
            setUp();
        checkRank(6);
        tagButton("arrays").click();
        type("a");
        expect(visible().length).toBeLessThan(katas.length);

        doc.getElementById("kata-clear")!.click();
        expect(visible().length).toBe(katas.length);
        expect(tagButton("arrays").getAttribute("aria-pressed")).toBe("false");
        expect(status.textContent).toBe(`${katas.length} challenges shown`);
        expect(section(7).hidden).toBe(false);
        expect(section(7).querySelector("[data-count]")!.textContent).toBe(
            `(${katas.filter((kata) => kata.rank === 7).length})`,
        );
    });
});

describe("event freshness script", () => {
    // Pages are built daily; the script hides events that ended since then.
    // The test build has no upcoming events (LUMA_FEED=off), so upcoming
    // cards are added to the built markup here. Date.now is stubbed: the
    // tests never depend on the real clock.
    const ENDED = "2026-10-28T21:00:00.000Z";
    const LATER = "2026-11-25T21:00:00.000Z";

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function freshnessScript(doc: Document): string {
        const script = [...doc.querySelectorAll("script:not([src])")]
            .map((el) => el.textContent ?? "")
            .find((code) => code.includes("data-next-candidate"));
        expect(script, "inline freshness script").toBeTruthy();
        return script!;
    }

    function run(doc: Document, now: string): void {
        vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
        new Function("document", freshnessScript(doc))(doc);
    }

    function eventsPage(ends: string[]) {
        const doc = loadPage("/events/");
        const box = doc.querySelector("[data-next-event]")!;
        const fallback = box.querySelector<HTMLElement>(
            "[data-next-fallback]",
        )!;
        ends.forEach((end, index) => {
            const card = doc.createElement("article");
            card.setAttribute("data-next-candidate", end);
            card.dataset.eventId = `event-${index}`;
            card.hidden = index > 0;
            box.insertBefore(card, fallback);
        });
        fallback.hidden = ends.length > 0;

        const list = doc.createElement("section");
        list.setAttribute("data-event-list", "");
        ends.forEach((end, index) => {
            const item = doc.createElement("li");
            item.dataset.upcomingId = `event-${index}`;
            item.setAttribute("data-event-end", end);
            item.hidden = index === 0;
            list.append(item);
        });
        doc.querySelector("main")!.append(list);

        const cards = [
            ...box.querySelectorAll<HTMLElement>("[data-next-candidate]"),
        ];
        const items = [...list.querySelectorAll<HTMLElement>("li")];
        return { doc, cards, items, fallback, list };
    }

    it("keeps an event that has not ended", () => {
        const { doc, cards, fallback } = eventsPage([ENDED]);
        run(doc, "2026-10-28T20:59:00Z");
        expect(cards[0].hidden).toBe(false);
        expect(fallback.hidden).toBe(true);
    });

    it("hides an ended event and shows the fallback", () => {
        const { doc, cards, fallback, list } = eventsPage([ENDED]);
        run(doc, "2026-10-28T21:00:00Z");
        expect(cards[0].hidden).toBe(true);
        expect(fallback.hidden).toBe(false);
        expect(list.hidden).toBe(true);
    });

    it("moves on to the following event and removes it from the list", () => {
        const { doc, cards, items, fallback, list } = eventsPage([
            ENDED,
            LATER,
        ]);
        run(doc, "2026-10-29T09:00:00Z");
        expect(cards.map((card) => card.hidden)).toEqual([true, false]);
        expect(items.map((item) => item.hidden)).toEqual([true, true]);
        expect(fallback.hidden).toBe(true);
        expect(list.hidden).toBe(true);
    });

    it("swaps the register button for the ended notice on an event page", () => {
        const doc = loadPage(
            "/events/2026-08-19-ai-workshop-hermes-agent-w-your/",
        );
        const notice = doc.querySelector<HTMLElement>("[data-event-ended]")!;
        const end = notice.getAttribute("data-event-ended")!;
        notice.hidden = true;
        const register = doc.createElement("a");
        register.setAttribute("data-event-end", end);
        notice.before(register);

        run(doc, new Date(Date.parse(end) - 60_000).toISOString());
        expect(register.hidden).toBe(false);
        expect(notice.hidden).toBe(true);

        run(doc, end);
        expect(register.hidden).toBe(true);
        expect(notice.hidden).toBe(false);
    });
});

describe("click counter easter egg", () => {
    // Runs startClickCounter against the built home hero in happy-dom.
    function setUp({ stored = null as string | null, throws = false } = {}) {
        const doc = loadPage("/");
        const view = doc.defaultView as unknown as Window & typeof globalThis;
        if (throws) {
            Object.defineProperty(view, "localStorage", {
                get() {
                    throw new Error("blocked");
                },
            });
        } else if (stored !== null) {
            view.localStorage.setItem(STORAGE_KEY, stored);
        }
        const hero = doc.querySelector<HTMLElement>("[data-hero]")!;
        const layer = hero.querySelector<HTMLElement>(".hero-floaters")!;
        const live = hero.querySelector<HTMLElement>("[data-hero-live]")!;
        startClickCounter(hero, layer, live);
        const tap = (target: Element = hero, times = 1) => {
            for (let i = 0; i < times; i++) {
                target.dispatchEvent(
                    new view.PointerEvent("pointerdown", {
                        bubbles: true,
                        clientX: 100,
                        clientY: 80,
                    }),
                );
            }
        };
        const floaters = () =>
            [...layer.querySelectorAll(".hero-count")].map(
                (el) => el.textContent,
            );
        const read = () =>
            throws ? null : view.localStorage.getItem(STORAGE_KEY);
        return { hero, layer, live, tap, floaters, stored: read };
    }

    it("counts taps in localStorage", () => {
        const { tap, stored } = setUp();
        tap();
        tap();
        expect(stored()).toBe("2");
    });

    it("floats nothing before the tenth tap, then the running total", () => {
        const { tap, floaters } = setUp();
        tap(undefined, 9);
        expect(floaters()).toEqual([]);
        tap();
        expect(floaters()).toEqual(["10"]);
    });

    it("carries on from the stored count", () => {
        const { tap, floaters, stored } = setUp({ stored: "41" });
        tap();
        expect(stored()).toBe("42");
        expect(floaters()).toEqual(["42"]);
    });

    it("ignores taps on links and buttons", () => {
        const { hero, tap, stored } = setUp();
        tap(hero.querySelector("a")!);
        expect(stored()).toBeNull();
    });

    it("shows the milestone at 25 and tells screen readers", () => {
        const { layer, live, tap } = setUp({ stored: "24" });
        tap();
        expect(layer.querySelector(".hero-milestone")?.textContent).toBe(
            "HELLO, WORLD!",
        );
        expect(live.textContent).toBe("HELLO, WORLD!");
        tap();
        expect(layer.querySelectorAll(".hero-milestone").length).toBe(1);
    });

    it("still counts for the visit when storage is blocked", () => {
        const { tap, floaters } = setUp({ throws: true });
        tap(undefined, 10);
        expect(floaters()).toEqual(["10"]);
    });
});
