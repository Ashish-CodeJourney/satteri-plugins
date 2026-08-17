# satteri-plugins

[![CI](https://github.com/Ashish-CodeJourney/satteri-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashish-CodeJourney/satteri-plugins/actions/workflows/ci.yml)
[![Release](https://github.com/Ashish-CodeJourney/satteri-plugins/actions/workflows/release.yml/badge.svg)](https://github.com/Ashish-CodeJourney/satteri-plugins/actions/workflows/release.yml)
[![Example site](https://github.com/Ashish-CodeJourney/satteri-plugins/actions/workflows/pages.yml/badge.svg)](https://ashish-codejourney.github.io/satteri-plugins)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)
[![Types](https://img.shields.io/badge/types-included-3178c6.svg?logo=typescript&logoColor=white)](tsconfig.base.json)

Ports of the most-used [unified](https://unifiedjs.com) (remark/rehype) plugins to
[Sätteri](https://satteri.bruits.org), the Rust Markdown/MDX engine behind Astro 7.

Sätteri does not run remark or rehype plugins — it has its own AST, parser and serializer. Upgrading
for the speed means leaving your plugin stack behind. These are behaviour-compatible replacements,
each tested against the output of the plugin it replaces.

## Packages

| Package | npm | Replaces | What it does |
| --- | --- | --- | --- |
| [`satteri-slug`](packages/satteri-slug) | [![npm](https://img.shields.io/npm/v/satteri-slug.svg)](https://www.npmjs.com/package/satteri-slug) [![npm downloads](https://img.shields.io/npm/dm/satteri-slug.svg?label=downloads)](https://www.npmjs.com/package/satteri-slug) | `rehype-slug` | Adds `id` to every heading, via the same `github-slugger` |
| [`satteri-autolink-headings`](packages/satteri-autolink-headings) | [![npm](https://img.shields.io/npm/v/satteri-autolink-headings.svg)](https://www.npmjs.com/package/satteri-autolink-headings) [![npm downloads](https://img.shields.io/npm/dm/satteri-autolink-headings.svg?label=downloads)](https://www.npmjs.com/package/satteri-autolink-headings) | `rehype-autolink-headings` | Adds anchor links to headings |
| [`satteri-katex`](packages/satteri-katex) | [![npm](https://img.shields.io/npm/v/satteri-katex.svg)](https://www.npmjs.com/package/satteri-katex) [![npm downloads](https://img.shields.io/npm/dm/satteri-katex.svg?label=downloads)](https://www.npmjs.com/package/satteri-katex) | `rehype-katex` | Renders math with KaTeX |
| [`satteri-sanitize`](packages/satteri-sanitize) | [![npm](https://img.shields.io/npm/v/satteri-sanitize.svg)](https://www.npmjs.com/package/satteri-sanitize) [![npm downloads](https://img.shields.io/npm/dm/satteri-sanitize.svg?label=downloads)](https://www.npmjs.com/package/satteri-sanitize) | `rehype-sanitize` | Strips unsafe HTML, attributes and URLs |
| [`satteri-breaks`](packages/satteri-breaks) | [![npm](https://img.shields.io/npm/v/satteri-breaks.svg)](https://www.npmjs.com/package/satteri-breaks) [![npm downloads](https://img.shields.io/npm/dm/satteri-breaks.svg?label=downloads)](https://www.npmjs.com/package/satteri-breaks) | `remark-breaks` | Turns single newlines into `<br>` |
| [`satteri-mathjax`](packages/satteri-mathjax) | [![npm](https://img.shields.io/npm/v/satteri-mathjax.svg)](https://www.npmjs.com/package/satteri-mathjax) [![npm downloads](https://img.shields.io/npm/dm/satteri-mathjax.svg?label=downloads)](https://www.npmjs.com/package/satteri-mathjax) | `rehype-mathjax` | Renders math with MathJax |
| [`satteri-github`](packages/satteri-github) | [![npm](https://img.shields.io/npm/v/satteri-github.svg)](https://www.npmjs.com/package/satteri-github) [![npm downloads](https://img.shields.io/npm/dm/satteri-github.svg?label=downloads)](https://www.npmjs.com/package/satteri-github) | `remark-github` | Autolinks issues, mentions and SHAs |
| [`satteri-mdx-frontmatter`](packages/satteri-mdx-frontmatter) | [![npm](https://img.shields.io/npm/v/satteri-mdx-frontmatter.svg)](https://www.npmjs.com/package/satteri-mdx-frontmatter) [![npm downloads](https://img.shields.io/npm/dm/satteri-mdx-frontmatter.svg?label=downloads)](https://www.npmjs.com/package/satteri-mdx-frontmatter) | `remark-mdx-frontmatter` | Exposes MDX frontmatter as exports |
| [`satteri-validate-links`](packages/satteri-validate-links) | [![npm](https://img.shields.io/npm/v/satteri-validate-links.svg)](https://www.npmjs.com/package/satteri-validate-links) [![npm downloads](https://img.shields.io/npm/dm/satteri-validate-links.svg?label=downloads)](https://www.npmjs.com/package/satteri-validate-links) | `remark-validate-links` | Finds links to missing files and headings |

Live example, built by Astro 7 in CI: **https://ashish-codejourney.github.io/satteri-plugins**
([source](examples/astro7-site))

## Replacing your remark/rehype plugins

Much of what needed a plugin under unified is **built into Sätteri**. Check here before looking for
a port.

### Built in — delete the plugin

| Plugin | Replacement |
| --- | --- |
| `remark-gfm` | `features.gfm` (**on by default**) — tables, footnotes, strikethrough, tasklists, autolinks |
| `remark-frontmatter` | `features.frontmatter` (**on by default**) — YAML and TOML |
| `remark-math` | `features.math` — parsing only, pair with [`satteri-katex`](packages/satteri-katex) to render |
| `remark-directive` | `features.directive` |
| `remark-smartypants` | `features.smartPunctuation` |
| `remark-parse`, `remark-stringify`, `remark-rehype`, `rehype-parse`, `rehype-stringify` | The pipeline itself |
| `remark-wiki-link` | `features.wikilinks` |
| `remark-sup`, `remark-sub` | `features.superscript`, `features.subscript` |
| `remark-definition-list` | `features.definitionList` |
| Custom `{#id}` heading syntax | `features.headingAttributes` |

Sätteri does **not** generate heading ids on its own — that is what
[`satteri-slug`](packages/satteri-slug) is for.

### Ported here

| Plugin | Port |
| --- | --- |
| `rehype-slug` | [`satteri-slug`](packages/satteri-slug) |
| `rehype-autolink-headings` | [`satteri-autolink-headings`](packages/satteri-autolink-headings) |
| `rehype-katex` | [`satteri-katex`](packages/satteri-katex) |
| `rehype-sanitize` | [`satteri-sanitize`](packages/satteri-sanitize) |
| `remark-breaks` | [`satteri-breaks`](packages/satteri-breaks) |
| `rehype-mathjax` | [`satteri-mathjax`](packages/satteri-mathjax) |
| `remark-github` | [`satteri-github`](packages/satteri-github) |
| `remark-mdx-frontmatter` | [`satteri-mdx-frontmatter`](packages/satteri-mdx-frontmatter) |

### Already covered by the community

| Plugin | Use instead |
| --- | --- |
| `rehype-external-links` | `satteri-external-links` |
| `remark-emoji` | `satteri-emoji` |
| `remark-toc` | `@bhdouglass/satteri-toc`, `pretty-toc` |
| `rehype-mermaid` | `satteri-beautiful-mermaid`, `@xingwangzhe/satteri-mermaid` |
| `rehype-github-alerts`, `remark-github-blockquote-alert` | `satteri-callouts` |
| Code highlighting | `satteri-expressive-code` |
| MDX auto-imports | `@bhdouglass/satteri-auto-imports`, `@xsynaptic/satteri-auto-import` |

### Not ported yet

A `unified` compatibility shim is the one left worth building. It is wanted, but Sätteri's one-pass
model means a documented support matrix rather than a drop-in adapter. Contributions welcome.

### Not needed

`rehype-highlight` — Astro 7 already highlights code blocks with Shiki, with no plugin at all. Port
this only if you have existing highlight.js CSS themes to keep. For richer rendering, see
[`satteri-expressive-code`](https://www.npmjs.com/package/satteri-expressive-code) or
[Treelight](https://www.npmjs.com/package/@treelight/plugin-astro).

## Security

Sätteri passes raw HTML through unparsed, so Markdown from an untrusted source is an XSS vector by
default. If any of your content is user-supplied, run
[`satteri-sanitize`](packages/satteri-sanitize) last in your `hastPlugins`.

### Supply chain

Every package is published from CI by [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
over OIDC. There is no long-lived npm token in this repository or in any maintainer's shell, so
there is no token to steal.

Releases carry [SLSA](https://slsa.dev) provenance attestations linking the tarball to the commit
and workflow that built it. Verify them yourself:

```sh
npm audit signatures
```

The first `0.1.0` of `satteri-breaks`, `satteri-mathjax`, `satteri-github` and
`satteri-mdx-frontmatter` was published by hand to bootstrap trusted publishing, so those four
versions carry no attestation. Their next release does.

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Using these with Astro 7

Two things about Astro's Sätteri processor are worth knowing before you wire anything up, because
both are invisible until your output is wrong. Astro composes the plugin list as:

```
[ syntax highlighter ] → [ your hastPlugins ] → [ image marker ] → [ heading ids ]
```

1. **Pass `satteri-katex` to `mdastPlugins`, not `hastPlugins`.** The highlighter runs first and, on
   HAST, display math is still a `<pre><code>` — so it gets highlighted as a `plaintext` code block
   and never reaches a HAST math plugin.
2. **`satteri-slug` is a prerequisite for `satteri-autolink-headings`.** Astro assigns heading ids
   *after* your plugins, so without `satteri-slug` the headings have no `id` yet and every anchor is
   skipped.
3. **`satteri()` accepts only `mdastPlugins`, `hastPlugins` and `features`.** Anything else you pass
   it — `shikiConfig`, `gfm`, `smartypants` — is silently dropped. Those belong one level up, on
   `markdown`, alongside `processor`.
4. **A returned plugin definition is reused across every compile.** `MdastPluginInput` also accepts a
   factory (`() => defineMdastPlugin(...)`), and that is the only way to get per-document state. Any
   plugin holding a counter, a dedupe set or an emit-once flag must return a factory or it will leak
   state between pages, silently. There is also no root or end-of-document hook, so a plugin cannot
   append output after traversal.
5. **`ctx.report()` diagnostics never reach you.** They are collected per visitor and readable only
   through `ctx.getDiagnostics()` inside a plugin. `markdownToHtml` returns
   `{ html, frontmatter, data }` with no diagnostics field, and Astro's processor never reads them.
   A plugin that wants to surface warnings has to write them into `ctx.data`, which *is* returned as
   `result.data`, or print them itself.

```js
export default defineConfig({
  markdown: {
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" } },
    processor: satteri({
      features: { math: true },
      mdastPlugins: [satteriKatex()],
      hastPlugins: [satteriSlug(), satteriAutolinkHeadings()],
    }),
  },
});
```

## How these ports are built

Every package follows the same method:

1. **Characterise.** Run the original plugin over a fixture corpus and capture its HTML. That output
   is the specification — not the original's source code.
2. **Test first.** Each behaviour gets a failing test asserting the captured HTML before any
   implementation exists.
3. **Mutation-test.** Deliberately break the implementation and confirm a test catches it. Anything
   that survives is a missing test or dead code, and gets fixed either way.
4. **Verify in a real build.** `pnpm test:e2e` builds [`examples/astro7-site`](examples/astro7-site)
   with Astro 7 and asserts on the HTML on disk. Both Astro ordering problems above were found this
   way, after the unit tests were already green.
5. **Document divergences.** Where Sätteri's model makes exact parity impossible, each README says so
   under *Differences from …*.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ports are held to the method above — a PR that skips the
characterisation or mutation steps will be asked to redo them.

## Development

```sh
pnpm install
pnpm test        # unit tests
pnpm -r typecheck
pnpm -r build
pnpm test:e2e    # builds the example site with Astro 7 and asserts on its HTML
```

## Licence

[MIT](LICENSE) © Ashish Vaghela
