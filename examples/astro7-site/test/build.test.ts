import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Asserts on the HTML Astro actually wrote to disk. Unit tests drive
 * `markdownToHtml` directly, so only this file proves the plugins survive a real
 * Astro build — including its own plugins running around ours.
 *
 * Run `pnpm build` in this package first; CI does that before calling vitest.
 */
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

const countOf = (pattern: RegExp) => html.match(pattern)?.length ?? 0;

describe("astro 7 build", () => {
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
    expect(countOf(/<span class="katex-display"/g)).toBe(2);
  });

  it("renders inline math inside its paragraph", () => {
    expect(html).toMatch(/<p>Inline maths flows[\s\S]*?<span class="katex">/);
  });

  it("flags unparseable math without failing the build", () => {
    expect(countOf(/class="katex-error"/g)).toBe(1);
    expect(html).toContain("style=\"color:#cc0000\"");
  });

  it("escapes quotes in the error title", () => {
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
