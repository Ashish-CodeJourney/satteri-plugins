# satteri-validate-links

## 0.1.0

### Minor Changes

- ae7d393: First release. Checks that `#anchor` links resolve to a heading in the document, that relative file
  links exist on disk, and that `./other.md#anchor` links find a heading in the target file. External
  links are left alone and no network request is ever made.

  Findings are collected on `result.data`, because Sätteri's `ctx.report()` diagnostics reach nobody.
  `intoAstroFrontmatter` additionally copies them onto `data.astro.frontmatter`, which is the only
  channel a plugin has to an Astro page.
