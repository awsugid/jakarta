import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const repo = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@/lib/api", replacement: path.join(import.meta.dirname, "mock-api.ts") },
      { find: "@", replacement: path.join(repo, "src") },
    ],
  },
  server: { host: "127.0.0.1", port: 0 },
});
