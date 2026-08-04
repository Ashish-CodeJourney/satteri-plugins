import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Tests exercise sibling packages through their public entry point, but
    // resolve to source so a stale (or missing) dist cannot mask a failure.
    alias: {
      "satteri-slug": new URL(
        "./packages/satteri-slug/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts", "internal/*/src/**/*.test.ts"],
  },
});
