# satteri-github

[Sätteri](https://satteri.bruits.org) MDAST plugin that autolinks GitHub references — issues, pull
requests, mentions and commits — a port of
[`remark-github`](https://github.com/remarkjs/remark-github).

GitHub turns `#12`, `@user` and a commit SHA into links inside issues, PRs and release notes, but
that is a GitHub feature, not Markdown. Rendering the same file on your own site loses every one of
those links. This plugin puts them back.

```md
See #12, thanks @user, fixed in a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0.
```

## Install

```sh
npm install satteri-github
```

## Use

```js
import { markdownToHtml } from "satteri";
import { satteriGithub } from "satteri-github";

const { html } = markdownToHtml("See #12, thanks @user.", {
  mdastPlugins: [satteriGithub({ repository: "user/project" })],
});
// <p>See <a href="https://github.com/user/project/issues/12">#12</a>,
// thanks <a href="https://github.com/user"><strong>@user</strong></a>.</p>
```

It runs at the **MDAST** stage, so pass it to `mdastPlugins`.

With Astro 7:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";
import { satteriGithub } from "satteri-github";

export default defineConfig({
  markdown: {
    processor: satteri({
      mdastPlugins: [satteriGithub({ repository: "user/project" })],
    }),
  },
});
```

## API

### `satteriGithub(options)`

#### `options.repository` (`string`, required)

The repository references resolve against. Accepts `user/project` or a GitHub URL such as
`https://github.com/user/project`. There is no default: without it `#12` has no meaning.

The value is parsed when you call `satteriGithub(...)`, so a missing or unparseable repository throws
immediately at config time rather than silently producing no links.

#### `options.mentionStrong` (`boolean`, default `true`)

Wrap mention text in `strong`, as GitHub does. Set to `false` for a plain link.

```js
satteriGithub({ repository: "user/project", mentionStrong: false });
// @user -> <a href="https://github.com/user">@user</a>
```

## What it links

With `repository: "user/project"`:

| Markdown | Link target | Link text |
| --- | --- | --- |
| `#12` | `user/project/issues/12` | `#12` |
| `GH-12`, `gh-12` | `user/project/issues/12` | as written |
| `user/project#12` | `user/project/issues/12` | `#12` |
| `other/project#12` | `other/project/issues/12` | `other#12` |
| `other/repo#12` | `other/repo/issues/12` | `other/repo#12` |
| `other#12` | `other/project/issues/12` | `other#12` |
| `@user` | `github.com/user` | **`@user`** |
| `@user/team` | `github.com/user/team` | **`@user/team`** |
| `a1b2c3d4…` (7–40 hex) | `user/project/commit/<full sha>` | `` `a1b2c3d` `` |
| `user/project@<sha>` | `user/project/commit/<sha>` | ``@`a1b2c3d` `` |
| `other/repo@<sha>` | `other/repo/commit/<sha>` | ``other/repo@`a1b2c3d` `` |
| `<sha>...<sha>` | `user/project/compare/<sha>...<sha>` | `` `a1b2c3d...b1b2c3d` `` |

The repository prefix is dropped from the link *text* when it matches the configured repository, and
shortened to just the user when only the project matches — the same abbreviation GitHub applies.
Commit SHAs are shortened to **7 characters** in the text while the URL keeps the full SHA.

## What it does not link

| Markdown | Why |
| --- | --- |
| `` `#12` `` and fenced code | code is `inlineCode` / `code`, never text |
| `[#12](https://example.com)` | no link inside a link |
| `#0`, `GH-0` | issue numbers start at 1 |
| `#12x`, `GH-12x` | a reference may not be followed by a word character |
| `a@user`, `email@example.com` | a mention may not follow a word character |
| `@mention`, `@mentions` | GitHub stopped linking these in 2019 |
| `@-user`, `@_user`, `@user_name` | not valid GitHub usernames |
| `a1b2c3` | fewer than 7 hex characters |
| `acceded`, `deedeed`, `defaced`, `effaced`, `fabaceae` | English words that are also valid short SHAs |
| `-<sha>`, `,<sha>`, `.<sha>` | a SHA may only follow whitespace, `(`, `@`, `[`, `{` or `..` |

Code is untouched for a structural reason rather than a special case: Sätteri represents fenced and
inline code as `code` and `inlineCode` nodes, not text, so a text visitor never sees them. Link text
*is* a text node, so the plugin checks the parent node type and skips `link` and `linkReference`.

## Differences from `remark-github`

This is a deliberate subset. Everything in the tables above matches `remark-github`'s output exactly
(verified against it fixture by fixture). What is **not** implemented:

- **`buildUrl`** — there is no way to override URL construction or to suppress a link type. Links
  always point at `https://github.com`, so self-hosted GitHub Enterprise is not supported.
- **Rewriting existing GitHub URLs.** `remark-github` shortens the *text* of a link you wrote
  yourself, turning `[…](https://github.com/user/project/issues/12)` into `#12`. This plugin leaves
  every existing link alone. Note that Sätteri autolinks bare URLs by default (GFM autolink
  literals), so a pasted GitHub URL is already a link before this plugin runs, and stays as it is.
- **The `(comment)` suffix** on links to issue and PR comments, which is part of that URL rewriting.

If you rely on any of these, use `remark-github` instead.

Two smaller notes:

- An invalid `repository` throws when you call `satteriGithub(...)`, not during the compile as in
  `remark-github`. The message text is the same.
- The `git@github.com:user/project.git` SSH form is not accepted, matching `remark-github`.

The implementation differs too. `remark-github` uses `mdast-util-find-and-replace` over the whole
tree; here each text node is scanned by the five patterns in turn, split into pieces, and written
back with `ctx.replaceNode` for the first piece plus `ctx.insertAfter` for the rest — Sätteri's
`replaceNode` takes a single node, not an array. A piece that has already become a link is frozen
against later patterns, which is what stops `user/project@<sha>` from also matching as a bare SHA.

## Licence

[MIT](https://github.com/Ashish-CodeJourney/satteri-plugins/blob/main/packages/satteri-github/LICENSE) © Ashish Vaghela
