import { render } from "@satteri-plugins/test-kit";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { describe, expect, it } from "vitest";
import { satteriMathjax } from "./index.js";

type Options = Parameters<typeof satteriMathjax>[0];

const math = (markdown: string, options?: Options) =>
  render(markdown, {
    mdastPlugins: [satteriMathjax(options)],
    features: { math: true },
  });

/**
 * MathJax rendered outside the plugin, for tests that want exactness rather
 * than structure. A fresh `MathDocument` per call keeps the `MJX-n` id counter
 * at 1, matching what the plugin produces for the first expression in a
 * document.
 */
const mathjaxSvg = (source: string, display: boolean): string => {
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const document = mathjax.document("", {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({}),
  });

  return adaptor.outerHTML(document.convert(source, { display }));
};

const styleTags = (html: string): readonly string[] =>
  html.match(/<style\b/g) ?? [];

describe("satteri-mathjax", () => {
  it("renders inline math exactly as MathJax does", async () => {
    const html = await math("Inline $x^2$ here.", { styleSheet: false });

    expect(html).toBe(`<p>Inline ${mathjaxSvg("x^2", false)} here.</p>`);
  });

  it("renders display math exactly as MathJax does", async () => {
    const html = await math("$$\n\\frac{a}{b}\n$$", { styleSheet: false });

    expect(html).toBe(mathjaxSvg("\\frac{a}{b}", true));
  });

  it("marks display math with the display attribute", async () => {
    expect(await math("$$\na\n$$", { styleSheet: false })).toContain(
      '<mjx-container class="MathJax" jax="SVG" display="true">',
    );
  });

  it("does not mark inline math as display", async () => {
    const html = await math("$a$", { styleSheet: false });

    expect(html).toContain("<mjx-container");
    expect(html).not.toContain('display="true"');
  });

  it("leaves no code or pre wrapper behind", async () => {
    const html = await math("Inline $x^2$.\n\n$$\na\n$$");

    expect(html).not.toContain("<code");
    expect(html).not.toContain("<pre");
  });

  it("leaves ordinary code blocks alone", async () => {
    expect(await math("```js\nconst a = 1;\n```")).toBe(
      '<pre><code class="language-js">const a = 1;\n</code></pre>',
    );
  });

  it("leaves inline code alone", async () => {
    expect(await math("Use `let` here.")).toBe(
      "<p>Use <code>let</code> here.</p>",
    );
  });

  it("does nothing when the math feature is off", async () => {
    expect(
      await render("Inline $x^2$ here.", { mdastPlugins: [satteriMathjax()] }),
    ).toBe("<p>Inline $x^2$ here.</p>");
  });

  it("restarts the MathJax id counter for every document", async () => {
    const first = await math("$x^2$", { styleSheet: false });
    const second = await math("$x^2$", { styleSheet: false });

    expect(first).toContain("MJX-1-TEX-I-1D465");
    expect(second).toBe(first);
  });

  it("keeps documents independent when one plugin is reused", async () => {
    // The realistic case: a single `satteriMathjax()` sits in a config and
    // compiles every page, so per-document state must not be built into it.
    const plugin = satteriMathjax();
    const compile = (markdown: string) =>
      render(markdown, { mdastPlugins: [plugin], features: { math: true } });

    const first = await compile("$x^2$");
    const second = await compile("$x^2$");

    expect(second).toBe(first);
    expect(styleTags(second)).toHaveLength(1);
  });

  it("gives each expression in one document its own ids", async () => {
    const html = await math("$a$ and $b$", { styleSheet: false });

    expect(html).toContain("MJX-1-TEX-I-1D44E");
    expect(html).toContain("MJX-2-TEX-I-1D44F");
  });

  describe("stylesheet", () => {
    it("emits the MathJax stylesheet once per document", async () => {
      const html = await math("$a$ and $b$\n\n$$\nc\n$$");

      expect(styleTags(html)).toHaveLength(1);
      expect(html).toContain('mjx-container[jax="SVG"]');
    });

    it("emits no stylesheet for a document without math", async () => {
      expect(styleTags(await math("Just prose."))).toHaveLength(0);
    });

    it("emits the stylesheet again for the next document", async () => {
      await math("$a$");

      expect(styleTags(await math("$b$"))).toHaveLength(1);
    });

    it("omits the stylesheet when styleSheet is false", async () => {
      expect(styleTags(await math("$a$", { styleSheet: false }))).toHaveLength(
        0,
      );
    });
  });

  describe("tex options", () => {
    it("expands macros", async () => {
      const html = await math("$\\RR$", {
        styleSheet: false,
        tex: { macros: { RR: "\\mathbb{R}" } },
      });

      expect(html).toContain("MJX-1-TEX-D-211D");
    });

    it("renders unconfigured macros as an error instead", async () => {
      expect(await math("$\\RR$", { styleSheet: false })).not.toContain(
        "TEX-D-211D",
      );
    });
  });

  describe("svg options", () => {
    it("passes svg options to the output jax", async () => {
      const html = await math("$x$", { styleSheet: false, svg: { scale: 2 } });

      expect(html).toContain(
        '<mjx-container class="MathJax" jax="SVG" style="font-size: 200%;">',
      );
    });
  });

  describe("invalid math", () => {
    it("renders MathJax's own error markup rather than throwing", async () => {
      const html = await math("$\\frac{a}$", { styleSheet: false });

      expect(html).toContain('data-mjx-error="Missing argument for \\frac"');
      expect(html).toContain("<mjx-container");
    });

    it("escapes markup carried in the failing source", async () => {
      const html = await math("$<img src=x onerror=alert(1)>\\frac{a}$", {
        styleSheet: false,
      });

      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });
  });

  describe("render failure", () => {
    // MathJax turns a TeX mistake into `merror` output rather than an
    // exception, so a thrown `formatError` is the way to reach the fallback.
    const exploding: Options = {
      styleSheet: false,
      tex: {
        formatError: () => {
          throw new Error('boom "quoted" <b>');
        },
      },
    };

    it("falls back to an error span instead of breaking the build", async () => {
      const html = await math("$\\frac{a}$", exploding);

      expect(html).toContain('class="mathjax-error"');
      expect(html).toContain('style="color:#cc0000"');
      expect(html).toContain("\\frac{a}");
    });

    it("colours the fallback with errorColor", async () => {
      const html = await math("$\\frac{a}$", {
        ...exploding,
        errorColor: "#0f0",
      });

      expect(html).toContain('style="color:#0f0"');
    });

    it("escapes markup in the source left behind by a failure", async () => {
      const html = await math(
        "$<img src=x onerror=alert(1)>\\frac{a}$",
        exploding,
      );

      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });

    it("escapes markup and quotes in the error title", async () => {
      const html = await math("$\\frac{a}$", exploding);
      const title = /title="([^"]*)"/.exec(html)?.[1];

      expect(title).toBeDefined();
      expect(title).toContain("&quot;quoted&quot;");
      expect(title).toContain("&lt;b&gt;");
      expect(html).not.toContain("<b>");
    });

    it("keeps rendering the rest of the document", async () => {
      const html = await math("Before $\\frac{a}$ after.", exploding);

      expect(html).toContain("Before ");
      expect(html).toContain(" after.");
    });
  });

  describe("chtml output", () => {
    const fontURL = "https://cdn.example/fonts";

    it("renders CHTML containers", async () => {
      const html = await math("$x^2$", {
        output: "chtml",
        chtml: { fontURL },
        styleSheet: false,
      });

      expect(html).toContain('<mjx-container class="MathJax" jax="CHTML">');
      expect(html).not.toContain("<svg");
    });

    it("marks display math with the display attribute", async () => {
      const html = await math("$$\na\n$$", {
        output: "chtml",
        chtml: { fontURL },
        styleSheet: false,
      });

      expect(html).toContain('jax="CHTML" display="true"');
    });

    it("rejects a missing fontURL when the plugin is built", () => {
      expect(() => satteriMathjax({ output: "chtml" })).toThrow(/fontURL/);
    });

    it("emits a complete stylesheet, not one adapted to the first expression", async () => {
      const html = await math("$x$\n\n$$\n\\frac{a}{b}\n$$", {
        output: "chtml",
        chtml: { fontURL },
      });

      expect(styleTags(html)).toHaveLength(1);
      expect(html).toContain("mjx-dbox");
    });

    it("honours an explicit adaptiveCSS", async () => {
      const adaptive = await math("$x$", {
        output: "chtml",
        chtml: { fontURL, adaptiveCSS: true },
      });
      const complete = await math("$x$", {
        output: "chtml",
        chtml: { fontURL },
      });

      expect(adaptive.length).toBeLessThan(complete.length);
    });
  });

  describe("browser output", () => {
    it("wraps inline math in the client-side delimiters", async () => {
      expect(await math("Inline $x^2$ here.", { output: "browser" })).toBe(
        "<p>Inline \\(x^2\\) here.</p>",
      );
    });

    it("wraps display math in the client-side delimiters", async () => {
      expect(await math("$$\n\\frac{a}{b}\n$$", { output: "browser" })).toBe(
        "\\[\\frac{a}{b}\\]",
      );
    });

    it("escapes markup in the source", async () => {
      const html = await math("$<img src=x>$", { output: "browser" });

      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img src=x&gt;");
    });

    it("uses the first configured delimiter pair", async () => {
      const html = await math("$a$\n\n$$\nb\n$$", {
        output: "browser",
        tex: {
          inlineMath: [
            ["\\(", "\\)"],
            ["$", "$"],
          ],
          displayMath: [["[[", "]]"]],
        },
      });

      expect(html).toContain("\\(a\\)");
      expect(html).toContain("[[b]]");
    });

    it("emits no stylesheet", async () => {
      expect(styleTags(await math("$a$", { output: "browser" }))).toHaveLength(
        0,
      );
    });
  });
});
