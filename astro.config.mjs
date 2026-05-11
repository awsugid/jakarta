// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

import mdx from "@astrojs/mdx";
// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || "https://jakarta.awscommunity.id",
  integrations: [react(), mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      allowedHosts: ["astro.avei.ovh", "localhost"],
    },
  },
});
