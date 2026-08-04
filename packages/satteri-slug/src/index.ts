import GithubSlugger from "github-slugger";
import { defineHastPlugin } from "satteri";
import type { HastPluginInput } from "satteri";

export type SatteriSlugOptions = {
  /** Prepended to every generated id. Existing ids are left untouched. */
  readonly prefix?: string;
};

const HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

/**
 * Adds an `id` to every heading that does not already have one, using the same
 * GitHub slugging rules (and the same `github-slugger` package) as `rehype-slug`.
 *
 * Returns a factory so Sätteri resets the duplicate-suffix counter per document.
 */
export const satteriSlug = ({
  prefix = "",
}: SatteriSlugOptions = {}): HastPluginInput =>
  () => {
    const slugger = new GithubSlugger();

    return defineHastPlugin({
      name: "satteri-slug",
      element: {
        filter: HEADINGS,
        visit(node, ctx) {
          if (node.properties?.["id"] !== undefined) return;

          ctx.setProperty(node, "id", prefix + slugger.slug(ctx.textContent(node)));
        },
      },
    });
  };

export default satteriSlug;
