# satteri-validate-links

[![npm](https://img.shields.io/npm/v/satteri-validate-links.svg)](https://www.npmjs.com/package/satteri-validate-links)

[Sätteri](https://satteri.bruits.org) MDAST plugin that checks links actually point at something, a
port of [`remark-validate-links`](https://github.com/remarkjs/remark-validate-links).

It checks three things:

- `#anchor` — a heading with that id exists in this document
- `./other.md` — the file exists on disk
- `./other.md#anchor` — the file exists **and** has a heading with that id

External links are left alone. This plugin never makes a network request.

## Install

```sh
npm install satteri-validate-links
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriValidateLinks } from "satteri-validate-links";

const { data } = await markdownToHtml(source, {
  mdastPlugins: [satteriValidateLinks()],
  fileURL: new URL("file:///site/docs/page.md"),
});

for (const finding of data.validateLinks ?? []) {
  console.warn(`${finding.url}: ${finding.reason}`);
}
```

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

`fileURL` must be a `URL` and is what relative paths resolve against. Without it, only `#anchor`
links are checked — there is nothing to resolve a path against.

Findings look like this:

```js
{
  url: "./other.md#absent",
  reason: './other.md has no heading with the id "absent"',
  position: { start: { line: 3, column: 1, offset: 12 }, end: { … } },
}
```

## Options

### `key`

`string`, default `"validateLinks"`. The property on `result.data` findings are written to.

### `intoAstroFrontmatter`

`boolean`, default `false`. Also copy findings onto `data.astro.frontmatter` under the same key.
See [With Astro 7](#with-astro-7); it mutates the caller's object, so it is opt-in.

### `ignore`

`(url: string) => boolean`. Return `true` for a link that should not be checked. Consulted for every
link, anchors included, before anything is resolved.

It exists for framework routes. A static site generator maps `./about` to a page, but there is no
`./about` on disk, so a filesystem check reports a link that works. Skip path-like destinations
without an extension, and keep checking anchors:

```js
satteriValidateLinks({
  ignore: (url) => !url.startsWith("#") && !/\.[a-z]+$/i.test(url.split("#")[0] ?? ""),
})
```

## Differences from `remark-validate-links`

### Findings come back on `result.data`, not as warnings

This is the significant one. `remark-validate-links` reports through vfile messages, which the
unified pipeline surfaces to the caller and which tools like `remark-cli` turn into a report with
exit codes.

Sätteri has `ctx.report()`, but those diagnostics reach nobody: they are readable only through
`ctx.getDiagnostics()` from inside a plugin, `markdownToHtml` returns `{ html, frontmatter, data }`
with no diagnostics field, and Astro's processor never reads them. So findings are written to
`ctx.data`, which **is** returned as `result.data`.

The consequence is that nothing fails on your behalf. Deciding what a broken link means — warn,
fail the build, ignore — is yours:

```js
const broken = data.validateLinks ?? [];
if (broken.length > 0) throw new Error(`${broken.length} broken link(s)`);
```

### With Astro 7

Astro passes each page's `fileURL` through, so path checking works. It does **not** hand you
`result.data`: `@astrojs/markdown-satteri` reads only `data.astro` and returns a fixed shape of
`headings`, `localImagePaths`, `remoteImagePaths` and `frontmatter`. A `data.validateLinks` key is
dropped on the floor.

What does survive is `frontmatter`, because Astro returns the very object it passed in. So to see
findings in an Astro build, write them there:

```js
// astro.config.mjs
processor: satteri({
  mdastPlugins: [satteriValidateLinks({ key: "brokenLinks", intoAstroFrontmatter: true })],
}),
```

```astro
---
const { brokenLinks = [] } = Astro.props.frontmatter;
---
{brokenLinks.length > 0 && <aside>{brokenLinks.length} broken link(s) on this page</aside>}
```

### Heading ids are read from the source, not the tree

Sätteri visits each node once, in order, and has no root or end-of-document hook, so a link cannot
wait for the headings below it to be visited. Ids are therefore scanned out of `ctx.source` rather
than collected from the tree. Forward references work as a result.

The scanner understands ATX (`## Heading`) and setext (underlined) headings, and skips fenced code
blocks and the frontmatter block. It does not understand headings produced by other plugins, or
`{#custom-id}` attributes from Sätteri's `headingAttributes` feature.

Ids come from [`github-slugger`](https://github.com/Flet/github-slugger), the same slugger
[`satteri-slug`](../satteri-slug) uses, so what is checked is what will actually be rendered —
including `-1`, `-2` numbering on duplicate headings.

### No repository or hosting awareness

`remark-validate-links` resolves links against a git remote and understands GitHub, GitLab and
Bitbucket URL shapes, so it can check a link written as a full `https://github.com/…/blob/…` URL.
This plugin treats anything with a scheme as external and does not look at it. There is no
`repository`, `urlConfig` or `root` option.

### Only links, and only on disk

Definitions (`[a]: ./x.md`), images, and HTML `<a href>` are not checked. Raw HTML is not reachable
in any case: Sätteri passes it through unparsed as `raw` nodes, so no element visitor ever sees it.

Anchors are only checked in files ending `.md`, `.mdx` or `.markdown`. An anchor on any other file
is assumed fine rather than guessed at.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-validate-links/LICENSE) © Ashish Vaghela
