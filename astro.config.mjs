// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import { externalLinksPlugin } from "./src/lib/markdown-external-links.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://freecodecamp.london",
  // sitemap-index.xml and sitemap-0.xml (referenced from public/robots.txt).
  // The 404 page is noindex, so it stays out.
  integrations: [sitemap({ filter: (page) => !page.endsWith("/404/") })],
  vite: {
    plugins: [tailwindcss()],
  },
  // Astro 7 defaults to "jsx", which drops the whitespace between inline
  // elements (nav links ran together); true keeps it as in Astro 4.
  compressHTML: true,
  markdown: {
    // Sätteri is Astro 7's default Markdown processor; the plugin makes
    // external links in posts open in a new tab.
    processor: satteri({ hastPlugins: [externalLinksPlugin] }),
  },
  fonts: [
    {
      name: "Lato",
      cssVariable: "--font-lato",
      provider: fontProviders.google(),
      weights: [400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
  devToolbar: {
    enabled: false,
  },
});
