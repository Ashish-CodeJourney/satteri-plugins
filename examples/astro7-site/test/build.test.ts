import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Asserts on the HTML Astro actually wrote to disk. Unit tests drive
 * `markdownToHtml` directly, so only this file proves the plugins survive a real
 * Astro build — including its own plugins running around ours.
 *
 * Run `pnpm build` in this package first; CI does that before calling vitest.
 */
const page = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const mdxPage = readFileSync(new URL("../dist/mdx/index.html", import.meta.url), "utf8");

/** Which maths renderer this build used. CI builds the site once per renderer. */
const usingMathjax = process.env["MATH"] === "mathjax";

/**
 * The base path this build was deployed under, without a trailing slash. GitHub
 * Pages serves the site from a subdirectory, so links built by the layout have
 * to be joined to it correctly — concatenating onto `import.meta.env.BASE_URL`
 * is wrong, because it carries no trailing slash.
 */
const base = (process.env["BASE"] ?? "").replace(/\/$/, "");

/**
 * Only the rendered markdown. The layout contributes its own headings and links,
 * which are not the plugins' output and must not be counted as such.
 */
const html = /<article[^>]*>([\s\S]*?)<\/article>/.exec(page)?.[1] ?? "";

const countOf = (pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("astro 7 build", () => {
  it("renders the markdown into the layout", () => {
    expect(html).not.toBe("");
  });

  describe("the layout's own links", () => {
    /** Every site-internal href in the page shell, excluding in-page anchors. */
    const internal = [...page.matchAll(/<a [^>]*href="(\/[^"]*)"/g)].map(([, href]) => href);

    it("points the nav at the mdx page", () => {
      expect(internal).toContain(`${base}/mdx/`);
    });

    it("points the wordmark and home link at the site root", () => {
      expect(internal).toContain(`${base}/`);
    });

    it("prefixes every internal link with the base path", () => {
      expect(internal.length).toBeGreaterThan(2);
      for (const href of internal) {
        expect(href.startsWith(`${base}/`)).toBe(true);
      }
    });
  });

  it("gives every content heading an id", () => {
    const headings = html.match(/<h[1-4][^>]*>/g) ?? [];

    expect(headings.length).toBeGreaterThan(5);
    expect(headings.every((heading) => heading.includes("id="))).toBe(true);
  });

  it("deduplicates ids of repeated headings", () => {
    expect(html).toContain('id="duplicate"');
    expect(html).toContain('id="duplicate-1"');
  });

  it("slugs punctuation out of heading ids", () => {
    expect(html).toContain('id="punctuation-symbols--casing"');
  });

  it("adds an anchor link to every heading that has an id", () => {
    expect(countOf(/class="anchor"/g)).toBe(countOf(/<h[1-6] [^>]*id="/g));
  });

  it("points each anchor at its own heading", () => {
    const pairs = [...html.matchAll(/<h[1-4] id="([^"]+)"[\s\S]*?href="#([^"]+)"/g)];

    expect(pairs.length).toBeGreaterThan(5);
    for (const [, id, href] of pairs) expect(href).toBe(id);
  });

  it("renders both display equations", () => {
    if (usingMathjax) {
      expect(countOf(/<mjx-container[^>]*display="true"/g)).toBe(2);
      return;
    }
    expect(countOf(/<span class="katex-display"/g)).toBe(2);
  });

  it("renders inline math inside its paragraph", () => {
    const marker = usingMathjax ? /<mjx-container/ : /<span class="katex">/;
    expect(html).toMatch(new RegExp(`<p>Inline maths flows[\\s\\S]*?${marker.source}`));
  });

  it("keeps rendered maths through the sanitiser", () => {
    // satteri-sanitize runs last, so it sees the maths markup. Its default
    // allowlist does not cover MathML or SVG, which is why the site widens it.
    expect(html).toMatch(usingMathjax ? /<mjx-container/ : /<math|<span class="katex"/);
  });

  it("turns single newlines into breaks", () => {
    expect(html).toMatch(/stays on three lines<br>/);
  });

  it("breaks only where the source asks for it", () => {
    // satteri-breaks applies to the whole document, so a hard-wrapped paragraph
    // renders a break at every wrap point. The prose is written one line per
    // paragraph to avoid that; only the three-line address above should break.
    expect(countOf(/<br\/?>/g)).toBe(2);
  });

  it("autolinks a github issue reference", () => {
    expect(html).toContain(
      'href="https://github.com/Ashish-CodeJourney/satteri-plugins/issues/1"',
    );
  });

  it("autolinks a mention and a commit sha", () => {
    expect(html).toContain('href="https://github.com/Ashish-CodeJourney"');
    expect(html).toMatch(/commit\/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"/);
    expect(html).toContain("<code>a1b2c3d</code>");
  });

  describe("the sanitiser, which runs last", () => {
    it("removes a script from the document", () => {
      expect(page).not.toMatch(/<script>alert/);
    });

    it("removes an event handler", () => {
      expect(html).not.toMatch(/\son[a-z]+=/i);
    });

    it("removes a javascript: href but keeps the link text", () => {
      expect(html).not.toContain('href="javascript');
      expect(html).toContain("a link that loses its href");
    });

    it("keeps allowed markup inside the sanitised block", () => {
      expect(html).toContain("<b>bold survives</b>");
    });

    it("does not double-escape an entity the author already wrote", () => {
      expect(html).toContain("AT&amp;T");
      expect(html).not.toContain("&#x26;amp;");
    });
  });

  describe("the mdx page", () => {
    it("exposes frontmatter to the page as an export", () => {
      expect(mdxPage).toContain("MDX frontmatter as an export");
    });

    it("renders the heading from frontmatter.title rather than literally", () => {
      expect(mdxPage).not.toContain("{frontmatter.title}");
    });
  });

  it("flags unparseable math without failing the build", () => {
    // MathJax renders its own merror container rather than throwing, so the two
    // renderers report a bad expression differently.
    if (usingMathjax) {
      expect(html).toMatch(/data-mjx-error|merror/);
      return;
    }
    expect(countOf(/class="katex-error"/g)).toBe(1);
    expect(html).toContain("style=\"color:#cc0000\"");
  });

  it("escapes quotes in the error title", () => {
    if (usingMathjax) return;
    const title = /class="katex-error" title="([^"]*)"/.exec(html)?.[1];

    expect(title).toContain("&#x27;");
  });

  it("leaves no unrendered math behind", () => {
    // The prose mentions `language-math`, so only the class itself is checked.
    expect(html).not.toContain('class="language-math');
    expect(html).not.toContain("$$");
    expect(html).not.toMatch(/data-language="plaintext"/);
  });

  it("still highlights ordinary code blocks", () => {
    expect(html).toContain('data-language="js"');
  });

  it("keeps the GFM features Sätteri provides natively", () => {
    expect(html).toContain("<table>");
    expect(html).toContain("<del>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("footnote");
  });
});
