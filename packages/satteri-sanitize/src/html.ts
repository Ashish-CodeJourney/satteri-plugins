/**
 * A deliberately small HTML tokenizer.
 *
 * Sätteri hands raw HTML to plugins as strings rather than as a parsed tree, so
 * sanitising means working at the token level. Everything here is written to
 * fail closed: anything that does not parse cleanly as a tag is treated as text
 * and escaped, never emitted as markup.
 */

export type Tag = {
  readonly kind: "tag";
  readonly name: string;
  readonly closing: boolean;
  readonly selfClosing: boolean;
  readonly attributes: ReadonlyArray<readonly [string, string]>;
};

export type Token = Tag | { readonly kind: "text"; readonly value: string };

const ESCAPES: Record<string, string> = {
  "&": "&#x26;",
  "<": "&#x3C;",
  ">": "&#x3E;",
  '"': "&#x22;",
  "'": "&#x27;",
};

/** A character reference that is already encoded: named, decimal or hex. */
const ENTITY = /&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#[xX][0-9a-fA-F]+);/y;

/**
 * Escapes raw HTML that has already been through an HTML encoder once.
 *
 * The strings Sätteri hands to a `raw` node come straight from the document, so
 * they still carry the author's character references. Escaping `&`
 * unconditionally would turn `&amp;` into `&#x26;amp;` and show the entity to
 * the reader. Only an `&` that does not begin a well-formed reference is
 * escaped; a partial one like `&ampx;` is still encoded, so nothing can be
 * smuggled through by leaving a reference unterminated.
 */
export const escapePreservingEntities = (value: string): string => {
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";

    if (character === "&") {
      ENTITY.lastIndex = index;
      const entity = ENTITY.exec(value);
      if (entity) {
        output += entity[0];
        index = ENTITY.lastIndex - 1;
        continue;
      }
    }

    output += ESCAPES[character] ?? character;
  }

  return output;
};

/**
 * Attribute values may contain `>`, so the tag body is matched with an
 * alternation that consumes quoted runs whole rather than stopping at the first
 * `>`.
 */
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)>/y;
const COMMENT = /<!--[\s\S]*?-->/y;
const DOCTYPE_OR_PI = /<[!?][^>]*>/y;
const ATTRIBUTE = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const parseAttributes = (source: string): Array<readonly [string, string]> => {
  const attributes: Array<readonly [string, string]> = [];
  ATTRIBUTE.lastIndex = 0;

  for (let match = ATTRIBUTE.exec(source); match; match = ATTRIBUTE.exec(source)) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    if (name === undefined) continue;
    attributes.push([name, doubleQuoted ?? singleQuoted ?? unquoted ?? ""]);
  }

  return attributes;
};

/**
 * Splits raw HTML into tags and text. Comments, doctypes and processing
 * instructions are dropped outright rather than returned, since none of them
 * survive sanitisation.
 */
export const tokenize = (html: string): Token[] => {
  const tokens: Token[] = [];
  let text = "";
  let index = 0;

  const flush = () => {
    if (text !== "") tokens.push({ kind: "text", value: text });
    text = "";
  };

  while (index < html.length) {
    if (html[index] !== "<") {
      text += html[index];
      index += 1;
      continue;
    }

    COMMENT.lastIndex = index;
    const comment = COMMENT.exec(html);
    if (comment) {
      flush();
      index = COMMENT.lastIndex;
      continue;
    }

    TAG.lastIndex = index;
    const tag = TAG.exec(html);
    if (tag) {
      flush();
      const [, closing, name = "", body = "", selfClosing] = tag;
      tokens.push({
        kind: "tag",
        name: name.toLowerCase(),
        closing: closing === "/",
        selfClosing: selfClosing === "/",
        attributes: parseAttributes(body),
      });
      index = TAG.lastIndex;
      continue;
    }

    DOCTYPE_OR_PI.lastIndex = index;
    const other = DOCTYPE_OR_PI.exec(html);
    if (other) {
      flush();
      index = DOCTYPE_OR_PI.lastIndex;
      continue;
    }

    // A `<` that begins nothing recognisable is literal text.
    text += "<";
    index += 1;
  }

  flush();
  return tokens;
};

/** Serializes a tag back to HTML with its attributes already filtered. */
export const serializeTag = (
  tag: Tag,
  attributes: ReadonlyArray<readonly [string, string]>,
): string => {
  if (tag.closing) return `</${tag.name}>`;

  const rendered = attributes
    .map(([name, value]) => ` ${name}="${escapePreservingEntities(value)}"`)
    .join("");

  return `<${tag.name}${rendered}${tag.selfClosing ? " /" : ""}>`;
};
