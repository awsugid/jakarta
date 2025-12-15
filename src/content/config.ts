import { defineCollection, z } from 'astro:content';

const events = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.date(),
        location: z.string(),
        type: z.enum(['Meetup', 'Conference', 'Workshop']),
        description: z.string(),
        image: z.string().optional(),
        registrationUrl: z.string().url().optional(),
    }),
});

const blog = defineCollection({
    type: 'content',
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
