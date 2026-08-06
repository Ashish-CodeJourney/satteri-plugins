---
layout: ../layouts/Page.astro
title: The plugins Sätteri left behind
description: Eight ports of the remark and rehype plugins that stop working when Astro 7 switches to Sätteri — each one demonstrated, and the whole page snapshot-tested in CI.
---

Astro 7 compiles Markdown with [Sätteri](https://satteri.bruits.org), a Rust engine that does not run remark or rehype plugins. Everything below is a port that restores one of them.

This page is the proof. It is built by real Astro with all eight plugins enabled, and its HTML is asserted in CI, so nothing here can rot without the build going red.

Note that `satteri-breaks` is enabled, which turns every single newline into a break. Paragraphs in this document's source are therefore written on one line each, except where the break is the point.

| Package | Replaces | Shown under |
| --- | --- | --- |
| `satteri-slug` | `rehype-slug` | [Headings and anchors](#headings-and-anchors) |
| `satteri-autolink-headings` | `rehype-autolink-headings` | [Headings and anchors](#headings-and-anchors) |
| `satteri-katex` | `rehype-katex` | [Maths](#maths) |
| `satteri-mathjax` | `rehype-mathjax` | [Maths](#maths) |
| `satteri-breaks` | `remark-breaks` | [Line breaks](#line-breaks) |
| `satteri-github` | `remark-github` | [GitHub references](#github-references) |
| `satteri-sanitize` | `rehype-sanitize` | [Untrusted HTML](#untrusted-html) |
| `satteri-mdx-frontmatter` | `remark-mdx-frontmatter` | [the MDX page](./mdx) |

## Headings and anchors

`satteri-slug` gives every heading an `id`; `satteri-autolink-headings` adds the `#` you see on hover. Order matters: slug has to run first, and both have to run before Astro's own heading pass.

### Duplicate

Repeated headings are numbered rather than colliding. This one is `duplicate`.

### Duplicate

This one is `duplicate-1`.

### Punctuation, symbols & casing!

Punctuation is stripped and the text lowercased, exactly as `rehype-slug` did.

## Maths

Sätteri parses maths but renders none of it, so without a plugin the expressions below reach the page as inert code blocks.

Inline maths flows with the text: the Pythagorean identity $a^2 + b^2 = c^2$ sits inside this sentence, as does Euler's $e^{i\pi} + 1 = 0$.

Display maths gets its own block:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

$$
\frac{\partial}{\partial t} \Psi(x, t) = \frac{i\hbar}{2m} \nabla^2 \Psi(x, t)
$$

`satteri-katex` and `satteri-mathjax` are interchangeable and consume the same nodes, so exactly one can run. CI builds this page twice, once with each, and asserts both.

### Maths that does not parse

A broken expression does not break the build. This one, $\frac{a}$, is left in place and flagged.

## Line breaks

`satteri-breaks` turns a single newline into a break, so this address
stays on three lines
instead of collapsing into one.

## GitHub references

`satteri-github` autolinks against this repo: #1 links to the first issue, @Ashish-CodeJourney links to a profile, and a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0 links to a commit with the text abbreviated.

## Untrusted HTML

`satteri-sanitize` runs last, so it sees every other plugin's output as well as the document's own HTML. Sätteri passes raw HTML straight through unparsed, which makes this the one plugin here that is load-bearing for security rather than convenience.

The block below contains a script, an event handler and a `javascript:` link. None survive.

<div class="demo" onclick="alert('nope')">
  <script>alert('nope')</script>
  <a href="javascript:alert('nope')">a link that loses its href</a>
  <b>bold survives</b>
</div>

Ampersands the author already encoded, like AT&amp;T, stay encoded rather than being escaped a second time.

## Built into Sätteri

These need no plugin. Porting them would have been wasted work.

| Feature | Syntax | Enabled by |
| --- | --- | --- |
| Tables | this table | `gfm`, on by default |
| Strikethrough | ~~like this~~ | `gfm`, on by default |
| Task lists | see below | `gfm`, on by default |
| Footnotes | like this[^1] | `gfm`, on by default |
| Maths parsing | `$x$` | `features.math` |

- [x] Tables, strikethrough and task lists
- [x] Footnotes
- [ ] Anything needing `remark-gfm`

Code blocks are Astro's own highlighter, untouched by any of this. Only `language-math` blocks are claimed by the maths plugins.

```js
const { html } = markdownToHtml("## Hello", {
  mdastPlugins: [satteriBreaks(), satteriGithub(), satteriKatex()],
  hastPlugins: [satteriSlug(), satteriAutolinkHeadings(), satteriSanitize()],
});
```

[^1]: Footnotes are part of GFM, which Sätteri enables by default.
