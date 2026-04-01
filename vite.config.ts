import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

/**
 * Stamps the service worker with the current build time so each deploy
 * produces a new SW file, triggering the browser's update flow.
 */
const stampServiceWorker = (): Plugin => ({
  name: "stamp-service-worker",
  writeBundle() {
    const swPath = resolve("dist", "sw.js");
    try {
      const content = readFileSync(swPath, "utf-8");
      const stamped = content.replace("__BUILD_TIME__", Date.now().toString());
      writeFileSync(swPath, stamped);
    } catch {
      // sw.js not found in dist — skip
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stampServiceWorker()],
});
