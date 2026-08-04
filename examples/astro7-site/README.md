# Astro 7 example site

A real Astro 7 build using every plugin in this repo, deployed to
[GitHub Pages](https://ashish-codejourney.github.io/satteri-plugins) on each push to `main`.

Its purpose is verification, not decoration. The unit tests in each package drive `markdownToHtml`
directly, which cannot show how the plugins behave next to Astro's own — and Astro inserts plugins
both before and after yours. `test/build.test.ts` asserts on the HTML Astro writes to disk.

Both Astro ordering problems documented in the root README were found here, with every unit test
already green.

```sh
pnpm test:e2e    # from the repo root: builds this site and asserts on its output
pnpm dev         # from this directory
```
