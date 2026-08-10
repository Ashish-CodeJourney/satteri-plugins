import GithubSlugger from "github-slugger";
import { defineMdastPlugin } from "satteri";
import type { MdastPluginInput } from "satteri";

/** A link that does not point at anything that exists. */
export type Finding = {
  /** The link destination exactly as written in the document. */
  readonly url: string;
  /** Why it is a problem, in a sentence. */
  readonly reason: string;
  /** Where the link is in the source, when Sätteri recorded it. */
  readonly position?: unknown;
};

const ATX_HEADING = /^ {0,3}(?:#{1,6})[ \t]+(.*?)(?:[ \t]+#*)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-+)[ \t]*$/;
const CODE_FENCE = /^ {0,3}(```+|~~~+)/;
const FRONTMATTER_FENCE = /^(---|\+\+\+)[ \t]*$/;

/**
 * Every id a heading in this document will end up with.
 *
 * Sätteri visits nodes once, in order, and offers no end-of-document hook, so a
 * link cannot wait for the headings after it to be visited. The full source is
 * on the context, so the ids are read from there instead of from the tree.
 *
 * `github-slugger` is what `satteri-slug` uses, so the ids checked here are the
 * ids that will actually be rendered.
 */
const headingIds = (source: string): ReadonlySet<string> => {
  const slugger = new GithubSlugger();
  const ids = new Set<string>();
  const lines = source.split(/\r?\n/);

  let fence: string | undefined;
  let previous = "";
  let index = 0;

  // A frontmatter block closes with `---`, which is also the shape of a setext
  // underline. Skip past it so `title: x` above the closing fence is not read
  // as a heading.
  if (lines[0] !== undefined && FRONTMATTER_FENCE.test(lines[0])) {
    const close = lines.findIndex((line, at) => at > 0 && FRONTMATTER_FENCE.test(line));
    if (close !== -1) index = close + 1;
  }

  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const opensOrCloses = CODE_FENCE.exec(line)?.[1];

    if (fence !== undefined) {
      if (opensOrCloses?.startsWith(fence[0] ?? "") === true) fence = undefined;
      previous = "";
      continue;
    }

    if (opensOrCloses !== undefined) {
      fence = opensOrCloses;
      previous = "";
      continue;
    }

    const atx = ATX_HEADING.exec(line);
    if (atx !== null) {
      ids.add(slugger.slug(atx[1] ?? ""));
      previous = "";
      continue;
    }

    if (previous !== "" && SETEXT_UNDERLINE.test(line)) {
      ids.add(slugger.slug(previous.trim()));
      previous = "";
      continue;
    }

    previous = line.trim();
  }

  return ids;
};

export const satteriValidateLinks = (): MdastPluginInput => () => {
  let ids: ReadonlySet<string> | undefined;

  return defineMdastPlugin({
    name: "satteri-validate-links",
    link(node, ctx) {
      // A bare "#" is a link to the top of the page, not to a heading.
      if (!node.url.startsWith("#") || node.url === "#") return;

      ids ??= headingIds(ctx.source);
      const id = decodeURIComponent(node.url.slice(1));
      if (ids.has(id)) return;

      const data = ctx.data as { validateLinks?: Finding[] };
      const findings = (data.validateLinks ??= []);
      findings.push({
        url: node.url,
        reason: `no heading in this document has the id "${id}"`,
        position: node.position,
      });
    },
  });
};
