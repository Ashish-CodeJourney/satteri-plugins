import { render } from "@satteri-plugins/test-kit";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { satteriKatex } from "./index.js";

type Options = Parameters<typeof satteriKatex>[0];

const math = (markdown: string, options?: Options) =>
  render(markdown, {
    mdastPlugins: [satteriKatex(options)],
    features: { math: true },
  });

describe("satteri-katex", () => {
  it("renders inline math exactly as KaTeX does", async () => {
    const expected = katex.renderToString("x^2", { displayMode: false });

    expect(await math("Inline $x^2$ here.")).toBe(
      `<p>Inline ${expected} here.</p>`,
    );
  });

  it("renders display math in display mode", async () => {
    const expected = katex.renderToString("\\frac{a}{b}", { displayMode: true });

    expect(await math("$$\n\\frac{a}{b}\n$$")).toBe(expected);
  });

  it("leaves no code or pre wrapper behind", async () => {
    const html = await math("Inline $x^2$.\n\n$$\na\n$$");

    expect(html).not.toContain("<code");
    expect(html).not.toContain("<pre");
  });

  it("wraps display math in katex-display", async () => {
    expect(await math("$$\na\n$$")).toContain('<span class="katex-display">');
  });

  it("leaves ordinary code blocks alone", async () => {
    expect(await math("```js\nconst a = 1;\n```")).toBe(
      '<pre><code class="language-js">const a = 1;\n</code></pre>',
    );
  });

  it("leaves inline code alone", async () => {
    expect(await math("Use `let` here.")).toBe("<p>Use <code>let</code> here.</p>");
  });

  it("renders invalid math as a katex-error span instead of throwing", async () => {
    const html = await math("$\\frac{a}$");

    expect(html).toContain('class="katex-error"');
    expect(html).toContain("style=\"color:#cc0000\"");
    expect(html).toContain("\\frac{a}");
  });

  it("colours errors with errorColor", async () => {
    expect(await math("$\\frac{a}$", { errorColor: "#0f0" })).toContain(
      'style="color:#0f0"',
    );
  });

  it("escapes markup in the source left behind by a failure", async () => {
    // `\frac{a}` fails to parse, so the whole expression — markup and all —
    // is echoed back into the page.
    const html = await math("$<img src=x onerror=alert(1)>\\frac{a}$");

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("escapes markup in the error title", async () => {
    // KaTeX quotes the offending source in its message, so the message carries
    // whatever the author wrote straight into an attribute value.
    const html = await math('$<img src=x>"\\frac{a}$');
    const title = /title="([^"]*)"/.exec(html)?.[1];

    expect(title).toBeDefined();
    // KaTeX truncates its message, so only the tail of the source survives.
    expect(title).toContain("src=x&gt;");
    expect(title).toContain("&quot;");
    expect(html).not.toContain("<img");
  });

  it("expands macros", async () => {
    const expected = katex.renderToString("\\RR", {
      displayMode: false,
      macros: { "\\RR": "\\mathbb{R}" },
    });

    expect(await math("$\\RR$", { macros: { "\\RR": "\\mathbb{R}" } })).toBe(
      `<p>${expected}</p>`,
    );
  });

  it("passes other KaTeX options through", async () => {
    const expected = katex.renderToString("x", {
      displayMode: false,
      output: "mathml",
    });

    expect(await math("$x$", { output: "mathml" })).toBe(`<p>${expected}</p>`);
  });

  it("does nothing when the math feature is off", async () => {
    expect(
      await render("Inline $x^2$ here.", { mdastPlugins: [satteriKatex()] }),
    ).toBe("<p>Inline $x^2$ here.</p>");
  });
});
