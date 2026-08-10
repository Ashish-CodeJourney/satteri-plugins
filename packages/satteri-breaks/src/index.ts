import { defineMdastPlugin } from "satteri";
import type { MdastPluginInput } from "satteri";

/**
 * Turns single newlines into `<br>`, a port of `remark-breaks`.
 *
 * Sätteri keeps a soft line break as a newline inside a text node, so this
 * splits those nodes and puts a `break` between the pieces. Sätteri renders a
 * `break` as `<br>\n`, matching what `remark-breaks` produces.
 *
 * Fenced and inline code are `code` and `inlineCode` nodes rather than text, so
 * they are never visited and their newlines survive untouched.
 */
export const satteriBreaks = (): MdastPluginInput =>
  defineMdastPlugin({
    name: "satteri-breaks",
    text(node, ctx) {
      const [first, ...rest] = node.value.split(/\r?\n/);
      if (rest.length === 0) return;

      // `replaceNode` cannot encode an array containing a `break`, but
      // `insertAfter` can, so the node is narrowed to its first line and the
      // remaining lines are spliced in after it.
      /* v8 ignore next -- unreachable: String.split always yields at least one element */
      ctx.replaceNode(node, { type: "text", value: first ?? "" });
      ctx.insertAfter(
        node,
        rest.flatMap((line) => [
          { type: "break" as const },
          { type: "text" as const, value: line },
        ]),
      );
    },
  });

export default satteriBreaks;
