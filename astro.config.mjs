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
    "/events/community-day-2026": "/comday-26",
    "/volunteers": "/volunteer",
    "/sponsors": "/sponsor",
  },
  integrations: [react(), mdx(), sitemap()],

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
