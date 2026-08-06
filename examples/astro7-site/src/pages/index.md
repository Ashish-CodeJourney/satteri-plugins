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

## Line breaks

`satteri-breaks` turns a single newline into a break, so this address
stays on three lines
instead of collapsing into one.

## GitHub references

`satteri-github` autolinks issues and mentions against this repo: #1 links to the
first issue, @Ashish-CodeJourney links to a profile, and a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
links to a commit with the text abbreviated.

## Untrusted HTML

`satteri-sanitize` runs last, so it sees every other plugin's output as well as the
document's own HTML. The block below contains a script, an event handler and a
`javascript:` link, and none of them survive.

<div class="demo" onclick="alert('nope')">
  <script>alert('nope')</script>
  <a href="javascript:alert('nope')">a link that loses its href</a>
  <b>bold survives</b>
</div>

Ampersands already encoded by the author, like AT&amp;T, are left encoded rather
than being escaped a second time.
