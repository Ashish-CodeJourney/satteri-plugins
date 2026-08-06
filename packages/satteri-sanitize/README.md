# satteri-sanitize

[Sätteri](https://satteri.bruits.org) HAST plugin that sanitizes HTML in Markdown, a port of
[`rehype-sanitize`](https://github.com/rehypejs/rehype-sanitize).

## Why you need it

Sätteri passes raw HTML through **unparsed**. This Markdown:

```md
<script>alert(1)</script>
[click](javascript:alert(1))
```

renders as exactly that: a live script tag and a `javascript:` link. If any part of your Markdown
comes from somewhere you do not fully control, comments, user profiles, a CMS, a pull request
description, the content of a repo you did not write, it is an XSS vector.

```js
import { markdownToHtml } from "satteri";
import { satteriSanitize } from "satteri-sanitize";

const { html } = markdownToHtml(untrusted, { hastPlugins: [satteriSanitize()] });
```

Run it **last**, after any plugin that generates HTML, so it sees their output too.

## Install

```sh
npm install satteri-sanitize
```

## Use with Astro 7

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriSanitize } from "satteri-sanitize";

export default defineConfig({
  markdown: {
    processor: satteri({
      hastPlugins: [satteriSanitize()],
    }),
  },
});
```

Astro appends its own plugins after yours, so put this last in your list to cover as much as
possible. Note it cannot see Astro's syntax highlighter output, which runs first.

## What it does

- **Elements**: an allowlist ported from `hast-util-sanitize`'s `defaultSchema` (GitHub's rules).
  Anything else is *unwrapped*: the tags go, the text stays.
- **`script`**: removed along with its text content, including when that content arrives as a
  separate node.
- **Attributes**: allowlisted per element. Every `on*` handler is refused unconditionally.
- **URLs**: `href`, `src`, `cite` and `longdesc` are checked against a protocol allowlist. The check
  decodes character entities, strips control characters and ignores case, so `JaVaScRiPt:`,
  `java&#115;cript:` and `java<tab>script:` are all caught. Relative, anchor and protocol-relative
  URLs are allowed.
- **Markdown-generated links and images** are protocol-checked too, not just raw HTML.
- **Comments** are removed.
- **`id` and `name`** get a `user-content-` prefix to prevent DOM clobbering.

## API

### `satteriSanitize(options?)`

| Option | Type | Default |
| --- | --- | --- |
| `tagNames` | `string[]` | GitHub's element allowlist |
| `attributes` | `Record<string, string[]>` | merged over the default per-element allowlist |
| `protocols` | `Record<string, string[]>` | merged over the default URL allowlist |
| `clobberPrefix` | `string` | `"user-content-"` |

```js
satteriSanitize({
  tagNames: ["p", "a", "strong"],
  attributes: { a: ["href", "target"] },
  protocols: { href: ["https"] },
});
```

## Differences from `rehype-sanitize`

These are deliberate. Where they diverge, this plugin is the stricter of the two.

- **Token-level, not tree-level.** `rehype-sanitize` runs on a parsed tree. Sätteri hands plugins raw
  HTML as strings, so this filters tokens instead. Output is not byte-identical; the guarantee is
  that no disallowed element, attribute or protocol survives.
- **`on*` attributes are refused even if you allowlist them.** `rehype-sanitize` trusts its
  allowlist. This will not hand you a footgun.
- **`input` is not allowed in raw HTML.** Sätteri emits task-list checkboxes as real elements, so
  they are unaffected; a raw `<input>` is only ever a form control.
- **No `required` schema field.** `rehype-sanitize` can force attributes onto elements. Not
  implemented.
- **Unclosed `<script>` recovers at the next block element**, matching parse5, rather than consuming
  the rest of the document.
- **An element inside a script region survives as an empty element.** Its text is dropped and its
  URLs are protocol-checked, so it is inert, but the tag itself remains.

## Reporting a vulnerability

If you find an input that produces executable output, please report it privately via
[GitHub security advisories](https://github.com/Ashish-CodeJourney/satteri-plugins/security/advisories/new)
rather than a public issue.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-sanitize/LICENSE) © Ashish Vaghela
