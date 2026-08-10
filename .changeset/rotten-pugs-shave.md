---
"satteri-sanitize": patch
---

Fix a crash on a character reference outside the Unicode range. A URL such as
`<a href="&#99999999999;x">` made `String.fromCodePoint` throw `RangeError` and abort the whole
compile. The guard tested `Number.isFinite`, which does not help: `0xFFFFFFFF` is finite and still
out of range. References outside `0`–`0x10FFFF` are now left as written.

This is reachable from any untrusted Markdown, which is exactly the input this plugin exists to
handle.
