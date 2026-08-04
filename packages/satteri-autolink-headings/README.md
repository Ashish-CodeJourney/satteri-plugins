# satteri-autolink-headings

[Sätteri](https://satteri.bruits.org) HAST plugin that adds a link to every heading — a port of
[`rehype-autolink-headings`](https://github.com/rehypejs/rehype-autolink-headings).

Pair it with [`satteri-slug`](../satteri-slug), which supplies the `id` this plugin links to.
Headings without an `id` are skipped.

## Install

```sh
npm install satteri-slug satteri-autolink-headings
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriSlug } from "satteri-slug";
import { satteriAutolinkHeadings } from "satteri-autolink-headings";

const { html } = markdownToHtml("## Hello World", {
  hastPlugins: [satteriSlug(), satteriAutolinkHeadings()],
});
// <h2 id="hello-world"><a aria-hidden="true" tabindex="-1" href="#hello-world">
//   <span class="icon icon-link"></span></a>Hello World</h2>
```

Order matters: Sätteri runs HAST plugins in array order, so `satteriSlug()` must come first.

**In Astro this is not optional.** Astro's Sätteri processor assigns heading ids with its own plugin
appended *after* your HAST plugins, so at the point this plugin runs the headings still have no
`id` and every heading is skipped. Including `satteriSlug()` is what makes the anchors appear —
in the example site, dropping it takes the anchor count from 10 to 1.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriSlug } from "satteri-slug";
import { satteriAutolinkHeadings } from "satteri-autolink-headings";

export default defineConfig({
  markdown: {
    processor: satteri({
      hastPlugins: [satteriSlug(), satteriAutolinkHeadings({ behavior: "wrap" })],
    }),
  },
});
```

## API

### `satteriAutolinkHeadings(options?)`

#### `options.behavior`

`"prepend"` (default) · `"append"` · `"wrap"` · `"before"` · `"after"`

```html
<!-- prepend --> <h2 id="x"><a href="#x">…</a>Text</h2>
<!-- append  --> <h2 id="x">Text<a href="#x">…</a></h2>
<!-- wrap    --> <h2 id="x"><a href="#x">Text</a></h2>
<!-- before  --> <a href="#x">…</a><h2 id="x">Text</h2>
<!-- after   --> <h2 id="x">Text</h2><a href="#x">…</a>
```

#### `options.content`

A hast node, an array of them, or a function of the heading. Defaults to
`<span class="icon icon-link"></span>` — except for `wrap`, which defaults to nothing.

```js
satteriAutolinkHeadings({ content: { type: "text", value: "#" } });
satteriAutolinkHeadings({ content: (heading) => ({ type: "text", value: heading.tagName }) });
```

#### `options.properties`

Properties of the `<a>`, as an object or a function of the heading. **Replaces** the defaults rather
than merging with them (matching `rehype-autolink-headings`). Defaults to
`{ ariaHidden: "true", tabIndex: -1 }` for `prepend`/`append`, and `{}` for the rest. `href` is
always set from the heading id.

#### `options.headingProperties`

Extra properties merged onto the heading element itself.

#### `options.test`

Heading tag names to link. Default `["h1", …, "h6"]`.

```js
satteriAutolinkHeadings({ test: ["h2", "h3"] });
```

#### `options.group`

An element wrapping the link and the heading together. Only meaningful with `before`/`after`.

```js
satteriAutolinkHeadings({
  behavior: "before",
  group: { type: "element", tagName: "div", properties: { className: ["g"] }, children: [] },
});
// <div class="g"><a href="#x">…</a><h2 id="x">Text</h2></div>
```

## Differences from `rehype-autolink-headings`

- Takes options directly (`satteriAutolinkHeadings({…})`) rather than via `unified().use()`.
- `options.test` accepts a list of tag names, not a `hast-util-is-element` test function. Sätteri
  filters by tag name at the engine level, which is where its speed comes from.
- `contentProperties` is not implemented — it has no observable effect in `rehype-autolink-headings`
  v7 for the content shapes people actually pass.
- Only heading elements are visited rather than the whole tree.

## Licence

MIT
