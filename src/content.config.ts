import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { eventSchema } from "./lib/events";
import { eventsLoader } from "./lib/events-loader";

// src/data/events/manual.json merged with the Luma Calendar feed at build
// time; set LUMA_FEED=off to build from the manual file only.
const events = defineCollection({
    loader: eventsLoader(),
    schema: eventSchema,
});

// Blog posts: src/content/blog/<slug>.md becomes /blog/<slug>/. Files starting
// with "_" (the template) are ignored. See CONTRIBUTING.md.
const blog = defineCollection({
    loader: glob({ base: "./src/content/blog", pattern: "[^_]*.md" }),
    schema: ({ image }) =>
        z.object({
            title: z.string().min(1).max(90),
            description: z.string().min(50).max(160),
            pubDate: z.coerce.date(),
            updatedDate: z.coerce.date().optional(),
            author: z.string().min(1),
            authorGithub: z
                .string()
                .regex(/^[A-Za-z0-9-]+$/)
                .optional(),
            tags: z.array(z.string()).default([]),
            draft: z.boolean().default(false),
            heroImage: image().optional(),
            heroImageAlt: z.string().optional(),
        }),
});

export const collections = { events, blog };
