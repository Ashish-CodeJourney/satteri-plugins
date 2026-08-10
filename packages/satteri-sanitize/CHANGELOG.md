# satteri-sanitize

## 0.1.2

### Patch Changes

- edb8524: Fix a crash on a character reference outside the Unicode range. A URL such as
  `<a href="&#99999999999;x">` made `String.fromCodePoint` throw `RangeError` and abort the whole
  compile. The guard tested `Number.isFinite`, which does not help: `0xFFFFFFFF` is finite and still
  out of range. References outside `0`–`0x10FFFF` are now left as written.

  This is reachable from any untrusted Markdown, which is exactly the input this plugin exists to
  handle.

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
