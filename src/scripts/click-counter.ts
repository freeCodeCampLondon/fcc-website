// Click easter egg on the home hero: counts every click or tap on the
// background (not on links or buttons), floats the running total up from the
// pointer once it passes COUNT_REVEAL, and pops a message over the wordmark at
// each milestone. The count lives in localStorage so a returning visitor
// carries on where they left off. Milestone messages are also written to a
// polite live region; the counts themselves are not announced.

import { COUNT_REVEAL, milestoneFor } from "./click-milestones";

export const STORAGE_KEY = "fcclondon.clicks";
const FLOATER_LIFE = 1200;
const MILESTONE_LIFE = 2600;

export function startClickCounter(
    hero: HTMLElement,
    layer: HTMLElement,
    live?: HTMLElement | null,
): void {
    // Use the hero's own window, so tests can run this against any document
    const doc = hero.ownerDocument;
    const view = doc.defaultView ?? window;

    function readCount(): number {
        try {
            const stored = Number(view.localStorage.getItem(STORAGE_KEY));
            return Number.isFinite(stored) && stored > 0
                ? Math.floor(stored)
                : 0;
        } catch {
            return 0;
        }
    }

    function writeCount(value: number): void {
        try {
            view.localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
            // Private mode or blocked storage: the count still works for this visit
        }
    }

    let count = readCount();
    let milestone: HTMLElement | null = null;
    let milestoneTimer = 0;

    function float(text: string, x: number, y: number): void {
        const floater = doc.createElement("span");
        floater.className = "hero-count";
        floater.textContent = text;
        floater.style.left = `${x}px`;
        floater.style.top = `${y}px`;
        // A small random drift so a burst of clicks fans out instead of stacking
        floater.style.setProperty(
            "--drift",
            `${((Math.random() - 0.5) * 40).toFixed(1)}px`,
        );
        layer.append(floater);
        view.setTimeout(() => floater.remove(), FLOATER_LIFE);
    }

    function announce(text: string): void {
        milestone?.remove();
        view.clearTimeout(milestoneTimer);
        milestone = doc.createElement("p");
        milestone.className = "hero-milestone";
        milestone.textContent = text;
        // Centred on the wordmark when there is one (CSS falls back to 30%)
        const mark = hero.querySelector<HTMLElement>(".hero-wordmark");
        if (mark && mark.offsetHeight > 0) {
            const heroBox = hero.getBoundingClientRect();
            const box = mark.getBoundingClientRect();
            milestone.style.top = `${box.top - heroBox.top + box.height / 2}px`;
        }
        layer.append(milestone);
        if (live) {
            live.textContent = text;
        }
        milestoneTimer = view.setTimeout(() => {
            milestone?.remove();
            milestone = null;
        }, MILESTONE_LIFE);
    }

    hero.addEventListener("pointerdown", (event) => {
        if ((event.target as Element | null)?.closest?.("a, button")) {
            return;
        }
        count += 1;
        writeCount(count);
        if (count < COUNT_REVEAL) {
            return;
        }
        const bounds = hero.getBoundingClientRect();
        float(
            String(count),
            event.clientX - bounds.left,
            event.clientY - bounds.top,
        );
        const text = milestoneFor(count);
        if (text) {
            announce(text);
        }
    });
}
