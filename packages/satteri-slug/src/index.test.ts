import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriSlug } from "./index.js";

const slug = (markdown: string, options?: Parameters<typeof satteriSlug>[0]) =>
  render(markdown, { hastPlugins: [satteriSlug(options)] });

describe("satteri-slug", () => {
  it("adds an id derived from the heading text", async () => {
    expect(await slug("## Hello World")).toBe(
      '<h2 id="hello-world">Hello World</h2>',
    );
  });

  it("slugs every heading level", async () => {
    expect(await slug("# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six")).toBe(
      [
        '<h1 id="one">One</h1>',
        '<h2 id="two">Two</h2>',
        '<h3 id="three">Three</h3>',
        '<h4 id="four">Four</h4>',
        '<h5 id="five">Five</h5>',
        '<h6 id="six">Six</h6>',
      ].join("\n"),
    );
  });

  it("drops punctuation and lowercases", async () => {
    expect(await slug("## Hello, World! (again)")).toBe(
      '<h2 id="hello-world-again">Hello, World! (again)</h2>',
    );
  });

  it("uses the text of nested inline markup", async () => {
    expect(await slug("## A `code` and *em* title")).toBe(
      '<h2 id="a-code-and-em-title">A <code>code</code> and <em>em</em> title</h2>',
    );
  });

  it("uses link text rather than the href", async () => {
    expect(await slug("## [Linked](https://x.com) heading")).toBe(
      '<h2 id="linked-heading"><a href="https://x.com">Linked</a> heading</h2>',
    );
  });

  it("suffixes duplicate slugs with an incrementing counter", async () => {
    expect(await slug("## Same\n\n## Same\n\n## Same")).toBe(
      [
        '<h2 id="same">Same</h2>',
        '<h2 id="same-1">Same</h2>',
        '<h2 id="same-2">Same</h2>',
      ].join("\n"),
    );
  });

  it("deduplicates headings that differ only by punctuation", async () => {
    expect(await slug("## Hello!\n\n## Hello?")).toBe(
      ['<h2 id="hello">Hello!</h2>', '<h2 id="hello-1">Hello?</h2>'].join("\n"),
    );
  });

  it("resets the duplicate counter between documents", async () => {
    const plugin = satteriSlug();
    const first = await render("## Same\n\n## Same", { hastPlugins: [plugin] });
    const second = await render("## Same\n\n## Same", { hastPlugins: [plugin] });

    expect(second).toBe(first);
  });

  it("keeps unicode letters", async () => {
    expect(await slug("## Café über naïve")).toBe(
      '<h2 id="café-über-naïve">Café über naïve</h2>',
    );
  });

  it("keeps underscores and leading digits", async () => {
    expect(await slug("## snake_case_name")).toBe(
      '<h2 id="snake_case_name">snake_case_name</h2>',
    );
    expect(await slug("## 123 numbers")).toBe(
      '<h2 id="123-numbers">123 numbers</h2>',
    );
  });

  it("produces an empty id for a heading with no sluggable text", async () => {
    expect(await slug("## !!!")).toBe('<h2 id="">!!!</h2>');
  });

  it("leaves an explicit id untouched", async () => {
    expect(
      await render("## Hello World {#custom}", {
        hastPlugins: [satteriSlug()],
        features: { headingAttributes: true },
      }),
    ).toBe('<h2 id="custom">Hello World</h2>');
  });

  it("prefixes ids when a prefix is configured", async () => {
    expect(await slug("## Hello World", { prefix: "user-content-" })).toBe(
      '<h2 id="user-content-hello-world">Hello World</h2>',
    );
  });

  it("leaves non-heading elements alone", async () => {
    expect(await slug("A paragraph")).toBe("<p>A paragraph</p>");
  });
});
