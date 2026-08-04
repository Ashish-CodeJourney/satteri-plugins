# satteri-katex

[Sätteri](https://satteri.bruits.org) MDAST plugin that renders math with
[KaTeX](https://katex.org) — a port of [`rehype-katex`](https://github.com/remarkjs/remark-math).

Sätteri **parses** math but does not render it. With `features: { math: true }`, `$x^2$` reaches the
page as `<code class="language-math math-inline">x^2</code>` — the TeX source, visible to readers.
This plugin turns it into real KaTeX output.

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

## Install

```sh
npm install satteri-katex
```

KaTeX also needs its stylesheet on the page:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css" />
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriKatex } from "satteri-katex";

const { html } = markdownToHtml("Inline $x^2$ and\n\n$$\n\\frac{a}{b}\n$$", {
  features: { math: true },
  mdastPlugins: [satteriKatex()],
});
```

`features: { math: true }` is required — without it Sätteri never produces math nodes and this
plugin has nothing to do.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriKatex } from "satteri-katex";

export default defineConfig({
  markdown: {
    processor: satteri({
      features: { math: true },
      mdastPlugins: [satteriKatex()],
    }),
  },
});
```

> **`mdastPlugins`, not `hastPlugins`.** Astro's Sätteri processor puts its syntax highlighter
> *ahead* of user HAST plugins. On HAST, display math is still a `<pre><code>`, so the highlighter
> claims it as a `plaintext` code block before any HAST plugin runs, and `$$…$$` renders as
> highlighted source instead of maths. Running on MDAST sidesteps the ordering entirely.

## API

### `satteriKatex(options?)`

All [KaTeX options](https://katex.org/docs/options.html) are passed through — `macros`, `output`,
`strict`, `trust`, `fleqn`, and so on — except `displayMode` (set from the syntax used) and
`throwOnError` (see below).

#### `options.errorColor`

`string`, default `"#cc0000"`. Colour of the source text left in place when an expression fails to
parse.

## Error handling

A failing expression never breaks the build. The source is echoed back, escaped, so the author can
see what went wrong:

```html
<span class="katex-error" title="ParseError: KaTeX parse error: …" style="color:#cc0000">
  \frac{a}
</span>
```

Both the source and the KaTeX message are HTML-escaped before being written into the page — a
failing expression cannot inject markup or break out of the `title` attribute.

## Differences from `rehype-katex`

- Takes options directly rather than via `unified().use()`.
- `throwOnError` is not accepted. `rehype-katex` ignores it too; errors always become a
  `katex-error` span.
- Runs on MDAST `math` / `inlineMath` nodes rather than on rendered HAST. Output structure is the
  same — `<span class="katex-display">` for display math, `<span class="katex">` inline — but it is
  immune to other plugins claiming the code block first (see the Astro note above).
- Emits KaTeX's HTML as a raw `html` node rather than a parsed tree. If you also run a sanitiser,
  allow the KaTeX markup through.

## Licence

MIT
