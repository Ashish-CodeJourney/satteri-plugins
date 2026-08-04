---
layout: ../layouts/Page.astro
title: Ports of the plugins Sätteri left behind
description: rehype-slug, rehype-autolink-headings and rehype-katex, rebuilt for the Rust Markdown engine behind Astro 7 — and proven by this page.
---

Every heading on this page is given an `id` by [`satteri-slug`](https://github.com/Ashish-CodeJourney/satteri-plugins/tree/main/packages/satteri-slug)
and an anchor link by [`satteri-autolink-headings`](https://github.com/Ashish-CodeJourney/satteri-plugins/tree/main/packages/satteri-autolink-headings).
All the maths is rendered by [`satteri-katex`](https://github.com/Ashish-CodeJourney/satteri-plugins/tree/main/packages/satteri-katex).

This page is built by Astro 7 with the Sätteri processor. Its HTML is snapshot-tested in CI, so it
is proof the plugins work in a real build rather than only in unit tests.

## Headings and anchors

Hover any heading and follow the `#`. Duplicate headings get numbered ids, so the two sections
below do not collide.

### Duplicate

The id of this one is `duplicate`.

### Duplicate

The id of this one is `duplicate-1`.

### Punctuation, symbols & casing!

Punctuation is stripped and the text is lowercased, exactly as `rehype-slug` did.

## Maths

Inline maths flows with the text: the Pythagorean identity $a^2 + b^2 = c^2$ sits inside this
sentence, as does Euler's $e^{i\pi} + 1 = 0$.

Display maths gets its own block:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

$$
\frac{\partial}{\partial t} \Psi(x, t) = \frac{i\hbar}{2m} \nabla^2 \Psi(x, t)
$$

### Maths that does not parse

A broken expression does not break the build. This one, $\frac{a}$, is left in place and flagged
rather than throwing.

## Built into Sätteri

The features below need no plugin at all — they are Sätteri parser features.

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

## Ordinary code is left alone

```js
const { html } = markdownToHtml("## Hello", {
  hastPlugins: [satteriSlug(), satteriAutolinkHeadings(), satteriKatex()],
});
```

Inline `code` is untouched too — only `language-math` blocks are rendered as maths.

[^1]: Footnotes are part of GFM, which Sätteri enables by default.
