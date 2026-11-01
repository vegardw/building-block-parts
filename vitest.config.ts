import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests don't load the React plugin.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
