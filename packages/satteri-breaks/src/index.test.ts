import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriBreaks } from "./index.js";

const breaks = (markdown: string) =>
  render(markdown, { mdastPlugins: [satteriBreaks()] });

/** The same markdown without the plugin, to show what actually changed. */
const plain = (markdown: string) => render(markdown);

describe("satteri-breaks", () => {
  it("turns a single newline into a break", async () => {
    expect(await breaks("line one\nline two")).toBe("<p>line one<br>\nline two</p>");
  });

  it("leaves the newline alone without the plugin", async () => {
    expect(await plain("line one\nline two")).toBe("<p>line one\nline two</p>");
  });

  it("breaks every newline in a run", async () => {
    expect(await breaks("a\nb\nc")).toBe("<p>a<br>\nb<br>\nc</p>");
  });

  it("keeps an existing hard break made with trailing spaces", async () => {
    expect(await breaks("a  \nb")).toBe("<p>a<br>\nb</p>");
  });

  it("keeps an existing hard break made with a backslash", async () => {
    expect(await breaks("a\\\nb")).toBe("<p>a<br>\nb</p>");
  });

  it("does not join separate paragraphs", async () => {
    expect(await breaks("p1 line1\np1 line2\n\np2")).toBe(
      "<p>p1 line1<br>\np1 line2</p>\n<p>p2</p>",
    );
  });

  it("breaks inside emphasis", async () => {
    expect(await breaks("*a\nb*")).toBe("<p><em>a<br>\nb</em></p>");
  });

  it("breaks inside link text", async () => {
    expect(await breaks("[a\nb](https://x.com)")).toBe(
      '<p><a href="https://x.com">a<br>\nb</a></p>',
    );
  });

  it("breaks inside a list item", async () => {
    expect(await breaks("- a\n  b")).toContain("a<br>\nb");
  });

  it("breaks inside a blockquote", async () => {
    expect(await breaks("> a\n> b")).toContain("a<br>\nb");
  });

  it("handles CRLF line endings", async () => {
    expect(await breaks("a\r\nb")).toBe("<p>a<br>\nb</p>");
  });

  describe("leaves alone what markdown already separates", () => {
    it("does not break a heading from the text after it", async () => {
      expect(await breaks("# head\ntext")).toBe("<h1>head</h1>\n<p>text</p>");
    });

    it("does not touch fenced code", async () => {
      expect(await breaks("```\na\nb\n```")).toBe("<pre><code>a\nb\n</code></pre>");
    });

    it("does not touch inline code", async () => {
      expect(await breaks("`a\nb`")).toBe("<p><code>a b</code></p>");
    });

    it("does not touch table structure", async () => {
      const html = await breaks("| a |\n| - |\n| 1 |");

      expect(html).not.toContain("<br>");
      expect(html).toContain("<table>");
    });

    it("ignores a trailing newline", async () => {
      expect(await breaks("a\n")).toBe("<p>a</p>");
    });

    it("ignores a leading newline", async () => {
      expect(await breaks("\na")).toBe("<p>a</p>");
    });

    it("does not add a break between paragraphs separated by blank lines", async () => {
      expect(await breaks("a\n\n\nb")).toBe("<p>a</p>\n<p>b</p>");
    });

    it("leaves text with no newline untouched", async () => {
      expect(await breaks("just one line")).toBe("<p>just one line</p>");
    });
  });
});
