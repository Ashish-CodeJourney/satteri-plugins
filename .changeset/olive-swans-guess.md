---
"satteri-sanitize": minor
---

Add `satteri-sanitize`, a port of `rehype-sanitize`. Sätteri passes raw HTML through unparsed, so
`<script>` in a Markdown document reaches the page verbatim; this strips disallowed elements,
attributes and URL protocols, including from Markdown-generated links and images.
