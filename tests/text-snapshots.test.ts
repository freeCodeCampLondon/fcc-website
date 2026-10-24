import { describe, expect, it } from "vitest";
import {
    postRoutes,
    readPageHtml,
    routesFromSourcePages,
} from "./helpers/dist";

// Snapshots of the visible text of every built page, one plain text file per
// route under tests/__snapshots__/text/. They catch changes that the targeted
// tests miss, such as whitespace lost between inline elements after a
// formatter or compiler upgrade. After an intended content change, review the
// diff and update with: npx vitest run -u
function visibleText(html: string): string {
    return (
        html
            .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            // Collapse whitespace like a browser does before adding line breaks
            // at block boundaries, so reflowed source text gives the same result.
            .replace(/\s+/g, " ")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/(p|h[1-6]|li|div|nav|footer|header|ul|title)>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&#x27;/g, "'")
            .replace(/&rarr;/g, "→")
            .split("\n")
            .map((line) => line.replace(/ +/g, " ").trim())
            .filter((line) => line !== "")
            .join("\n")
    );
}

describe("visible text snapshots", () => {
    it.each([...routesFromSourcePages(), ...postRoutes()])(
        "%s",
        async (route) => {
            const name =
                route === "/"
                    ? "index"
                    : route.slice(1, -1).replace(/\//g, "-");
            await expect(
                `${visibleText(readPageHtml(route))}\n`,
            ).toMatchFileSnapshot(`./__snapshots__/text/${name}.txt`);
        },
    );
});
