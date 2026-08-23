// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || "https://jakarta.awscommunity.id",
  redirects: {
    "/events/community-day-2026": "/comday",
    "/comday": "/comday",
    "/volunteers": "/volunteer",
    "/sponsors": "/sponsor",
  },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/events/community-day-2026") &&
        !page.includes("/comday-26") &&
        !page.includes("/volunteers") &&
        !page.includes("/sponsors"),
      serialize(item) {
        if (item.url === "https://jakarta.awscommunity.id/" || item.url === "https://jakarta.awscommunity.id") {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (
          item.url.includes("/comday") ||
          item.url.includes("/events") ||
          item.url.includes("/blog") ||
          item.url.includes("/speakers") ||
          item.url.includes("/volunteer") ||
          item.url.includes("/sponsor")
        ) {
          item.priority = 0.9;
          item.changefreq = "weekly";
        } else {
          item.priority = 0.7;
          item.changefreq = "monthly";
        }
        return item;
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      host: true,
      allowedHosts: true,
    },
  },
});
