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
    coverage: {
      provider: "v8",
      // Only published plugin code. The test kit is exercised by every package
      // that uses it, and measuring it would report on the harness, not on what
      // ships.
      include: ["packages/*/src/**"],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "html", "lcov"],
      // A ratchet, not a target. What is left uncovered is defensive: `?? ""`
      // fallbacks that exist because `noUncheckedIndexedAccess` types an index
      // as possibly undefined, on paths where the regex that produced the index
      // guarantees it is not. Raise these as real coverage goes up; never lower
      // them to make a build pass.
      thresholds: { statements: 99.8, branches: 94.8, functions: 100, lines: 99.8 },
    },
  },
});
