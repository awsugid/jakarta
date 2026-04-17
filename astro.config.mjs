// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import mdx from "@astrojs/mdx";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  adapter: node({ mode: "middleware" }),
  integrations: [react(), mdx()],

  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      allowedHosts: ["astro.avei.ovh", "localhost"],
    },
  },
});
