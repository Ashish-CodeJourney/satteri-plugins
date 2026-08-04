---
"satteri-katex": minor
---

Render math at the MDAST stage instead of on HAST. Astro's Sätteri processor runs its syntax
highlighter ahead of user HAST plugins, which claimed `$$…$$` blocks as `plaintext` code before this
plugin could see them, so display math never rendered under Astro. Pass the plugin to
`mdastPlugins` rather than `hastPlugins`.
