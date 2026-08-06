# satteri-mathjax

[Sätteri](https://satteri.bruits.org) MDAST plugin that renders math with
[MathJax](https://www.mathjax.org) — a port of
[`rehype-mathjax`](https://github.com/remarkjs/remark-math).

Sätteri **parses** math but does not render it. With `features: { math: true }`, `$x^2$` reaches the
page as `<code class="language-math math-inline">x^2</code>` — the TeX source, visible to readers.
This plugin turns it into real MathJax output.

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

## Install

```sh
npm install satteri-mathjax
```

Nothing else is needed for the default SVG output: MathJax's stylesheet is generated and emitted
into the document. See [Stylesheet](#stylesheet) for CHTML, which additionally needs a font URL.

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriMathjax } from "satteri-mathjax";

const { html } = markdownToHtml("Inline $x^2$ and\n\n$$\n\\frac{a}{b}\n$$", {
  features: { math: true },
  mdastPlugins: [satteriMathjax()],
});
```

`features: { math: true }` is required — without it Sätteri never produces math nodes and this
plugin has nothing to do.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriMathjax } from "satteri-mathjax";

export default defineConfig({
  markdown: {
    processor: satteri({
      features: { math: true },
      mdastPlugins: [satteriMathjax()],
    }),
  },
});
```

> **`mdastPlugins`, not `hastPlugins`.** Astro's Sätteri processor puts its syntax highlighter
> *ahead* of user HAST plugins. On HAST, display math is still a `<pre><code>`, so the highlighter
> claims it as a `plaintext` code block before any HAST plugin runs, and `$$…$$` renders as
> highlighted source instead of maths. Running on MDAST sidesteps the ordering entirely.

## API

### `satteriMathjax(options?)`

#### `options.output`

`"svg" | "chtml" | "browser"`, default `"svg"`.

- `"svg"` — self-contained SVG. Nothing to load at runtime; the default, matching
  `rehype-mathjax`'s default export.
- `"chtml"` — CommonHTML. Smaller markup, but the reader must download MathJax's web fonts, so
  `options.chtml.fontURL` is **required**.
- `"browser"` — no rendering at all. Math is wrapped in delimiters (`\(…\)` and `\[…\]`) for MathJax
  to typeset in the browser. You load and start MathJax yourself, with the same delimiters.

#### `options.tex`

Configuration for the [TeX input jax](http://docs.mathjax.org/en/latest/options/input/tex.html) —
`macros`, `tags`, `packages`, and so on. All [MathJax packages](http://docs.mathjax.org/en/latest/input/tex/extensions.html)
are enabled by default; pass `packages` to narrow that.

With `output: "browser"`, only `tex.inlineMath` and `tex.displayMath` are read, and only their first
delimiter pair.

#### `options.svg` / `options.chtml`

Configuration for the [SVG](http://docs.mathjax.org/en/latest/options/output/svg.html) and
[CHTML](http://docs.mathjax.org/en/latest/options/output/chtml.html) output jax. `chtml.fontURL` is
required and validated when `satteriMathjax()` is called, so a missing one throws where it is
written rather than part-way through a build:

```js
satteriMathjax({
  output: "chtml",
  chtml: {
    fontURL:
      "https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2",
  },
});
```

#### `options.styleSheet`

`boolean`, default `true`. Emit MathJax's generated stylesheet into the document. Ignored for
`output: "browser"`, which has no stylesheet.

#### `options.errorColor`

`string`, default `"#cc0000"`. Colour of the source text left in place if rendering throws.

## Stylesheet

MathJax's CSS is generated, not shipped as a file, so there is no `<link>` to add. The plugin emits
it as a `<style>` element alongside the **first** expression in each document, once per document,
and only when the document contains math.

Because the stylesheet goes out before MathJax has seen the rest of the document, CHTML's
`adaptiveCSS` (which trims the sheet to the glyphs actually used) would leave later expressions
unstyled. So `chtml.adaptiveCSS` defaults to `false` here — a complete, order-independent sheet.
That sheet is large (~240 kB). If that matters, set `styleSheet: false` and manage MathJax's CSS
yourself.

## Error handling

MathJax turns most TeX mistakes into its own error markup rather than throwing, so `$\frac{a}$`
renders as a MathJax `merror` container — the same as `rehype-mathjax`. MathJax escapes the offending
source when it serialises that container, so a malformed expression cannot inject markup.

If rendering throws anyway, the build still succeeds and the source is echoed back, escaped:

```html
<span class="mathjax-error" title="Error: …" style="color:#cc0000">\frac{a}</span>
```

Both the source and the message are HTML-escaped, so a failing expression cannot inject markup or
break out of the `title` attribute.

## Differences from `rehype-mathjax`

- Takes options directly rather than via `unified().use()`, and picks the output jax with
  `output: "svg" | "chtml" | "browser"` instead of the `rehype-mathjax`, `rehype-mathjax/chtml` and
  `rehype-mathjax/browser` entry points.
- Runs on MDAST `math` / `inlineMath` nodes rather than on rendered HAST. Output is the same
  `<mjx-container>` markup — `display="true"` for display math — but it is immune to other plugins
  claiming the code block first (see the Astro note above).
- Emits MathJax's HTML as a raw `html` node rather than a parsed tree, so it is MathJax's own
  serialisation verbatim. Attribute order and whitespace differ very slightly from
  `rehype-mathjax`, which round-trips the output through `hastscript`. If you also run a sanitiser,
  allow the MathJax markup through.
- The stylesheet lands **before** the first expression rather than at the end of the document
  (an MDAST visitor has no end-of-document hook). It is opt-out via `styleSheet`, which
  `rehype-mathjax` does not offer, and CHTML defaults to a complete rather than adaptive sheet
  (see [Stylesheet](#stylesheet)).
- A missing `chtml.fontURL` throws when the plugin is constructed, not when the first document with
  math is compiled.
- The fallback error span is escaped by this plugin. `rehype-mathjax` builds a hast element and
  lets the serialiser escape it; the result is equivalent.
- `svg.fontCache: "global"` is not usable — as in `rehype-mathjax`, the shared `<defs>` it refers to
  is never emitted. Leave it at the default `"local"`.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-mathjax/LICENSE) © Ashish Vaghela
