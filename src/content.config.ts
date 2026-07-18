import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const events = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/events" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    location: z.string(),
    type: z.enum(["Meetup", "Conference", "Workshop"]),
    description: z.string(),
    image: z.string().optional(),
    registrationUrl: z.string().url().optional(),
    pretixUrl: z.string().url().optional(),
    pretixSubevent: z.string().optional(),
    pretixCheckinListId: z.string().optional(),
    pretixListType: z.enum(["list", "calendar", "week"]).optional(),
    immichAlbumId: z.string().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  events,
  blog,
};
