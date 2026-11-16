import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Asserts on the HTML Astro actually wrote to disk. Unit tests drive
 * `markdownToHtml` directly, so only this file proves the plugins survive a real
 * Astro build — including its own plugins running around ours.
 *
 * Run `pnpm build` in this package first; CI does that before calling vitest.
 */
const page = readFileSync(new URL("../dist/demo/index.html", import.meta.url), "utf8");
const landing = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
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

const PLUGINS = [
  "satteri-slug",
  "satteri-autolink-headings",
  "satteri-katex",
  "satteri-mathjax",
  "satteri-breaks",
  "satteri-github",
  "satteri-sanitize",
  "satteri-mdx-frontmatter",
  "satteri-validate-links",
  "satteri-citation",
];

const pluginPage = (name: string) =>
  readFileSync(new URL(`../dist/plugins/${name}/index.html`, import.meta.url), "utf8");

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

  describe("satteri-validate-links, reporting through frontmatter", () => {
    // Astro reads only `data.astro` off the compile result and returns a fixed
    // shape from it, so a plugin's own data key never reaches the page. This is
    // the only channel there is, and only a real build proves it works.
    const banner = /<aside class="broken-links"[^>]*>([\s\S]*?)<\/aside>/.exec(page)?.[1] ?? "";

    it("surfaces findings on the page that has a broken link", () => {
      expect(banner).not.toBe("");
    });

    it("names the link that does not resolve", () => {
      expect(banner).toContain("#no-such-heading");
      expect(banner).toContain("no heading in this document has the id");
    });

    it("reports only the deliberately broken link", () => {
      expect(banner).toMatch(/\b1 broken link\b/);
      // Astro stamps its own attributes onto every tag, so the match has to
      // allow them.
      expect(banner.match(/<li[^>]*>/g) ?? []).toHaveLength(1);
    });

    it("leaves a page with no broken links without a banner", () => {
      expect(mdxPage).not.toContain('class="broken-links"');
    });

    it("does not fail the build over a broken link", () => {
      // The page still rendered. Whether a broken link is fatal is the site's
      // decision, not the plugin's.
      expect(html).toContain("Broken links");
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
  describe("citations", () => {
    it("renders each citation as a span with author-date text", () => {
      expect(html).toMatch(/<span id="user-content-citation--nash1950--\d+">\(Nash, 1950\)<\/span>/);
      expect(html).toContain('<span id="user-content-citation--nash1950--smith2001--');
    });

    it("renders a narrative citation as author followed by year", () => {
      expect(html).toContain("Smith &amp; Doe (2001)");
    });

    it("lists each cited work once in the reference list", () => {
      expect(html).toContain('<div id="user-content-refs">');
      expect(countOf(/id="user-content-bib-nash1950"/g)).toBe(1);
      expect(countOf(/id="user-content-bib-smith2001"/g)).toBe(1);
    });
  });

  describe("landing page", () => {
    it("lists every plugin as a card linking to its page", () => {
      expect(landing.match(/class="plugin-card"/g)?.length).toBe(PLUGINS.length);
      for (const name of PLUGINS) {
        expect(landing).toContain(`href="plugins/${name}/"`);
      }
    });

    it("gives social previews an absolute image and card type", () => {
      expect(landing).toContain(
        `<meta property="og:image" content="https://satteri-plugins.js.org${base}/og.png"`,
      );
      expect(landing).toContain('<meta name="twitter:card" content="summary_large_image"');
      expect(landing).toContain(`<link rel="canonical" href="https://satteri-plugins.js.org${base}/"`);
    });

    it("ships the social card image it points at", () => {
      expect(readFileSync(new URL("../dist/og.png", import.meta.url)).subarray(1, 4).toString()).toBe("PNG");
    });
  });

  describe("plugin pages", () => {
    it("has a page for every plugin in the monorepo", () => {
      for (const name of PLUGINS) {
        expect(pluginPage(name)).toContain(`https://www.npmjs.com/package/${name}`);
      }
    });

    it("renders the README body from the package", () => {
      expect(pluginPage("satteri-slug")).toContain("GitHub slugging");
    });

    it("points links between plugins at their pages", () => {
      expect(pluginPage("satteri-autolink-headings")).toContain(`href="${base}/plugins/satteri-slug/"`);
      for (const name of PLUGINS) {
        expect(pluginPage(name)).not.toContain("../satteri-");
      }
    });

    it("gives each plugin page its own social title", () => {
      expect(pluginPage("satteri-citation")).toContain('<meta property="og:title" content="satteri-citation"');
    });
  });
});
