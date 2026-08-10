# satteri-validate-links

## 0.2.0

### Minor Changes

- c13bb13: Add an `ignore` option: a predicate over the link destination, for links that should not be checked.

  The reason it exists is framework routes. A static site generator maps `./about` to a page, but
  there is no `./about` on disk, so checking the filesystem reports a link that works perfectly well.
  Wiring the plugin into the Astro example site turned every route link into a false positive.

## 0.1.0

### Minor Changes

- ae7d393: First release. Checks that `#anchor` links resolve to a heading in the document, that relative file
  links exist on disk, and that `./other.md#anchor` links find a heading in the target file. External
  links are left alone and no network request is ever made.

  Findings are collected on `result.data`, because Sätteri's `ctx.report()` diagnostics reach nobody.
  `intoAstroFrontmatter` additionally copies them onto `data.astro.frontmatter`, which is the only
  channel a plugin has to an Astro page.
