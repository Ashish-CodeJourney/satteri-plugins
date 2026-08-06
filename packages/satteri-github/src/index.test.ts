import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriGithub } from "./index.js";

const gh = (markdown: string, options: { readonly mentionStrong?: boolean } = {}) =>
  render(markdown, {
    mdastPlugins: [satteriGithub({ repository: "user/project", ...options })],
  });

/** The same markdown without the plugin, to show what actually changed. */
const plain = (markdown: string) => render(markdown);

const SHA = "a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0";
const OTHER_SHA = "b1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0";

describe("satteri-github", () => {
  describe("issue references", () => {
    it("links a bare hash reference", async () => {
      expect(await gh("#12")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">#12</a></p>',
      );
    });

    it("leaves the reference alone without the plugin", async () => {
      expect(await plain("#12")).toBe("<p>#12</p>");
    });

    it("links a GH- reference", async () => {
      expect(await gh("GH-12")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">GH-12</a></p>',
      );
    });

    it("links a GH- reference case-insensitively and keeps the original casing", async () => {
      expect(await gh("gh-12")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">gh-12</a></p>',
      );
      expect(await gh("Gh-12")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">Gh-12</a></p>',
      );
    });

    it("does not link issue zero", async () => {
      expect(await gh("#0")).toBe("<p>#0</p>");
      expect(await gh("GH-0")).toBe("<p>GH-0</p>");
    });

    it("does not link a reference followed by a word character", async () => {
      expect(await gh("#12x")).toBe("<p>#12x</p>");
      expect(await gh("GH-12x")).toBe("<p>GH-12x</p>");
    });

    it("links a reference followed by punctuation", async () => {
      expect(await gh("(#12)")).toBe(
        '<p>(<a href="https://github.com/user/project/issues/12">#12</a>)</p>',
      );
    });

    it("links several references in one paragraph", async () => {
      expect(await gh("#12 #13")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">#12</a> ' +
          '<a href="https://github.com/user/project/issues/13">#13</a></p>',
      );
    });

    it("drops the repository from the text when it is the configured one", async () => {
      expect(await gh("user/project#12")).toBe(
        '<p><a href="https://github.com/user/project/issues/12">#12</a></p>',
      );
    });

    it("keeps the full repository in the text for another repository", async () => {
      expect(await gh("other/repo#12")).toBe(
        '<p><a href="https://github.com/other/repo/issues/12">other/repo#12</a></p>',
      );
    });

    it("keeps only the user in the text when the project matches", async () => {
      expect(await gh("other/project#12")).toBe(
        '<p><a href="https://github.com/other/project/issues/12">other#12</a></p>',
      );
    });

    it("treats a bare user prefix as that user's fork of the configured project", async () => {
      expect(await gh("word#12")).toBe(
        '<p><a href="https://github.com/word/project/issues/12">word#12</a></p>',
      );
    });

    it("accepts dots and hyphens in a project name", async () => {
      expect(await gh("my-org/my.repo#12")).toBe(
        '<p><a href="https://github.com/my-org/my.repo/issues/12">my-org/my.repo#12</a></p>',
      );
    });

    it("prefers the scoped reference over the bare hash when a project name ends in a dot", async () => {
      expect(await gh("other/re.po.#12")).toBe(
        '<p><a href="https://github.com/other/re.po./issues/12">other/re.po.#12</a></p>',
      );
    });

    it("does not link a scoped reference that follows punctuation", async () => {
      expect(await gh("-other/repo#12")).toBe("<p>-other/repo#12</p>");
      expect(await gh(",other/repo#12")).toBe("<p>,other/repo#12</p>");
    });

    it("links a reference inside a heading", async () => {
      expect(await gh("# heading #12")).toBe(
        '<h1>heading <a href="https://github.com/user/project/issues/12">#12</a></h1>',
      );
    });

    it("links a reference inside a list item", async () => {
      expect(await gh("- item #12")).toContain(
        '<a href="https://github.com/user/project/issues/12">#12</a>',
      );
    });
  });

  describe("mentions", () => {
    it("links a mention and bolds it", async () => {
      expect(await gh("@user")).toBe(
        '<p><a href="https://github.com/user"><strong>@user</strong></a></p>',
      );
    });

    it("links a team mention", async () => {
      expect(await gh("@user/team")).toBe(
        '<p><a href="https://github.com/user/team"><strong>@user/team</strong></a></p>',
      );
    });

    it("omits the bold when mentionStrong is false", async () => {
      expect(await gh("@user", { mentionStrong: false })).toBe(
        '<p><a href="https://github.com/user">@user</a></p>',
      );
    });

    it("keeps the mention casing in the url", async () => {
      expect(await gh("@UsEr")).toBe(
        '<p><a href="https://github.com/UsEr"><strong>@UsEr</strong></a></p>',
      );
    });

    it("does not link the words mention and mentions", async () => {
      expect(await gh("@mention")).toBe("<p>@mention</p>");
      expect(await gh("@mentions")).toBe("<p>@mentions</p>");
    });

    it("does not link a username starting with a hyphen or underscore", async () => {
      expect(await gh("@-user")).toBe("<p>@-user</p>");
      expect(await gh("@_user")).toBe("<p>@_user</p>");
    });

    it("links a username ending with a hyphen", async () => {
      expect(await gh("@user-")).toBe(
        '<p><a href="https://github.com/user-"><strong>@user-</strong></a></p>',
      );
    });

    it("does not link a name containing an underscore", async () => {
      expect(await gh("@user_name")).toBe("<p>@user_name</p>");
    });

    it("stops the username at a dot", async () => {
      expect(await gh("@user.name")).toBe(
        '<p><a href="https://github.com/user"><strong>@user</strong></a>.name</p>',
      );
    });

    it("does not link a mention preceded by a word character", async () => {
      expect(await gh("a@user")).toBe("<p>a@user</p>");
    });

    it("leaves an email address to Sätteri's own autolinking", async () => {
      expect(await gh("email@example.com")).toBe(await plain("email@example.com"));
    });

    it("does not link a three-segment path", async () => {
      expect(await gh("@user/team/sub")).toBe("<p>@user/team/sub</p>");
    });

    it("links several mentions in one paragraph", async () => {
      expect(await gh("@user @user")).toBe(
        '<p><a href="https://github.com/user"><strong>@user</strong></a> ' +
          '<a href="https://github.com/user"><strong>@user</strong></a></p>',
      );
    });

    it("links a mention inside emphasis", async () => {
      expect(await gh("_@user_")).toBe(
        '<p><em><a href="https://github.com/user"><strong>@user</strong></a></em></p>',
      );
    });
  });

  describe("commit hashes", () => {
    it("links a full sha and abbreviates the text to seven characters", async () => {
      expect(await gh(SHA)).toBe(
        `<p><a href="https://github.com/user/project/commit/${SHA}"><code>a1b2c3d</code></a></p>`,
      );
    });

    it("links a seven character sha", async () => {
      expect(await gh("a1b2c3d")).toBe(
        '<p><a href="https://github.com/user/project/commit/a1b2c3d"><code>a1b2c3d</code></a></p>',
      );
    });

    it("does not link a six character sha", async () => {
      expect(await gh("a1b2c3")).toBe("<p>a1b2c3</p>");
    });

    it("does not link forty-one hex characters", async () => {
      expect(await gh(`${SHA}1`)).toBe(`<p>${SHA}1</p>`);
    });

    it("does not link a sha followed by a non-hex word character", async () => {
      expect(await gh("a1b2c3dg")).toBe("<p>a1b2c3dg</p>");
    });

    it("links an uppercase sha", async () => {
      expect(await gh("A1B2C3D")).toBe(
        '<p><a href="https://github.com/user/project/commit/A1B2C3D"><code>A1B2C3D</code></a></p>',
      );
    });

    it("does not link english words that look like shas", async () => {
      expect(await gh("acceded")).toBe("<p>acceded</p>");
      expect(await gh("defaced")).toBe("<p>defaced</p>");
    });

    it("does not link a sha after a single dot", async () => {
      expect(await gh(`.${SHA}`)).toBe(`<p>.${SHA}</p>`);
    });

    it("does not link a sha that follows punctuation", async () => {
      expect(await gh(`-${SHA}`)).toBe(`<p>-${SHA}</p>`);
      expect(await gh(`,${SHA}`)).toBe(`<p>,${SHA}</p>`);
      expect(await gh(`/${SHA}`)).toBe(`<p>/${SHA}</p>`);
    });

    it("links a sha after two dots", async () => {
      expect(await gh(`..${SHA}`)).toBe(
        `<p>..<a href="https://github.com/user/project/commit/${SHA}"><code>a1b2c3d</code></a></p>`,
      );
    });

    it("drops the repository from the text for the configured repository", async () => {
      expect(await gh(`user/project@${SHA}`)).toBe(
        `<p><a href="https://github.com/user/project/commit/${SHA}">@<code>a1b2c3d</code></a></p>`,
      );
    });

    it("keeps the repository in the text for another repository", async () => {
      expect(await gh(`other/repo@${SHA}`)).toBe(
        `<p><a href="https://github.com/other/repo/commit/${SHA}">other/repo@<code>a1b2c3d</code></a></p>`,
      );
    });

    it("abbreviates a cross-repository sha that is already short", async () => {
      expect(await gh("other/repo@a1b2c3d4e5f6")).toBe(
        '<p><a href="https://github.com/other/repo/commit/a1b2c3d4e5f6">other/repo@<code>a1b2c3d</code></a></p>',
      );
    });

    it("links a comparison range", async () => {
      expect(await gh(`${SHA}...${OTHER_SHA}`)).toBe(
        `<p><a href="https://github.com/user/project/compare/${SHA}...${OTHER_SHA}">` +
          "<code>a1b2c3d...b1b2c3d</code></a></p>",
      );
    });
  });

  describe("leaves alone what must not be linked", () => {
    it("does not link inside inline code", async () => {
      expect(await gh("`#12`")).toBe("<p><code>#12</code></p>");
    });

    it("does not link inside fenced code", async () => {
      expect(await gh("```\n#12\n```")).toBe("<pre><code>#12\n</code></pre>");
    });

    it("does not create a link inside a link", async () => {
      expect(await gh("[#12](https://example.com)")).toBe(
        '<p><a href="https://example.com">#12</a></p>',
      );
      expect(await gh("[link @user](https://example.com)")).toBe(
        '<p><a href="https://example.com">link @user</a></p>',
      );
      expect(await gh(`[sha ${SHA}](https://example.com)`)).toBe(
        `<p><a href="https://example.com">sha ${SHA}</a></p>`,
      );
    });

    it("does not create a link inside a link reference", async () => {
      expect(await gh("[#12][ref]\n\n[ref]: https://example.com")).toBe(
        '<p><a href="https://example.com">#12</a></p>',
      );
    });

    it("leaves plain text untouched", async () => {
      expect(await gh("nothing to see here")).toBe("<p>nothing to see here</p>");
    });

    it("leaves an autolinked github url exactly as Sätteri produced it", async () => {
      const url = "https://github.com/user/project/issues/12";

      expect(await gh(url)).toBe(await plain(url));
      expect(await gh(url)).toBe(`<p><a href="${url}">${url}</a></p>`);
    });
  });

  describe("mixed content", () => {
    it("links every kind of reference in one sentence", async () => {
      expect(await gh(`See #12 and @user and ${SHA}.`)).toBe(
        '<p>See <a href="https://github.com/user/project/issues/12">#12</a>' +
          ' and <a href="https://github.com/user"><strong>@user</strong></a>' +
          ` and <a href="https://github.com/user/project/commit/${SHA}"><code>a1b2c3d</code></a>.</p>`,
      );
    });
  });

  describe("repository option", () => {
    it("accepts a github url", async () => {
      expect(
        await render("#12", {
          mdastPlugins: [satteriGithub({ repository: "https://github.com/foo/bar" })],
        }),
      ).toBe('<p><a href="https://github.com/foo/bar/issues/12">#12</a></p>');
    });

    it("throws when the repository is missing", () => {
      expect(() => satteriGithub({ repository: "" })).toThrow(
        /missing `repository`/,
      );
    });

    it("throws when the repository cannot be parsed", () => {
      expect(() => satteriGithub({ repository: "nope" })).toThrow(
        /invalid `repository`/,
      );
    });
  });
});
