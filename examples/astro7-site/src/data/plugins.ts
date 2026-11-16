export type PluginStage = "Markdown (MDAST)" | "HTML (HAST)";

export type PluginInfo = {
  readonly name: string;
  readonly replaces: string;
  readonly stage: PluginStage;
  readonly summary: string;
};

export const plugins: readonly PluginInfo[] = [
  {
    name: "satteri-slug",
    replaces: "rehype-slug",
    stage: "HTML (HAST)",
    summary: "Adds an id to every heading, using the same GitHub slugging rules.",
  },
  {
    name: "satteri-autolink-headings",
    replaces: "rehype-autolink-headings",
    stage: "HTML (HAST)",
    summary: "Adds an anchor link to every heading, so sections can be linked to.",
  },
  {
    name: "satteri-katex",
    replaces: "rehype-katex",
    stage: "Markdown (MDAST)",
    summary: "Renders math with KaTeX, at build time, with no client-side script.",
  },
  {
    name: "satteri-mathjax",
    replaces: "rehype-mathjax",
    stage: "Markdown (MDAST)",
    summary: "Renders math with MathJax, for when you need its output format.",
  },
  {
    name: "satteri-breaks",
    replaces: "remark-breaks",
    stage: "Markdown (MDAST)",
    summary: "Turns single newlines into line breaks, like chat and comment apps do.",
  },
  {
    name: "satteri-github",
    replaces: "remark-github",
    stage: "Markdown (MDAST)",
    summary: "Autolinks issues, pull requests, mentions and commit SHAs to GitHub.",
  },
  {
    name: "satteri-sanitize",
    replaces: "rehype-sanitize",
    stage: "HTML (HAST)",
    summary: "Strips unsafe HTML, attributes and URLs from untrusted Markdown.",
  },
  {
    name: "satteri-mdx-frontmatter",
    replaces: "remark-mdx-frontmatter",
    stage: "Markdown (MDAST)",
    summary: "Exposes a page's frontmatter as named MDX exports.",
  },
  {
    name: "satteri-validate-links",
    replaces: "remark-validate-links",
    stage: "Markdown (MDAST)",
    summary: "Reports links to missing files and headings at build time.",
  },
  {
    name: "satteri-citation",
    replaces: "rehype-citation",
    stage: "Markdown (MDAST)",
    summary: "Renders Pandoc-style citations and a reference list from BibTeX or CSL-JSON.",
  },
];

export const pluginBySlug = (slug: string): PluginInfo | undefined =>
  plugins.find((plugin) => plugin.name === slug);
