import { compile } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriValidateLinks } from "./index.js";

/** The findings the plugin collected, with positions dropped for readability. */
const findingsFor = async (markdown: string): Promise<Array<{ url: string; reason: string }>> => {
  const { data } = await compile(markdown, { mdastPlugins: [satteriValidateLinks()] });
  const findings = (data as { validateLinks?: Array<{ url: string; reason: string }> })
    .validateLinks;
  return (findings ?? []).map(({ url, reason }) => ({ url, reason }));
};

describe("links to a heading in the same document", () => {
  it("reports an anchor with no matching heading", async () => {
    expect(await findingsFor("# Hello\n\n[a](#nope)\n")).toEqual([
      { url: "#nope", reason: 'no heading in this document has the id "nope"' },
    ]);
  });

  it("accepts an anchor that matches a heading", async () => {
    expect(await findingsFor("# Hello there\n\n[a](#hello-there)\n")).toEqual([]);
  });

  it("accepts an anchor pointing at a heading further down the document", async () => {
    // Sätteri visits in source order, so the heading has not been seen yet.
    expect(await findingsFor("[a](#later)\n\n## Later\n")).toEqual([]);
  });

  it("numbers duplicate headings the way the renderer does", async () => {
    const markdown = "## Same\n\n## Same\n\n[a](#same)\n[b](#same-1)\n[c](#same-2)\n";

    expect(await findingsFor(markdown)).toEqual([
      { url: "#same-2", reason: 'no heading in this document has the id "same-2"' },
    ]);
  });

  it("decodes a percent-encoded anchor before comparing", async () => {
    expect(await findingsFor("# Über\n\n[a](#%C3%BCber)\n")).toEqual([]);
  });

  it("ignores a hash that points at nothing in particular", async () => {
    expect(await findingsFor("[top](#)\n")).toEqual([]);
  });

  it("does not count a heading inside a fenced code block", async () => {
    const markdown = "```md\n# Not a heading\n```\n\n[a](#not-a-heading)\n";

    expect(await findingsFor(markdown)).toEqual([
      { url: "#not-a-heading", reason: 'no heading in this document has the id "not-a-heading"' },
    ]);
  });

  it("counts a setext heading", async () => {
    expect(await findingsFor("Underlined\n==========\n\n[a](#underlined)\n")).toEqual([]);
  });

  it("does not mistake the close of frontmatter for a setext underline", async () => {
    // `title: x` sits directly above `---`, which is the setext underline shape.
    const markdown = "---\ntitle: x\n---\n\n[a](#title-x)\n";

    expect(await findingsFor(markdown)).toEqual([
      { url: "#title-x", reason: 'no heading in this document has the id "title-x"' },
    ]);
  });
});

describe("links it has no business checking", () => {
  it.each([
    ["https://example.com/nope"],
    ["http://example.com/nope"],
    ["//example.com/nope"],
    ["mailto:nobody@example.com"],
    ["tel:+1"],
    ["ftp://example.com/x"],
  ])("leaves %s alone", async (url) => {
    expect(await findingsFor(`[a](${url})\n`)).toEqual([]);
  });
});
