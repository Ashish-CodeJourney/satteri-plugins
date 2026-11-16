import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriCitation } from "./index.js";
import type { SatteriCitationOptions } from "./index.js";

const bib = new URL("./fixtures/refs.bib", import.meta.url).pathname;
const json = new URL("./fixtures/refs.json", import.meta.url).pathname;
const markup = new URL("./fixtures/markup.json", import.meta.url).pathname;

const cite = (
  markdown: string,
  options: Partial<SatteriCitationOptions> = {},
) =>
  render(markdown, {
    mdastPlugins: [satteriCitation({ bibliography: bib, ...options })],
  });

const NASH_ENTRY =
  '<div class="csl-entry" id="bib-nash1950">Nash, J. (1950). Equilibrium points in n-person games. <i>Proceedings of the National Academy of Sciences</i>, <i>36</i>(1), 48–49.</div>';
const SMITH_ENTRY =
  '<div class="csl-entry" id="bib-smith2001">Smith, J., &#38; Doe, A. (2001). <i>A Book Title</i>. Penguin.</div>';
const refs = (...entries: string[]) =>
  [
    '\n<div id="refs" class="references csl-bib-body">',
    ...entries.map((entry) => `  ${entry}`),
    "</div>",
  ].join("\n");

describe("satteri-citation", () => {
  it("renders a bracketed citation as author-date text and appends the reference list", async () => {
    expect(await cite("My text [@Nash1950].")).toBe(
      [
        '<p>My text <span id="citation--nash1950--1">(Nash, 1950)</span>.</p>',
        refs(NASH_ENTRY),
      ].join(""),
    );
  });

  it("groups several keys into one span, sorted by author", async () => {
    expect(await cite("[@Nash1950; @Smith2001]")).toBe(
      [
        '<p><span id="citation--nash1950--smith2001--1">(Nash, 1950; Smith &amp; Doe, 2001)</span></p>',
        refs(NASH_ENTRY, SMITH_ENTRY),
      ].join(""),
    );
  });

  it("sorts a cluster by author whatever order the keys were written in", async () => {
    expect(await cite("[@Smith2001; @Nash1950]")).toBe(
      [
        '<p><span id="citation--smith2001--nash1950--1">(Nash, 1950; Smith &amp; Doe, 2001)</span></p>',
        refs(NASH_ENTRY, SMITH_ENTRY),
      ].join(""),
    );
  });

  it("adds a locator inside the parentheses", async () => {
    expect(await cite("[@Nash1950, p. 3]")).toBe(
      [
        '<p><span id="citation--nash1950--1">(Nash, 1950, p. 3)</span></p>',
        refs(NASH_ENTRY),
      ].join(""),
    );
  });

  it("labels a locator by its abbreviation", async () => {
    expect(await cite("[@Nash1950, ch. 2]")).toBe(
      ['<p><span id="citation--nash1950--1">(Nash, 1950, Chapter 2)</span></p>', refs(NASH_ENTRY)].join(""),
    );
  });

  it("keeps a suffix that is not a locator as written", async () => {
    expect(await cite("[@Nash1950, see also the appendix]")).toBe(
      ['<p><span id="citation--nash1950--1">(Nash, 1950 see also the appendix)</span></p>', refs(NASH_ENTRY)].join(""),
    );
  });

  it("adds a prefix before the author", async () => {
    expect(await cite("[see @Nash1950]")).toBe(
      ['<p><span id="citation--nash1950--1">(see Nash, 1950)</span></p>', refs(NASH_ENTRY)].join(""),
    );
  });

  it("renders a narrative citation as author followed by year", async () => {
    expect(await cite("@Smith2001 wrote.")).toBe(
      [
        '<p><span id="citation--smith2001--1">Smith &amp; Doe (2001)</span> wrote.</p>',
        refs(SMITH_ENTRY),
      ].join(""),
    );
  });

  it("numbers every citation in the document in order", async () => {
    expect(await cite("[@Nash1950] and [@Nash1950]")).toBe(
      [
        '<p><span id="citation--nash1950--1">(Nash, 1950)</span> and <span id="citation--nash1950--2">(Nash, 1950)</span></p>',
        refs(NASH_ENTRY),
      ].join(""),
    );
  });

  it("lists the reference list in author order, not citation order", async () => {
    expect(await cite("[@Smith2001] then [@Nash1950]")).toBe(
      [
        '<p><span id="citation--smith2001--1">(Smith &amp; Doe, 2001)</span> then <span id="citation--nash1950--2">(Nash, 1950)</span></p>',
        refs(NASH_ENTRY, SMITH_ENTRY),
      ].join(""),
    );
  });

  it("leaves a bracket with an unknown key as literal text and adds no reference list", async () => {
    expect(await cite("Unknown [@nope].")).toBe("<p>Unknown [@nope].</p>");
  });

  it("leaves a whole cluster literal when any key is unknown", async () => {
    expect(await cite("[@Nash1950; @nope]")).toBe("<p>[@Nash1950; @nope]</p>");
  });

  it("matches keys case-sensitively", async () => {
    expect(await cite("[@nash1950]")).toBe("<p>[@nash1950]</p>");
  });

  it("leaves a narrative @key with an unknown key as literal text", async () => {
    expect(await cite("@nope said so.")).toBe("<p>@nope said so.</p>");
  });

  it("leaves brackets that are not citations alone, including @keys inside them", async () => {
    expect(await cite("[see] and [] and [a; @Nash1950]")).toBe(
      "<p>[see] and [] and [a; @Nash1950]</p>",
    );
  });

  it("reads a bare number as a page and pp. as pages", async () => {
    expect(await cite("[@Nash1950, 3]")).toBe(
      ['<p><span id="citation--nash1950--1">(Nash, 1950, p. 3)</span></p>', refs(NASH_ENTRY)].join(""),
    );
    expect(await cite("[@Nash1950, pp. 48-49]")).toBe(
      ['<p><span id="citation--nash1950--1">(Nash, 1950, pp. 48–49)</span></p>', refs(NASH_ENTRY)].join(""),
    );
  });

  it("leaves code blocks untouched", async () => {
    expect(await cite("```\n[@Nash1950]\n```")).toBe("<pre><code>[@Nash1950]\n</code></pre>");
  });

  it("leaves raw HTML preformatted text untouched", async () => {
    expect(await cite("<pre>[@Nash1950]</pre>")).toBe("<pre>[@Nash1950]</pre>");
  });

  it("does not treat an @ inside a word as a citation", async () => {
    expect(await cite("Email me@Nash1950 x")).toBe("<p>Email me@Nash1950 x</p>");
  });

  it("adds no reference list when nothing is cited", async () => {
    expect(await cite("Plain text.")).toBe("<p>Plain text.</p>");
  });

  it("leaves code spans and code blocks untouched", async () => {
    expect(await cite("Code `[@Nash1950]` here.")).toBe(
      "<p>Code <code>[@Nash1950]</code> here.</p>",
    );
  });

  it("handles keys containing punctuation and non-ASCII authors", async () => {
    expect(await cite("[@smith:2002-x]")).toBe(
      [
        '<p><span id="citation--smith:2002-x--1">(Müller, 2002)</span></p>',
        refs('<div class="csl-entry" id="bib-smith:2002-x">Müller, K. (2002). Colon key. <i>J</i>.</div>'),
      ].join(""),
    );
  });

  it("processes citations inside headings and emphasis", async () => {
    expect(await cite("# Head [@Nash1950]")).toBe(
      [
        '<h1>Head <span id="citation--nash1950--1">(Nash, 1950)</span></h1>',
        refs(NASH_ENTRY),
      ].join(""),
    );
    expect(await cite("*em [@Nash1950]*")).toBe(
      [
        '<p><em>em <span id="citation--nash1950--1">(Nash, 1950)</span></em></p>',
        refs(NASH_ENTRY),
      ].join(""),
    );
  });

  it("omits the reference list when suppressBibliography is set", async () => {
    expect(await cite("[@Nash1950]", { suppressBibliography: true })).toBe(
      '<p><span id="citation--nash1950--1">(Nash, 1950)</span></p>',
    );
  });

  it("reads CSL-JSON bibliographies as well as BibTeX", async () => {
    expect(await cite("[@Smith2001]", { bibliography: json })).toBe(
      [
        '<p><span id="citation--smith2001--1">(Smith &amp; Doe, 2001)</span></p>',
        refs(SMITH_ENTRY),
      ].join(""),
    );
  });

  it("escapes markup in a name written into the text", async () => {
    expect(await cite("[@Markup2020] and @Markup2020", { bibliography: markup })).toContain(
      '<span id="citation--markup2020--1">(Ray&lt;x&gt;, 2020)</span> and <span id="citation--markup2020--2">Ray&lt;x&gt; (2020)</span>',
    );
  });

  it("merges several bibliography files", async () => {
    expect(await cite("[@Nash1950] [@Smith2001]", { bibliography: [bib, json] })).toBe(
      [
        '<p><span id="citation--nash1950--1">(Nash, 1950)</span> <span id="citation--smith2001--2">(Smith &amp; Doe, 2001)</span></p>',
        refs(NASH_ENTRY, SMITH_ENTRY),
      ].join(""),
    );
  });

  it("fails when a bibliography file cannot be read", () => {
    expect(() => satteriCitation({ bibliography: "does-not-exist.bib" })).toThrow();
  });
});
