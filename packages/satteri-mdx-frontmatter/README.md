# satteri-mdx-frontmatter

[Sätteri](https://satteri.bruits.org) MDAST plugin that turns a document's frontmatter into an MDX
export, a port of
[`remark-mdx-frontmatter`](https://github.com/remcohaszing/remark-mdx-frontmatter).

Sätteri parses frontmatter on its own and hands the raw block back to you on the compile result, but
it never reaches the compiled module. Write this:

```mdx
---
title: Hello
---

# {frontmatter.title}
```

and without this plugin the compiled JavaScript refers to a `frontmatter` that is not declared
anywhere — the module throws the moment it renders. This plugin prepends
`export const frontmatter = {"title": "Hello"};`, so the expression resolves and anything importing
the compiled module can read the metadata too.

## Install

```sh
npm install satteri-mdx-frontmatter
```

YAML works out of the box. TOML does not: `+++` blocks need a parser passed in, see
[`options.parsers`](#optionsparsers).

## Use

```js
import { mdxToJs } from "satteri";
import { satteriMdxFrontmatter } from "satteri-mdx-frontmatter";

const { code } = await mdxToJs("---\ntitle: Hello\n---\n\n# {frontmatter.title}\n", {
  mdastPlugins: [satteriMdxFrontmatter()],
});
// export const frontmatter = { "title": "Hello" };
// …
// function _createMdxContent(props) { … frontmatter.title … }
```

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriMdxFrontmatter } from "satteri-mdx-frontmatter";

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriMdxFrontmatter()],
    }),
  },
});
```

## API

### `satteriMdxFrontmatter(options?)`

#### `options.name`

`string`, default `"frontmatter"`. The identifier the data is exported as. It must be a plain
JavaScript identifier (`/^[A-Za-z_$][A-Za-z0-9_$]*$/`) and not a reserved word; anything else throws
immediately rather than emitting a module that will not parse.

#### `options.parsers`

`Record<string, (value: string) => unknown>`, default `{}`. A parser per frontmatter node type:
`yaml` for `--- … ---` blocks, `toml` for `+++ … +++` blocks. The parser receives the raw text
between the fences and returns the data.

A frontmatter block whose type has no registered parser throws. Parser errors are not caught — bad
frontmatter fails the build, as it does with `remark-mdx-frontmatter`.

## What gets emitted

The parsed value is written out as a JavaScript expression, so the export is real data rather than a
string:

| Frontmatter | Emitted |
| --- | --- |
| `title: Hello` | `export const frontmatter = { "title": "Hello" };` |
| a bare scalar | `export const frontmatter = "just a string";` |
| a sequence | `export const frontmatter = ["a", "b"];` |
| an empty block | `export const frontmatter = null;` (whatever the parser returns) |
| a parser returning `undefined` | `export const frontmatter = undefined;` |

Serialisation is deliberately not `JSON.stringify`:

- a `__proto__` key is emitted as a computed key, so frontmatter cannot reassign the exported
  object's prototype;
- `NaN` and `Infinity` survive instead of collapsing to `null`;
- `Date` values become `new Date("…")` rather than a string;
- `BigInt` values become bigint literals;
- `undefined` is expressible, both at the top level and as a whole value.

Otherwise JSON's rules hold: `undefined` object values are dropped, `undefined` array items become
`null`, and circular data is an error — thrown with a clear message rather than overflowing the
stack.

## Differences from `remark-mdx-frontmatter`

### TOML needs a parser passed in

`remark-mdx-frontmatter` depends on both [`yaml`](https://github.com/eemeli/yaml) and
[`toml`](https://github.com/BinaryMuse/toml-node). This package depends on `yaml` only, so YAML works
with no configuration and TOML needs a parser through `options.parsers`. You pay for a TOML parser
only if you use TOML, and you can still swap the YAML implementation by passing your own.

### No export when there is no frontmatter

`remark-mdx-frontmatter` operates on the document root, so it always defines the export — falling
back to its `default` option, or `undefined`. Sätteri's MDAST visitor API subscribes to node types
and has no root or document hook, so this plugin only runs when a `yaml` or `toml` node exists. A
document with no frontmatter gets no export at all, and `{frontmatter.title}` in such a document
still fails.

Because that fallback is unreachable, the `default` option is not implemented rather than being
offered and silently ignored.

### No named-exports mode

Early versions of `remark-mdx-frontmatter` could export each top-level key as its own binding. v5
does not — `name` defaults to `"frontmatter"` and there is no way to opt out — and neither does this
plugin. Destructure at the use site instead.

### No `unist-util-mdx-define` options

`remark-mdx-frontmatter` forwards `export` (`'module' | 'namespace' | false`) and `conflict`
(`'skip' | 'throw' | 'warn'`) to
[`unist-util-mdx-define`](https://github.com/remcohaszing/unist-util-mdx-define). This plugin always
emits a module-level `export const` and does not detect name conflicts with a binding the document
declares itself; such a conflict surfaces as a JavaScript parse error from Sätteri.

### Serialisation is narrower

`remark-mdx-frontmatter` builds an ESTree expression with
[`estree-util-value-to-estree`](https://github.com/remcohaszing/estree-util-value-to-estree), which
also handles `RegExp`, `Map`, `Set`, `URL`, typed arrays, and shared references via
`preserveReferences`. This plugin emits source text and covers JSON-like data plus `Date` and
`BigInt`. A repeated reference is written out twice rather than being made identical again; anything
else is serialised as a plain object, the way JSON would.

### Markdown compiles are left alone

The same plugin can sit in a config shared between Markdown and MDX. In a plain Markdown compile
there is no module to export into, so the plugin does nothing at all — it does not parse the block
and does not require a parser to be registered.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-mdx-frontmatter/LICENSE) © Ashish Vaghela
