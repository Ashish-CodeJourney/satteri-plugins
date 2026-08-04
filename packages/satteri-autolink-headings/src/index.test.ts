import { render } from "@satteri-plugins/test-kit";
import { satteriSlug } from "satteri-slug";
import { describe, expect, it } from "vitest";
import { satteriAutolinkHeadings } from "./index.js";

type Options = Parameters<typeof satteriAutolinkHeadings>[0];

const link = (markdown: string, options?: Options) =>
  render(markdown, {
    hastPlugins: [satteriSlug(), satteriAutolinkHeadings(options)],
  });

const text = (value: string) => ({ type: "text" as const, value });

describe("satteri-autolink-headings", () => {
  it("prepends a hidden icon link by default", async () => {
    expect(await link("## Hello World")).toBe(
      '<h2 id="hello-world"><a aria-hidden="true" tabindex="-1" href="#hello-world">' +
        '<span class="icon icon-link"></span></a>Hello World</h2>',
    );
  });

  it("appends the link with behavior append", async () => {
    expect(await link("## Hello World", { behavior: "append" })).toBe(
      '<h2 id="hello-world">Hello World<a aria-hidden="true" tabindex="-1" href="#hello-world">' +
        '<span class="icon icon-link"></span></a></h2>',
    );
  });

  it("wraps the heading children with behavior wrap", async () => {
    expect(await link("## Hello World", { behavior: "wrap" })).toBe(
      '<h2 id="hello-world"><a href="#hello-world">Hello World</a></h2>',
    );
  });

  it("keeps nested markup when wrapping", async () => {
    expect(await link("## A `code` title", { behavior: "wrap" })).toBe(
      '<h2 id="a-code-title"><a href="#a-code-title">A <code>code</code> title</a></h2>',
    );
  });

  it("appends content inside the link when wrapping", async () => {
    expect(
      await link("## Hello World", { behavior: "wrap", content: text("#") }),
    ).toBe('<h2 id="hello-world"><a href="#hello-world">Hello World#</a></h2>');
  });

  it("inserts a sibling link with behavior before", async () => {
    expect(await link("## Hello World", { behavior: "before" })).toBe(
      '<a href="#hello-world"><span class="icon icon-link"></span></a>' +
        '<h2 id="hello-world">Hello World</h2>',
    );
  });

  it("inserts a sibling link with behavior after", async () => {
    expect(await link("## Hello World", { behavior: "after" })).toBe(
      '<h2 id="hello-world">Hello World</h2>' +
        '<a href="#hello-world"><span class="icon icon-link"></span></a>',
    );
  });

  it("uses custom text content", async () => {
    expect(await link("## Hello World", { content: text("#") })).toBe(
      '<h2 id="hello-world"><a aria-hidden="true" tabindex="-1" href="#hello-world">#</a>' +
        "Hello World</h2>",
    );
  });

  it("uses custom element content", async () => {
    expect(
      await link("## Hello World", {
        content: {
          type: "element",
          tagName: "span",
          properties: { className: ["icon"] },
          children: [text("#")],
        },
      }),
    ).toBe(
      '<h2 id="hello-world"><a aria-hidden="true" tabindex="-1" href="#hello-world">' +
        '<span class="icon">#</span></a>Hello World</h2>',
    );
  });

  it("derives content from the heading when given a function", async () => {
    expect(
      await link("## Hello World", {
        content: (node) => text(`!${node.tagName}`),
      }),
    ).toBe(
      '<h2 id="hello-world"><a aria-hidden="true" tabindex="-1" href="#hello-world">!h2</a>' +
        "Hello World</h2>",
    );
  });

  it("replaces the default link properties rather than merging them", async () => {
    expect(
      await link("## Hello World", { properties: { className: ["anchor"] } }),
    ).toBe(
      '<h2 id="hello-world"><a class="anchor" href="#hello-world">' +
        '<span class="icon icon-link"></span></a>Hello World</h2>',
    );
  });

  it("derives link properties from the heading when given a function", async () => {
    expect(
      await link("## Hello World", {
        properties: (node) => ({ className: [`p-${node.tagName}`] }),
      }),
    ).toBe(
      '<h2 id="hello-world"><a class="p-h2" href="#hello-world">' +
        '<span class="icon icon-link"></span></a>Hello World</h2>',
    );
  });

  it("adds extra properties to the heading itself", async () => {
    expect(
      await link("## Hello World", {
        content: text("#"),
        headingProperties: { className: ["heading"] },
      }),
    ).toBe(
      '<h2 id="hello-world" class="heading">' +
        '<a aria-hidden="true" tabindex="-1" href="#hello-world">#</a>Hello World</h2>',
    );
  });

  it("wraps link and heading in a group element", async () => {
    expect(
      await link("## Hello World", {
        behavior: "before",
        content: text("#"),
        group: {
          type: "element",
          tagName: "div",
          properties: { className: ["g"] },
          children: [],
        },
      }),
    ).toBe(
      '<div class="g"><a href="#hello-world">#</a>' +
        '<h2 id="hello-world">Hello World</h2></div>',
    );
  });

  it("links every heading level by default", async () => {
    expect(await link("## A\n\n### B", { content: text("#") })).toBe(
      [
        '<h2 id="a"><a aria-hidden="true" tabindex="-1" href="#a">#</a>A</h2>',
        '<h3 id="b"><a aria-hidden="true" tabindex="-1" href="#b">#</a>B</h3>',
      ].join("\n"),
    );
  });

  it("links h6 as well as the lower levels", async () => {
    expect(await link("###### Six", { content: text("#") })).toBe(
      '<h6 id="six"><a aria-hidden="true" tabindex="-1" href="#six">#</a>Six</h6>',
    );
  });

  it("skips a heading whose slug is empty", async () => {
    expect(await link("## !!!", { content: text("#") })).toBe(
      '<h2 id="">!!!</h2>',
    );
  });

  it("only links the heading levels listed in test", async () => {
    expect(await link("# One\n\n## Two", { content: text("#"), test: ["h2"] })).toBe(
      [
        '<h1 id="one">One</h1>',
        '<h2 id="two"><a aria-hidden="true" tabindex="-1" href="#two">#</a>Two</h2>',
      ].join("\n"),
    );
  });

  it("skips headings without an id", async () => {
    expect(
      await render("## Hello World", {
        hastPlugins: [satteriAutolinkHeadings()],
      }),
    ).toBe("<h2>Hello World</h2>");
  });
});
