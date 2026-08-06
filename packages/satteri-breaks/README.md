# satteri-breaks

[Sätteri](https://satteri.bruits.org) MDAST plugin that turns single newlines into `<br>`, a port of
[`remark-breaks`](https://github.com/remarkjs/remark-breaks).

CommonMark treats a single newline as a space, so this:

```md
line one
line two
```

renders as one line. That surprises people writing changelogs, release notes, poetry, addresses, or
anything migrated from a chat app or issue tracker, where a newline means a newline.

## Install

```sh
npm install satteri-breaks
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriBreaks } from "satteri-breaks";

const { html } = markdownToHtml("line one\nline two", {
  mdastPlugins: [satteriBreaks()],
});
// <p>line one<br>
// line two</p>
```

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriBreaks } from "satteri-breaks";

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriBreaks()],
    }),
  },
});
```

## API

### `satteriBreaks()`

No options, matching `remark-breaks`.

## What it does and does not touch

| Markdown | Result |
| --- | --- |
| `a\nb` | `a<br>b` |
| `a  \nb` (hard break) | unchanged, already a break |
| `a\\\nb` (backslash) | unchanged, already a break |
| `a\n\nb` | two paragraphs, no break added |
| fenced code | untouched |
| inline code | untouched |
| table structure | untouched |

Code is untouched for a structural reason rather than a special case: Sätteri represents fenced and
inline code as `code` and `inlineCode` nodes, not text, so a text visitor never sees them.

CRLF line endings are handled.

## Differences from `remark-breaks`

Output is identical. Sätteri renders a `break` node as `<br>\n`, the same as `mdast-util-to-hast`.

The implementation differs: `remark-breaks` rewrites the tree directly, while here the text node is
narrowed to its first line and the remaining lines are spliced in after it with `ctx.insertAfter`.
Sätteri cannot encode an array containing a `break` through `ctx.replaceNode`, but accepts the same
array through `ctx.insertAfter`.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-breaks/LICENSE) © Ashish Vaghela
