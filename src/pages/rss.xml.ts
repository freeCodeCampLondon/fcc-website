import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts, postUrl } from "../lib/posts";
import { SITE_NAME } from "../lib/seo";

export async function GET(context: APIContext) {
    const posts = await getPublishedPosts();
    return rss({
        title: `${SITE_NAME} blog`,
        description:
            "Meetup recaps, tutorials and stories from the freeCodeCamp London community.",
        site: context.site!,
        items: posts.map((post) => ({
            title: post.data.title,
            description: post.data.description,
            pubDate: post.data.pubDate,
            author: post.data.author,
            categories: post.data.tags,
            link: postUrl(post),
        })),
        customData: "<language>en-gb</language>",
    });
}
