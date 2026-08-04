# satteri-plugins

Ports of the most-used [unified](https://unifiedjs.com) (remark/rehype) plugins to
[Sätteri](https://satteri.bruits.org), the Rust Markdown/MDX engine behind Astro 7.

Sätteri does not run remark or rehype plugins — it has its own AST, parser and serializer. Upgrading
for the speed means leaving your plugin stack behind. These are behaviour-compatible replacements,
each tested against the output of the plugin it replaces.

## Packages

| Package | Replaces | What it does |
| --- | --- | --- |
| [`satteri-slug`](packages/satteri-slug) | `rehype-slug` | Adds `id` to every heading, via the same `github-slugger` |
| [`satteri-autolink-headings`](packages/satteri-autolink-headings) | `rehype-autolink-headings` | Adds anchor links to headings |
| [`satteri-katex`](packages/satteri-katex) | `rehype-katex` | Renders math with KaTeX |

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

### Already covered by the community

| Plugin | Use instead |
| --- | --- |
| `rehype-external-links` | `satteri-external-links` |
| `remark-emoji` | `satteri-emoji` |
| `remark-toc` | `@bhdouglass/satteri-toc`, `pretty-toc` |
| `rehype-mermaid` | `satteri-beautiful-mermaid`, `@xingwangzhe/satteri-mermaid` |
| `rehype-github-alerts`, `remark-github-blockquote-alert` | `satteri-callouts` |
| `remark-breaks` | `@minittupoyo/satteri-breaks` |
| Code highlighting | `satteri-expressive-code` |
| MDX auto-imports | `@bhdouglass/satteri-auto-imports`, `@xsynaptic/satteri-auto-import` |

### Not ported yet

`rehype-sanitize`, `rehype-mathjax`, `rehype-highlight`, `remark-validate-links`, and a
`unified` compatibility shim. Contributions welcome.

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

```js
export default defineConfig({
  markdown: {
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

## Development

```sh
pnpm install
pnpm test        # unit tests
pnpm -r typecheck
pnpm -r build
pnpm test:e2e    # builds the example site with Astro 7 and asserts on its HTML
```

## Licence

MIT
