---
"satteri-validate-links": minor
---

Add an `ignore` option: a predicate over the link destination, for links that should not be checked.

The reason it exists is framework routes. A static site generator maps `./about` to a page, but
there is no `./about` on disk, so checking the filesystem reports a link that works perfectly well.
Wiring the plugin into the Astro example site turned every route link into a false positive.
