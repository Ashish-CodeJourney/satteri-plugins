---
"satteri-sanitize": patch
---

Stop double-escaping character references the author already wrote: `AT&amp;T` was becoming
`AT&#x26;amp;T`, in text and in attribute values. An unterminated reference is still escaped.

Export `defaultTagNames`, `defaultAttributes` and `defaultProtocols` so the allowlist can be widened
without retyping it.
