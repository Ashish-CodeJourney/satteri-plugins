# satteri-katex

## 0.3.0

### Minor Changes

- fd16b1b: Require Sätteri 0.11. The `satteri` peer range is now `^0.11.5`; Sätteri 0.10 is no longer supported.

## 0.2.0

### Minor Changes

- 3433973: Require Sätteri 0.10. The `satteri` peer range is now `^0.10.0`; Sätteri 0.9 is no longer supported.
- ce009f2: Update KaTeX to 0.19. Load the stylesheet from KaTeX 0.19, as 0.18 prefixed its CSS classes, and expect
  stricter `strict` reporting for missing character metrics. See the KaTeX release notes for
  [0.18.0](https://github.com/KaTeX/KaTeX/releases/tag/v0.18.0) and
  [0.19.0](https://github.com/KaTeX/KaTeX/releases/tag/v0.19.0).

## 0.1.1

### Patch Changes

- 18272ba: First release published through GitHub Actions with npm trusted publishing, so these tarballs carry
  a signed provenance attestation. `0.1.0` was published from a terminal to bootstrap the trusted
  publisher and has no attestation. No code changes.

## 0.1.0

### Minor Changes

- 11230cf: Render math at the MDAST stage instead of on HAST. Astro's Sätteri processor runs its syntax
  highlighter ahead of user HAST plugins, which claimed `$$…$$` blocks as `plaintext` code before this
  plugin could see them, so display math never rendered under Astro. Pass the plugin to
  `mdastPlugins` rather than `hastPlugins`.
- 80ff7be: Add `satteri-katex`, a port of `rehype-katex` that renders Sätteri's parsed math with KaTeX.
  Failing expressions become an escaped `katex-error` span instead of breaking the build.
