# satteri-sanitize

## 0.1.1

### Patch Changes

- 2cc04b1: Stop double-escaping character references the author already wrote: `AT&amp;T` was becoming
  `AT&#x26;amp;T`, in text and in attribute values. An unterminated reference is still escaped.

  Export `defaultTagNames`, `defaultAttributes` and `defaultProtocols` so the allowlist can be widened
  without retyping it.

## 0.1.0

### Minor Changes

- 62bfa65: Add `satteri-sanitize`, a port of `rehype-sanitize`. Sätteri passes raw HTML through unparsed, so
  `<script>` in a Markdown document reaches the page verbatim; this strips disallowed elements,
  attributes and URL protocols, including from Markdown-generated links and images.
