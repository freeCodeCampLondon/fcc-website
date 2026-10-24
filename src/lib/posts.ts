import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/**
 * Published posts, newest first. Drafts are only included in `astro dev`, so
 * authors can preview them; they are never built for production.
 */
export async function getPublishedPosts(): Promise<Post[]> {
    const posts = await getCollection(
        "blog",
        ({ data }) => !import.meta.env.PROD || !data.draft,
    );
    return posts.sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    );
}

export function postUrl(post: Post): string {
    return `/blog/${post.id}/`;
}

export function formatPostDate(date: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London",
    }).format(date);
}
