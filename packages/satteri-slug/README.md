# satteri-slug

[Sätteri](https://satteri.bruits.org) HAST plugin that adds an `id` to every heading — a port of
[`rehype-slug`](https://github.com/rehypejs/rehype-slug).

Sätteri does **not** generate heading ids on its own: `<h2>Hello World</h2>` comes out without an
`id`, so in-page anchors, table-of-contents links and `#deep-links` do not work. This plugin fills
that gap using the same [`github-slugger`](https://github.com/Flet/github-slugger) implementation
`rehype-slug` uses, so ids match what GitHub and your old unified pipeline produced.

## Install

```sh
npm install satteri-slug
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriSlug } from "satteri-slug";

const { html } = markdownToHtml("## Hello World", {
  hastPlugins: [satteriSlug()],
});
// <h2 id="hello-world">Hello World</h2>
```

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriSlug } from "satteri-slug";

export default defineConfig({
  markdown: {
    processor: satteri({
      hastPlugins: [satteriSlug()],
    }),
  },
});
```

## Do you need this in Astro?

For ids alone, no: Astro's Sätteri processor already slugs headings with `github-slugger`, and it
also collects them for `Astro.props.headings`.

You still need this plugin if anything of yours reads heading ids **during** the HAST stage —
notably [`satteri-autolink-headings`](../satteri-autolink-headings) — because Astro's heading-id
plugin is appended *after* your own, so the ids do not exist yet when your plugins run. Setting the
id first is harmless: Astro's plugin keeps an existing id rather than replacing it.

Outside Astro — raw `satteri`, `vite-plugin-satteri`, or your own pipeline — nothing assigns heading
ids, so this plugin is the only thing that will.

## API

### `satteriSlug(options?)`

Returns a Sätteri HAST plugin factory. Pass the **result** to `hastPlugins`, not the function
itself — the factory gives each document a fresh duplicate counter.

#### `options.prefix`

`string`, default `""`. Prepended to every generated id.

```js
satteriSlug({ prefix: "user-content-" });
// <h2 id="user-content-hello-world">Hello World</h2>
```

## Behaviour

| Input | Output id |
| --- | --- |
| `## Hello, World! (again)` | `hello-world-again` |
| `## A \`code\` and *em* title` | `a-code-and-em-title` |
| `## Same` ×3 | `same`, `same-1`, `same-2` |
| `## Café über naïve` | `café-über-naïve` |
| `## !!!` | `` (empty, as in `rehype-slug`) |

Headings that already have an `id` are left untouched — including ids from Sätteri's
`headingAttributes` feature (`## Title {#custom}`).

## Differences from `rehype-slug`

- Ships as a **factory** (`satteriSlug()`), matching Sätteri's per-document state model, rather than
  a `unified().use()` plugin.
- Only heading elements are visited (`filter: ["h1"…"h6"]`) instead of walking every element, which
  is where Sätteri's speed comes from. Behaviour is otherwise identical.

## Licence

MIT
