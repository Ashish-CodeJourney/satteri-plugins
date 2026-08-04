import type { Element, ElementContent } from "hast";
import katex from "katex";
import { defineHastPlugin } from "satteri";
import type { HastPluginInput } from "satteri";

type KatexOptions = Parameters<typeof katex.renderToString>[1];

export type SatteriKatexOptions = Omit<
  NonNullable<KatexOptions>,
  "displayMode" | "throwOnError"
> & {
  /** Colour of the source text left in place when math fails to parse. Default `"#cc0000"`. */
  readonly errorColor?: string;
};

const INLINE = "math-inline";
const DISPLAY = "math-display";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

const hasClass = (node: Readonly<Element>, className: string): boolean => {
  const classes = node.properties?.["className"];
  return Array.isArray(classes) && classes.includes(className);
};

/** The text of a `<code>` element, which is what Sätteri puts the TeX source in. */
const sourceOf = (node: Readonly<Element>): string =>
  node.children
    .map((child) => (child.type === "text" ? child.value : ""))
    .join("");

const errorSpan = (source: string, message: string, color: string): string =>
  `<span class="katex-error" title="${escapeHtml(message)}" ` +
  `style="color:${escapeHtml(color)}">${escapeHtml(source)}</span>`;

/**
 * Renders math with KaTeX — a port of `rehype-katex`.
 *
 * Sätteri parses `$…$` and `$$…$$` into `<code class="language-math math-inline">`
 * and `<pre><code class="language-math math-display">` but renders nothing, so
 * without this plugin math reaches the page as raw TeX. Requires
 * `features: { math: true }`.
 */
export const satteriKatex = ({
  errorColor = "#cc0000",
  ...katexOptions
}: SatteriKatexOptions = {}): HastPluginInput => {
  const renderRaw = (source: string, displayMode: boolean): ElementContent => {
    try {
      return {
        type: "raw",
        value: katex.renderToString(source, {
          ...katexOptions,
          displayMode,
          throwOnError: true,
        }),
      };
    } catch (error) {
      // KaTeX failures are authoring mistakes in one expression; the rest of the
      // document should still build, so the source is left visible and flagged.
      return {
        type: "raw",
        value: errorSpan(source, String(error), errorColor),
      };
    }
  };

  const displayCode = (node: Readonly<Element>): Element | undefined => {
    const [child] = node.children;
    if (child?.type !== "element") return undefined;
    return hasClass(child, DISPLAY) ? child : undefined;
  };

  return defineHastPlugin({
    name: "satteri-katex",
    element: {
      filter: ["pre", "code"],
      visit(node): ElementContent | undefined {
        if (node.tagName === "pre") {
          const code = displayCode(node);
          // Replacing the `pre` cancels the queued visit of its `code` child, so
          // display math is never rendered twice.
          return code === undefined ? undefined : renderRaw(sourceOf(code), true);
        }

        return hasClass(node, INLINE) ? renderRaw(sourceOf(node), false) : undefined;
      },
    },
  });
};

export default satteriKatex;
