import { satteri } from "@astrojs/markdown-satteri";
import { defineConfig } from "astro/config";
import { satteriAutolinkHeadings } from "satteri-autolink-headings";
import { satteriKatex } from "satteri-katex";
import { satteriSlug } from "satteri-slug";

// Set for GitHub Pages by the deploy workflow; unset locally so `astro dev` works.
const site = process.env.SITE;
const base = process.env.BASE;

export default defineConfig({
  ...(site === undefined ? {} : { site }),
  ...(base === undefined ? {} : { base }),
  markdown: {
    processor: satteri({
      features: { math: true },
      mdastPlugins: [satteriKatex()],
      hastPlugins: [
        satteriSlug(),
        satteriAutolinkHeadings({
          behavior: "append",
          content: { type: "text", value: "#" },
          properties: { className: ["anchor"], ariaHidden: "true", tabIndex: -1 },
        }),
      ],
    }),
  },
});
