import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriSanitize } from "./index.js";

type Options = Parameters<typeof satteriSanitize>[0];

const clean = (markdown: string, options?: Options) =>
  render(markdown, { hastPlugins: [satteriSanitize(options)] });

describe("satteri-sanitize", () => {
  describe("script and style", () => {
    it("removes a block script and its payload", async () => {
      expect(await clean("<script>alert(1)</script>")).toBe("");
    });

    it("removes an inline script and its payload", async () => {
      expect(await clean("a <script>alert(1)</script> b")).toBe("<p>a  b</p>");
    });

    it("removes a script with attributes", async () => {
      expect(await clean('<script src="https://evil.com/x.js"></script>')).toBe("");
    });

    it("removes a script however its tag is cased", async () => {
      expect(await clean("a <ScRiPt>alert(1)</ScRiPt> b")).toBe("<p>a  b</p>");
    });

    it("keeps dropping payload after an inline element inside a script", async () => {
      // Markdown is parsed before sanitisation, so a link inside a script region
      // becomes a real element. That must not be mistaken for the end of the
      // raw-text run.
      const html = await clean("a <script>payload [l](https://x.com) more-payload</script> b");

      expect(html).not.toContain("payload");
      expect(html).not.toContain("more-payload");
    });

    it("unwraps style but keeps its text, as rehype-sanitize does", async () => {
      expect(await clean("a <style>p{}</style> b")).toBe("<p>a p{} b</p>");
    });
  });

  describe("event handlers and dangerous attributes", () => {
    it("strips onerror from an image", async () => {
      expect(await clean("<img src=x onerror=alert(1)>")).toBe('<img src="x">');
    });

    it("strips onclick but keeps the element and its text", async () => {
      expect(await clean('<div onclick="alert(1)">text</div>')).toBe("<div>text</div>");
    });

    it("strips every on* handler regardless of case", async () => {
      const html = await clean('<div OnMouseOver="alert(1)" ONFOCUS="x">t</div>');

      expect(html).toBe("<div>t</div>");
    });

    it("strips style attributes", async () => {
      expect(await clean('<p style="color:red">styled</p>')).toBe("<p>styled</p>");
    });

    it("refuses on* attributes even when the caller allows them", async () => {
      // Stricter than rehype-sanitize, which trusts its allowlist alone.
      const html = await clean('<div onclick="alert(1)">t</div>', {
        attributes: { div: ["onclick"] },
      });

      expect(html).toBe("<div>t</div>");
    });
  });

  describe("dangerous elements", () => {
    it("unwraps an iframe and keeps its text", async () => {
      expect(await clean("<iframe>inner text</iframe>")).toBe("inner text");
    });

    it("drops the src of an iframe entirely", async () => {
      expect(await clean('<iframe src="https://evil.com"></iframe>')).toBe("");
    });

    it("unwraps an unknown element", async () => {
      expect(await clean("<foo>inner text</foo>")).toBe("<p>inner text</p>");
    });

    it("unwraps object and embed", async () => {
      expect(await clean('<object data="x">o</object>')).toBe("<p>o</p>");
      expect(await clean('<embed src="x">e')).toBe("<p>e</p>");
    });

    it("unwraps form controls", async () => {
      expect(await clean('<form action="/x"><input name="a"></form>')).toBe("");
    });

    it("unwraps svg", async () => {
      expect(await clean("<svg onload=alert(1)><circle /></svg>")).toBe("<p></p>");
    });
  });

  describe("URL protocols", () => {
    it("strips a javascript: href from raw HTML", async () => {
      expect(await clean('<a href="javascript:alert(1)">x</a>')).toBe("<p><a>x</a></p>");
    });

    it("strips a javascript: href from a markdown link", async () => {
      expect(await clean("[click](javascript:alert(1))")).toBe("<p><a>click</a></p>");
    });

    it("strips javascript: however it is cased", async () => {
      expect(await clean('<a href="JaVaScRiPt:alert(1)">x</a>')).toBe("<p><a>x</a></p>");
    });

    it("strips javascript: hidden behind a character entity", async () => {
      expect(await clean('<a href="java&#115;cript:alert(1)">x</a>')).toBe(
        "<p><a>x</a></p>",
      );
    });

    it("strips javascript: padded with control characters", async () => {
      expect(await clean('<a href="java\tscript:alert(1)">x</a>')).toBe("<p><a>x</a></p>");
    });

    it("strips a data: URL from a markdown image", async () => {
      expect(await clean("![x](data:image/svg+xml;base64,PHN2Zz4=)")).toBe(
        '<p><img alt="x"></p>',
      );
    });

    it("keeps https, mailto, relative and anchor URLs", async () => {
      expect(await clean("[safe](https://example.com)")).toBe(
        '<p><a href="https://example.com">safe</a></p>',
      );
      expect(await clean("[mail](mailto:a@b.com)")).toBe(
        '<p><a href="mailto:a@b.com">mail</a></p>',
      );
      expect(await clean("[rel](/docs/page)")).toBe('<p><a href="/docs/page">rel</a></p>');
      expect(await clean("[anchor](#section)")).toBe('<p><a href="#section">anchor</a></p>');
    });

    it("keeps an allowed protocol written in uppercase", async () => {
      // A browser treats HTTPS: and https: alike, so the check must too.
      expect(await clean('<a href="HTTPS://example.com">x</a>')).toBe(
        '<p><a href="HTTPS://example.com">x</a></p>',
      );
    });

    it("keeps an allowed protocol split by a control character", async () => {
      // Browsers strip tabs and newlines inside a scheme before dispatching, so
      // ht<tab>tps is https to them and must be to us.
      expect(await clean('<a href="ht\ttps://example.com">x</a>')).toContain("<a href=");
    });

    it("keeps a safe image source", async () => {
      expect(await clean("![alt](https://example.com/a.png)")).toBe(
        '<p><img src="https://example.com/a.png" alt="alt"></p>',
      );
    });
  });

  describe("markdown output is left intact", () => {
    it("keeps inline formatting produced by markdown", async () => {
      expect(await clean("Some *em* and **strong** and `code`.")).toBe(
        "<p>Some <em>em</em> and <strong>strong</strong> and <code>code</code>.</p>",
      );
    });

    it("keeps allowed inline HTML", async () => {
      expect(await clean("Some <b>bold</b> and <em>em</em>.")).toBe(
        "<p>Some <b>bold</b> and <em>em</em>.</p>",
      );
    });

    it("keeps allowed block HTML", async () => {
      expect(await clean("<div><p>para</p></div>")).toBe("<div><p>para</p></div>");
    });

    it("keeps task list checkboxes, which are elements rather than raw HTML", async () => {
      const html = await clean("- [x] done\n- [ ] todo");

      expect(html).toContain('<input type="checkbox" checked disabled>');
      expect(html).toContain("done");
    });

    it("keeps tables", async () => {
      expect(await clean("| a |\n| - |\n| 1 |")).toContain("<table>");
    });

    it("keeps code blocks and their language class", async () => {
      expect(await clean("```js\nconst a = 1;\n```")).toBe(
        '<pre><code class="language-js">const a = 1;\n</code></pre>',
      );
    });
  });

  describe("comments", () => {
    it("removes HTML comments", async () => {
      expect(await clean("before <!-- secret --> after")).toBe("<p>before  after</p>");
    });

    it("removes a comment containing a tag", async () => {
      expect(await clean("a <!-- <script>alert(1)</script> --> b")).toBe("<p>a  b</p>");
    });
  });

  describe("DOM clobbering", () => {
    it("prefixes id to prevent clobbering", async () => {
      expect(await clean('<h2 id="keep-me">h</h2>')).toBe(
        '<h2 id="user-content-keep-me">h</h2>',
      );
    });

    it("prefixes name as well", async () => {
      expect(await clean('<a name="x">t</a>')).toBe(
        '<p><a name="user-content-x">t</a></p>',
      );
    });

    it("uses a configured clobber prefix", async () => {
      expect(await clean('<h2 id="a">h</h2>', { clobberPrefix: "safe-" })).toBe(
        '<h2 id="safe-a">h</h2>',
      );
    });
  });

  describe("malformed input", () => {
    it("does not treat a quoted angle bracket as the end of a tag", async () => {
      const html = await clean(`<a href="x" title="a>b" onclick="alert(1)">t</a>`);

      expect(html).not.toContain("onclick");
      expect(html).not.toContain("alert(1)");
    });

    it("leaves a bare less-than sign alone", async () => {
      expect(await clean("5 < 6 and 7 > 2")).toBe("<p>5 &lt; 6 and 7 &gt; 2</p>");
    });

    it("removes an unclosed script tag and its payload", async () => {
      const html = await clean("ok <script>alert(1)");

      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert(1)");
    });

    it("recovers at the next block, so one stray script cannot blank the page", async () => {
      const html = await clean("ok <script>alert(1)\n\nlater paragraph\n\n## heading");

      expect(html).not.toContain("alert(1)");
      expect(html).toContain("later paragraph");
      expect(html).toContain("heading");
    });

    it("handles an attribute with no value", async () => {
      expect(await clean("<div hidden>t</div>")).toBe("<div>t</div>");
    });
  });

  describe("configuration", () => {
    it("honours a restricted tag allowlist", async () => {
      expect(await clean("<b>bold</b> plain", { tagNames: ["p"] })).toBe(
        "<p>bold plain</p>",
      );
    });

    it("honours an extended attribute allowlist", async () => {
      expect(await clean('<div class="note">t</div>', { attributes: { div: ["class"] } })).toBe(
        '<div class="note">t</div>',
      );
    });

    it("honours a restricted protocol allowlist", async () => {
      expect(await clean("[mail](mailto:a@b.com)", { protocols: { href: ["https"] } })).toBe(
        "<p><a>mail</a></p>",
      );
    });
  });
});
