// Sätteri HAST plugin: external links in Markdown (blog posts) open in a new
// tab, like every external link on the site. Registered in astro.config.mjs.
const SITE_HOST = "freecodecamp.london";

function isExternal(href) {
  if (typeof href !== "string" || !/^https?:\/\//.test(href)) {
    return false;
  }
  return new URL(href).hostname !== SITE_HOST;
}

export const externalLinksPlugin = {
  name: "external-links",
  element: {
    filter: ["a"],
    visit(node, ctx) {
      if (!isExternal(node.properties?.href)) {
        return;
      }
      ctx.setProperty(node, "target", "_blank");
      ctx.setProperty(node, "rel", ["noopener", "noreferrer"]);
      ctx.appendChild(node, {
        type: "element",
        tagName: "span",
        properties: { className: ["sr-only"] },
        children: [{ type: "text", value: " (opens in a new tab)" }],
      });
    },
  },
};
