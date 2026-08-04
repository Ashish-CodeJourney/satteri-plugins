# Contributing

Thanks for considering a contribution. This repo ports [unified](https://unifiedjs.com)
(remark/rehype) plugins to [Sätteri](https://satteri.bruits.org), and the porting method matters
more than the code style — please read the method section before opening a PR.

## Getting started

```sh
git clone https://github.com/Ashish-CodeJourney/satteri-plugins.git
cd satteri-plugins
pnpm install
pnpm build        # packages resolve each other through dist, so build first
pnpm test         # unit tests
pnpm test:e2e     # builds the Astro 7 example site and asserts on its HTML
```

`pnpm build` before `pnpm test:e2e` and before any typecheck: packages import each other through
their published `exports`, which point at `dist`.

## How a port is built

Every package in this repo was built the same way. A PR that skips these steps will be asked to
redo them, so start here rather than with the implementation.

### 1. Characterise the original

Run the **real** remark/rehype plugin over a corpus of fixtures and capture its HTML. That captured
output is the specification — not the original plugin's source code, and not your reading of its
README. Ports written from source tend to reproduce implementation details and miss behaviour.

```js
const html = String(
  await unified().use(remarkParse).use(remarkRehype).use(theOriginalPlugin).use(rehypeStringify)
    .process("## Hello, World! (again)"),
);
```

Include the awkward cases: empty input, duplicates, unicode, nested inline markup, punctuation-only
content, every option in the original's README.

### 2. Write the failing test first

Assert the captured HTML. No production code before a failing test — this is not negotiable here.

Tests assert on **rendered HTML**, never on AST internals. Use the `render` helper from
`@satteri-plugins/test-kit` so every package shares one signature.

### 3. Make it pass

Simplest thing that works.

### 4. Mutation-test it

Break the implementation deliberately and confirm a test fails. A mutant that survives means either
a missing test or dead code — fix whichever it is.

```sh
# Change a default, invert a condition, drop an escape, remove a filter entry.
# Then: pnpm test — something must go red.
```

This is where the real bugs were found in this repo. In `satteri-katex` it exposed an XSS test that
proved nothing, because KaTeX renders `<img src=x>` successfully and the test never reached the
error path it claimed to cover.

### 5. Verify in a real build

Add the plugin to `examples/astro7-site` and run `pnpm test:e2e`. Astro injects its own plugins both
before and after yours, and unit tests cannot see that. Both Astro ordering bugs documented in the
README were found this way, with every unit test already green.

### 6. Document divergences

Where Sätteri's model makes exact parity impossible, say so in the package README under
**Differences from `<original>`**. Silent divergence is the thing that makes a port untrustworthy.

## Code style

- TypeScript strict. No `any`, no type assertions without a comment justifying them.
- Immutable data; no mutation of inputs.
- Use the real `hast` / `satteri` types rather than hand-rolled shapes.
- No comments restating the code. Comment *why*, especially where Sätteri's engine forced a choice.
- Small, pure functions. Early returns over nested conditionals.

## Choosing what to port

Check the migration table in the [README](README.md) first. Much of what needed a plugin under
unified is a Sätteri **parser feature** — `gfm` and `frontmatter` are on by default, and `math`,
`directive`, `smartPunctuation`, `wikilinks` and others are one flag away. Those need no port.

Also search npm for `satteri` before starting: the ecosystem moves fast, and duplicating a working
community plugin helps nobody. If a good one exists, a PR adding it to the README table is a genuine
contribution.

## Pull requests

- One plugin (or one fix) per PR.
- Add a changeset: `pnpm changeset`. Patch for fixes, minor for new plugins or options.
- Say in the description what you characterised against and which mutants you killed.
- CI must pass on Node 20, 22 and 24.

## Releases

Releases are automated. Merging to `main` opens a "Version Packages" PR; merging that publishes to
npm from GitHub Actions using [trusted publishing](https://docs.npmjs.com/trusted-publishers/), so
no npm token exists anywhere in this repo. Maintainers do not publish by hand.

## Reporting bugs

Include the markdown input, the HTML you got, the HTML you expected, and your `satteri` and
`astro` versions. If the original remark/rehype plugin produces different output, include that too —
it is usually the fastest route to a fix.

## Licence

By contributing you agree that your contributions are licensed under the [MIT Licence](LICENSE).
