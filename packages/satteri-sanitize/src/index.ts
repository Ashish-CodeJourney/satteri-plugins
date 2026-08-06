import { defineHastPlugin } from "satteri";
import type { HastPluginInput } from "satteri";
import { escapeHtml, serializeTag, tokenize } from "./html.js";
import type { Tag } from "./html.js";
import {
  ATTRIBUTES,
  CLASS_PREFIXES,
  CLOBBER,
  CLOBBER_PREFIX,
  DROP_CONTENT,
  GLOBAL_ATTRIBUTES,
  PROTOCOLS,
  TAG_NAMES,
} from "./schema.js";
import { isAllowedUrl } from "./url.js";

export type SatteriSanitizeOptions = {
  /** Elements to keep. Anything else is unwrapped, keeping its children. */
  readonly tagNames?: readonly string[];
  /** Extra attributes per element, merged over the defaults. */
  readonly attributes?: Readonly<Record<string, readonly string[]>>;
  /** Allowed protocols per URL attribute, merged over the defaults. */
  readonly protocols?: Readonly<Record<string, readonly string[]>>;
  /** Prefix added to `id` and `name` to prevent DOM clobbering. */
  readonly clobberPrefix?: string;
};

/**
 * Block elements end a raw-text run. An unclosed `<script>` must not swallow the
 * rest of the document: parse5 recovers at the block boundary and so must this.
 */
const BLOCK_ELEMENTS = [
  "p", "div", "section", "blockquote", "pre", "li", "td", "th", "details",
  "summary", "h1", "h2", "h3", "h4", "h5", "h6",
];

/** Event handlers are never allowed, whatever the allowlist says. */
const isEventHandler = (name: string): boolean => /^on[a-z]/i.test(name);

const keptClasses = (value: string): string =>
  value
    .split(/\s+/)
    .filter((token) => CLASS_PREFIXES.some((prefix) => token.startsWith(prefix)))
    .join(" ");

/**
 * Sanitizes HTML in Markdown — a port of `rehype-sanitize`.
 *
 * Sätteri emits raw HTML unparsed, so `<script>` in a Markdown document reaches
 * the page verbatim. Any document containing untrusted input needs this plugin.
 */
export const satteriSanitize = ({
  tagNames = TAG_NAMES,
  attributes = {},
  protocols = {},
  clobberPrefix = CLOBBER_PREFIX,
}: SatteriSanitizeOptions = {}): HastPluginInput => {
  const allowedTags = new Set(tagNames.map((name) => name.toLowerCase()));
  const allowedAttributes: Record<string, readonly string[]> = {
    ...ATTRIBUTES,
    ...attributes,
  };
  const allowedProtocols: Record<string, readonly string[]> = {
    ...PROTOCOLS,
    ...protocols,
  };

  /** `class` in HTML is `className` in a hast schema; accept either spelling. */
  const listed = (tagName: string, name: string): boolean => {
    const list = allowedAttributes[tagName] ?? [];
    if (name !== "class" && name !== "className") return list.includes(name);
    return list.includes("class") || list.includes("className");
  };

  const attributeAllowed = (tagName: string, name: string): boolean =>
    GLOBAL_ATTRIBUTES.includes(name) || CLOBBER.includes(name) || listed(tagName, name);

  /** True when the caller opted this element's class through, not the default schema. */
  const classIsCallerConfigured = (tagName: string): boolean => {
    const list = attributes[tagName] ?? [];
    return list.includes("class") || list.includes("className");
  };

  const cleanValue = (name: string, value: string): string | undefined => {
    const allowed = allowedProtocols[name];
    if (allowed !== undefined && !isAllowedUrl(value, allowed)) return undefined;
    if (CLOBBER.includes(name)) return clobberPrefix + value;
    return value;
  };

  const cleanAttributes = (tag: Tag): Array<readonly [string, string]> => {
    const kept: Array<readonly [string, string]> = [];

    for (const [rawName, value] of tag.attributes) {
      const name = rawName.toLowerCase();
      if (isEventHandler(name)) continue;

      // `className` in the schema is hast's name for the `class` attribute.
      if (!attributeAllowed(tag.name, name)) continue;

      // The default schema allows `class` only to carry Sätteri's own
      // `language-*` and `math*` markers, so unknown classes are filtered out.
      // A caller who allows `class` explicitly gets the value untouched.
      if (name === "class" && !classIsCallerConfigured(tag.name)) {
        const classes = keptClasses(value);
        if (classes !== "") kept.push([name, classes]);
        continue;
      }

      const cleaned = cleanValue(name, value);
      if (cleaned !== undefined) kept.push([name, cleaned]);
    }

    return kept;
  };

  return () => {
    // Depth of nesting inside elements whose text content must also go. State
    // lives per document, which is why this is a factory.
    let dropDepth = 0;

    const sanitizeRaw = (html: string): string => {
      let output = "";

      for (const token of tokenize(html)) {
        if (token.kind === "text") {
          if (dropDepth === 0) output += escapeHtml(token.value);
          continue;
        }

        if (DROP_CONTENT.includes(token.name)) {
          if (token.closing) dropDepth = Math.max(0, dropDepth - 1);
          else if (!token.selfClosing) dropDepth += 1;
          continue;
        }

        if (dropDepth > 0) continue;
        if (!allowedTags.has(token.name)) continue;

        output += serializeTag(token, cleanAttributes(token));
      }

      return output;
    };

    return defineHastPlugin({
      name: "satteri-sanitize",
      raw: (node, ctx) => {
        const sanitized = sanitizeRaw(node.value);
        if (sanitized === node.value) return;
        if (sanitized === "") {
          ctx.removeNode(node);
          return;
        }
        return { type: "raw", value: sanitized };
      },
      // Text between a dropped opening tag and its close is the payload of the
      // element being removed, so it goes with it.
      text: (node, ctx) => {
        if (dropDepth > 0) ctx.removeNode(node);
      },
      // Elements Sätteri built from Markdown itself are structurally safe, but
      // their URLs come from the document and are not.
      element: {
        filter: ["a", "img", ...BLOCK_ELEMENTS],
        visit: (node, ctx) => {
          if (BLOCK_ELEMENTS.includes(node.tagName)) dropDepth = 0;

          for (const name of ["href", "src"]) {
            const value = node.properties?.[name];
            const allowed = allowedProtocols[name];
            if (typeof value !== "string" || allowed === undefined) continue;
            if (!isAllowedUrl(value, allowed)) ctx.setProperty(node, name, undefined);
          }
        },
      },
    });
  };
};

export default satteriSanitize;
