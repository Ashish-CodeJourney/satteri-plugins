import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const plugins = defineCollection({
  loader: glob({
    pattern: "*/README.md",
    base: "../../packages",
    generateId: ({ entry }) => entry.split("/")[0] ?? entry,
  }),
});

export const collections = { plugins };
