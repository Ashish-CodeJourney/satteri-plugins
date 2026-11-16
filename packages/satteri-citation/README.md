# satteri-citation

[Sätteri](https://satteri.bruits.org) plugin that renders Pandoc-style citations and a reference
list — a port of [`rehype-citation`](https://github.com/timlrx/rehype-citation).

It reads BibTeX or CSL-JSON, formats citations with [`citation-js`](https://citation.js.org)
underneath (the same engine `rehype-citation` uses), and appends the cited works as a reference list.

## Install

```sh
npm install satteri-citation
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriCitation } from "satteri-citation";

const { html } = markdownToHtml("My text [@Nash1950].", {
  mdastPlugins: [satteriCitation({ bibliography: "refs.bib" })],
});
// <p>My text <span id="citation--nash1950--1">(Nash, 1950)</span>.</p>
// <div id="refs" class="references csl-bib-body">…</div>
```

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriCitation } from "satteri-citation";

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriCitation({ bibliography: "./src/refs.bib" })],
    }),
  },
});
```

It runs at the **MDAST** stage, so pass it to `mdastPlugins`. Put it **before** `satteri-github`:
that plugin autolinks `@` mentions, and would turn the `@` of a citation key into a link first.

## Syntax

| Written | Rendered |
| --- | --- |
| `[@Nash1950]` | `(Nash, 1950)` |
| `[@Nash1950; @Smith2001]` | `(Nash, 1950; Smith & Doe, 2001)` — sorted by author |
| `[@Nash1950, p. 3]` | `(Nash, 1950, p. 3)` |
| `[see @Nash1950]` | `(see Nash, 1950)` |
| `@Nash1950 says` | `Nash (1950) says` |
| `[@unknown]` | left as written, with no reference-list entry |
| `` `[@Nash1950]` `` and code blocks | left as written |

A bracket is a citation only when every key in it is in the bibliography. One unknown key leaves
the whole bracket as literal text. Keys are case-sensitive, and `me@Nash1950` is not a citation.

## Options

### `bibliography`

`string | string[]`, required. Paths to BibTeX or CSL-JSON files, resolved against the working
directory. Several files are merged. They are read when the plugin is created, so a missing file
fails the build at startup.

### `suppressBibliography`

`boolean`, default `false`. Leave the reference list out of the document. Citations still render.

## Output

Each citation is a `<span>` with an id of `citation--<keys>--<n>`, numbered in document order, and
each cited work gets `id="bib-<key>"` in the reference list. Ids are lowercased.

## Differences from `rehype-citation`

- **Author-date APA only.** The bundled `apa` style is the only one. There is no `harvard1`,
  `vancouver`, `chicago`, `mla`, or custom CSL, and no numeric styles. Numbering needs
  document-level state that this port does not yet keep.
- **Not supported:** `noCite`, `linkCitations`, `showTooltips`, `inlineClass`, `inlineBibClass`,
  `lang`, the `path` option (paths resolve against the working directory), frontmatter overrides,
  and the `[^ref]` footnote placement for the reference list. The list is appended at the end of
  the document.
- **Not supported:** the suppress-author form `[-@key]`, and narrative citations with several keys.
- **Headings, emphasis and link text are processed.** `rehype-citation` leaves a citation in a
  heading, emphasis or link text as literal text. This port renders it.
- **Locator labels.** `p.`, `pp.`, `ch.`, `chap.`, `sec.`, `fig.`, `vol.` and `eq.`, or a bare
  number, are passed to the style as labelled locators. `ch. 2` renders as `Chapter 2` in APA.
  `rehype-citation` renders `ch.` as `c h.`. Any other suffix is kept as written.
- **Output markup.** Ids are the same, but the empty `class=""` on in-text spans is omitted.
- **Trusted bibliography.** Entries are inserted as the HTML citation-js produces, so markup in a
  title (for example `<i>`) is kept, as in the original. Treat bibliography files as trusted
  content, and run `satteri-sanitize` after this plugin to clean the output.
- **Sanitiser.** `satteri-sanitize` prefixes ids with `user-content-` and, by default, drops the
  `class` on `div`. Allow `class` on `div` to keep the `csl-*` classes.
- **Markdown only.** The plugin is designed for Markdown. It has not been tested with MDX.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-citation/LICENSE) © Ashish Vaghela
