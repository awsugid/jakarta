// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import mdx from "@astrojs/mdx";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare(),
  integrations: [react(), mdx()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      allowedHosts: ["astro.avei.ovh", "localhost"],
    },
  },
});
