import mdx from "@astrojs/mdx";
import { satteri } from "@astrojs/markdown-satteri";
import { defineConfig } from "astro/config";
import { satteriAutolinkHeadings } from "satteri-autolink-headings";
import { satteriBreaks } from "satteri-breaks";
import { satteriGithub } from "satteri-github";
import { satteriKatex } from "satteri-katex";
import { satteriMathjax } from "satteri-mathjax";
import { satteriMdxFrontmatter } from "satteri-mdx-frontmatter";
import { defaultTagNames, satteriSanitize } from "satteri-sanitize";
import { satteriSlug } from "satteri-slug";
import { satteriValidateLinks } from "satteri-validate-links";

// Set for GitHub Pages by the deploy workflow; unset locally so `astro dev` works.
const site = process.env.SITE;
const base = process.env.BASE;

// KaTeX and MathJax both consume the same math nodes, so only one can run.
// CI builds this site twice, once per renderer, to cover both.
const useMathjax = process.env.MATH === "mathjax";

/**
 * Both maths renderers emit markup that the default sanitiser allowlist does not
 * cover, so it has to be widened or the sanitiser strips the rendered output.
 * This is the configuration each package's README tells you to write.
 */
const MATH_TAGS = [
  "math", "semantics", "annotation", "mrow", "mi", "mn", "mo", "ms", "mtext",
  "msup", "msub", "msubsup", "mfrac", "msqrt", "mroot", "mstyle", "munder",
  "mover", "munderover", "mtable", "mtr", "mtd", "mspace", "mpadded", "mphantom",
  "menclose", "merror", "svg", "g", "path", "rect", "defs", "use", "line",
  "mjx-container", "mjx-assistive-mml",
];

export default defineConfig({
  integrations: [mdx()],
  ...(site === undefined ? {} : { site }),
  ...(base === undefined ? {} : { base }),
  markdown: {
    // Belongs here, not inside satteri(): the satteri() wrapper forwards only
    // mdastPlugins, hastPlugins and features, and drops everything else.
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
    processor: satteri({
      features: { math: true },
      mdastPlugins: [
        satteriBreaks(),
        satteriGithub({ repository: "Ashish-CodeJourney/satteri-plugins" }),
        satteriMdxFrontmatter(),
        // Astro reads only `data.astro` off the compile result, so a plugin's
        // own data key never reaches the page. Frontmatter is the one part of
        // that shape Astro hands back, which is what this option writes to.
        satteriValidateLinks({
          intoAstroFrontmatter: true,
          // Astro maps ./mdx to a page; there is no ./mdx on disk. Checking the
          // filesystem for a route reports a link that works perfectly well, so
          // extensionless destinations are left alone.
          // Anchors are still checked; only path-like routes are skipped.
          ignore: (url) => !url.startsWith("#") && !/\.[a-z]+$/i.test(url.split("#")[0] ?? ""),
        }),
        useMathjax ? satteriMathjax() : satteriKatex(),
      ],
      hastPlugins: [
        satteriSlug(),
        satteriAutolinkHeadings({
          behavior: "append",
          content: { type: "text", value: "#" },
          properties: { className: ["anchor"], ariaHidden: "true", tabIndex: -1 },
        }),
        // Last, so it sees every other plugin's output as well as the document's.
        satteriSanitize({
          tagNames: [...defaultTagNames, ...MATH_TAGS],
          attributes: {
            span: ["class", "style"],
            svg: ["xmlns", "width", "height", "viewBox", "style", "focusable"],
            path: ["d", "transform", "style"],
            g: ["transform", "stroke", "fill", "style", "data-mml-node"],
            math: ["xmlns", "display"],
            annotation: ["encoding"],
            "mjx-container": ["class", "jax", "display", "style"],
          },
        }),
      ],
    }),
  },
});
