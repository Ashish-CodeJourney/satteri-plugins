import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compile } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriValidateLinks } from "./index.js";

type Summary = { url: string; reason: string };

/** The findings the plugin collected, with positions dropped for readability. */
const findingsFor = async (markdown: string, fileURL?: URL): Promise<Summary[]> => {
  const { data } = await compile(markdown, {
    mdastPlugins: [satteriValidateLinks()],
    ...(fileURL === undefined ? {} : { fileURL }),
  });
  const findings = (data as { validateLinks?: Summary[] }).validateLinks;
  return (findings ?? []).map(({ url, reason }) => ({ url, reason }));
};

/**
 * Writes a directory of files and returns the URL a document in it would have.
 * Link checking is about the filesystem, so these tests use a real one.
 */
const withFiles = async (files: Record<string, string>): Promise<(name: string) => URL> => {
  const dir = await mkdtemp(join(tmpdir(), "validate-links-"));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content, "utf8");
  }
  return (name: string) => pathToFileURL(join(dir, name));
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

  it("does not treat a thematic break as a setext underline", async () => {
    // `---` on its own, with a blank line above, is a horizontal rule.
    const markdown = "Some text\n\n---\n\n[a](#some-text)\n";

    expect(await findingsFor(markdown)).toEqual([
      { url: "#some-text", reason: 'no heading in this document has the id "some-text"' },
    ]);
  });

  it("does not mistake the close of frontmatter for a setext underline", async () => {
    // `title: x` sits directly above `---`, which is the setext underline shape.
    const markdown = "---\ntitle: x\n---\n\n[a](#title-x)\n";

    expect(await findingsFor(markdown)).toEqual([
      { url: "#title-x", reason: 'no heading in this document has the id "title-x"' },
    ]);
  });
});

describe("links to another file", () => {
  it("reports a file that does not exist", async () => {
    const url = await withFiles({ "doc.md": "" });

    expect(await findingsFor("[a](./missing.md)\n", url("doc.md"))).toEqual([
      { url: "./missing.md", reason: "./missing.md does not exist" },
    ]);
  });

  it("accepts a file that exists", async () => {
    const url = await withFiles({ "doc.md": "", "other.md": "# Hi\n" });

    expect(await findingsFor("[a](./other.md)\n", url("doc.md"))).toEqual([]);
  });

  it("resolves relative to the linking document, not the process", async () => {
    const url = await withFiles({ "doc.md": "", "other.md": "" });

    expect(await findingsFor("[a](other.md)\n", url("doc.md"))).toEqual([]);
  });

  it("reports an anchor missing from a file that does exist", async () => {
    const url = await withFiles({ "doc.md": "", "other.md": "# Present\n" });

    expect(await findingsFor("[a](./other.md#absent)\n", url("doc.md"))).toEqual([
      { url: "./other.md#absent", reason: './other.md has no heading with the id "absent"' },
    ]);
  });

  it("accepts an anchor present in another file", async () => {
    const url = await withFiles({ "doc.md": "", "other.md": "# Present\n" });

    expect(await findingsFor("[a](./other.md#present)\n", url("doc.md"))).toEqual([]);
  });

  it("does not check anchors in a file it cannot read as markdown", async () => {
    const url = await withFiles({ "doc.md": "", "logo.png": "not markdown" });

    expect(await findingsFor("[a](./logo.png#anything)\n", url("doc.md"))).toEqual([]);
  });

  it("checks nothing when the document has no fileURL", async () => {
    // Sätteri leaves fileURL undefined unless the caller supplies it, and
    // without it there is nothing to resolve a relative path against.
    expect(await findingsFor("[a](./missing.md)\n")).toEqual([]);
  });
});

describe("the ignore option", () => {
  it("skips a link the predicate rejects", async () => {
    const url = await withFiles({ "doc.md": "" });

    const { data } = await compile("[a](./missing.md)\n", {
      mdastPlugins: [satteriValidateLinks({ ignore: (link) => link === "./missing.md" })],
      fileURL: url("doc.md"),
    });

    expect(data).not.toHaveProperty("validateLinks");
  });

  it("still checks links the predicate allows", async () => {
    const url = await withFiles({ "doc.md": "" });

    const { data } = await compile("[a](./missing.md)\n", {
      mdastPlugins: [satteriValidateLinks({ ignore: () => false })],
      fileURL: url("doc.md"),
    });

    expect(data).toHaveProperty("validateLinks");
  });

  it("can ignore framework routes, which are not files on disk", async () => {
    // A static site generator maps ./about to a page, not to ./about on disk.
    // Checking the filesystem for it reports a link that is perfectly fine.
    const url = await withFiles({ "doc.md": "" });
    const extensionless = (link: string) => !/\.[a-z]+$/i.test(link.split("#")[0] ?? "");

    const { data } = await compile("[a](./about)\n[b](./missing.md)\n", {
      mdastPlugins: [satteriValidateLinks({ ignore: extensionless })],
      fileURL: url("doc.md"),
    });

    const findings = (data as { validateLinks?: Array<{ url: string }> }).validateLinks ?? [];
    expect(findings.map((f) => f.url)).toEqual(["./missing.md"]);
  });

  it("consults the predicate for anchors too", async () => {
    const { data } = await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ ignore: (link) => link.startsWith("#") })],
    });

    expect(data).not.toHaveProperty("validateLinks");
  });
});

describe("where findings are written", () => {
  it("uses the `key` option as the property on data", async () => {
    const { data } = await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ key: "brokenLinks" })],
    });

    expect(data).toHaveProperty("brokenLinks");
    expect(data).not.toHaveProperty("validateLinks");
  });

  it("writes nothing at all when every link is fine", async () => {
    const { data } = await compile("# Hi\n\n[a](#hi)\n", {
      mdastPlugins: [satteriValidateLinks()],
    });

    expect(data).not.toHaveProperty("validateLinks");
  });

  it("copies findings into Astro's frontmatter when asked", async () => {
    // Astro reads back the object it passed as `data.astro`, and returns
    // `data.astro.frontmatter` as the page's frontmatter. That is the only
    // channel from a plugin to an Astro page.
    const astro = { frontmatter: { title: "x" } };

    await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ intoAstroFrontmatter: true })],
      data: { astro },
    });

    expect(astro.frontmatter).toMatchObject({
      title: "x",
      validateLinks: [{ url: "#nope" }],
    });
  });

  it("does not touch frontmatter unless asked", async () => {
    const astro = { frontmatter: { title: "x" } };

    await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks()],
      data: { astro },
    });

    expect(astro.frontmatter).toEqual({ title: "x" });
  });

  it("survives a compile with no astro databag", async () => {
    const findings = await findingsFor("[a](#nope)\n");

    expect(findings).toHaveLength(1);
  });

  it("still reports when asked for frontmatter but there is no databag", async () => {
    // Outside Astro there is no `data.astro`, and asking for frontmatter must
    // not turn that into a crash.
    const { data } = await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ intoAstroFrontmatter: true })],
    });

    expect(data).toHaveProperty("validateLinks");
  });

  it("copes with an astro databag that has no frontmatter", async () => {
    const astro = {};

    const { data } = await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ intoAstroFrontmatter: true })],
      data: { astro },
    });

    expect(data).toHaveProperty("validateLinks");
    expect(astro).toEqual({});
  });

  it("uses the same custom key in frontmatter", async () => {
    const astro = { frontmatter: { title: "x" } };

    await compile("[a](#nope)\n", {
      mdastPlugins: [satteriValidateLinks({ key: "brokenLinks", intoAstroFrontmatter: true })],
      data: { astro },
    });

    expect(astro.frontmatter).toHaveProperty("brokenLinks");
    expect(astro.frontmatter).not.toHaveProperty("validateLinks");
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
  ])("leaves %s alone even with a document to resolve against", async (target) => {
    // The fileURL matters: without one every link returns early, and this would
    // pass whether or not the plugin knows what an external link is.
    const url = await withFiles({ "doc.md": "" });

    expect(await findingsFor(`[a](${target})\n`, url("doc.md"))).toEqual([]);
  });

  it("leaves an empty destination alone", async () => {
    const url = await withFiles({ "doc.md": "" });

    expect(await findingsFor("[a]()\n", url("doc.md"))).toEqual([]);
  });

  it("leaves a trailing empty anchor alone", async () => {
    const url = await withFiles({ "doc.md": "", "other.md": "# Present\n" });

    expect(await findingsFor("[a](./other.md#)\n", url("doc.md"))).toEqual([]);
  });
});
