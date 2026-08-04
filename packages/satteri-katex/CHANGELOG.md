# satteri-katex

## 0.1.0

### Minor Changes

- 11230cf: Render math at the MDAST stage instead of on HAST. Astro's Sätteri processor runs its syntax
  highlighter ahead of user HAST plugins, which claimed `$$…$$` blocks as `plaintext` code before this
  plugin could see them, so display math never rendered under Astro. Pass the plugin to
  `mdastPlugins` rather than `hastPlugins`.
- 80ff7be: Add `satteri-katex`, a port of `rehype-katex` that renders Sätteri's parsed math with KaTeX.
  Failing expressions become an escaped `katex-error` span instead of breaking the build.
