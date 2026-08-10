import katex from "katex";
import { defineMdastPlugin } from "satteri";
import type { MdastPluginInput } from "satteri";

type KatexOptions = Parameters<typeof katex.renderToString>[1];

export type SatteriKatexOptions = Omit<
  NonNullable<KatexOptions>,
  "displayMode" | "throwOnError"
> & {
  /** Colour of the source text left in place when math fails to parse. Default `"#cc0000"`. */
  readonly errorColor?: string;
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const escapeHtml = (value: string): string =>
  /* v8 ignore next -- unreachable: the regex only matches characters that are keys of ESCAPES */
  value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

const errorSpan = (source: string, message: string, color: string): string =>
  `<span class="katex-error" title="${escapeHtml(message)}" ` +
  `style="color:${escapeHtml(color)}">${escapeHtml(source)}</span>`;

/**
 * Renders math with KaTeX — a port of `rehype-katex`.
 *
 * Sätteri parses `$…$` and `$$…$$` but renders nothing, so without this plugin
 * math reaches the page as raw TeX. Requires `features: { math: true }`.
 *
 * Runs at the MDAST stage rather than on HAST: Astro's Sätteri processor puts
 * its syntax highlighter ahead of user HAST plugins, and that highlighter would
 * otherwise claim display math as a plaintext code block before this plugin
 * ever saw it.
 */
export const satteriKatex = ({
  errorColor = "#cc0000",
  ...katexOptions
}: SatteriKatexOptions = {}): MdastPluginInput => {
  const render = (source: string, displayMode: boolean) => {
    try {
      return {
        type: "html" as const,
        value: katex.renderToString(source, {
          ...katexOptions,
          displayMode,
          throwOnError: true,
        }),
      };
    } catch (error) {
      // A KaTeX failure is an authoring mistake in one expression; the rest of
      // the document should still build, so the source is left visible and
      // flagged rather than thrown.
      return {
        type: "html" as const,
        value: errorSpan(source, String(error), errorColor),
      };
    }
  };

  return defineMdastPlugin({
    name: "satteri-katex",
    math: (node) => render(node.value, true),
    inlineMath: (node) => render(node.value, false),
  });
};

export default satteriKatex;
