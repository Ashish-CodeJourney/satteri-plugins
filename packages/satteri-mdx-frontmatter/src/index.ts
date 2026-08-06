import { parse as parseYaml } from "yaml";
import { defineMdastPlugin } from "satteri";
import type { MdastPluginInput } from "satteri";

/** Turns the raw text of a frontmatter block into data. */
export type FrontmatterParser = (value: string) => unknown;

export type SatteriMdxFrontmatterOptions = {
  /** Identifier the data is exported as. Default `"frontmatter"`. */
  readonly name?: string;
  /**
   * Parser per frontmatter node type — `yaml` for `--- … ---`, `toml` for
   * `+++ … +++`. No parser ships with this package, so both must be supplied;
   * a block whose type has no parser is a hard error.
   */
  readonly parsers?: Readonly<Record<string, FrontmatterParser>>;
};

const RESERVED_WORDS = new Set([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

// Deliberately narrower than the ECMAScript grammar, which allows most Unicode
// letters: a name that is rejected here is at worst an inconvenience, whereas
// one that is wrongly accepted emits a module that will not parse.
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const assertIdentifier = (name: string): string => {
  if (!IDENTIFIER.test(name) || RESERVED_WORDS.has(name)) {
    throw new Error(
      `satteri-mdx-frontmatter: "${name}" is not a usable JavaScript identifier for the export name.`,
    );
  }
  return name;
};

const isPlainValue = (value: unknown): boolean =>
  typeof value !== "function" && typeof value !== "symbol" && value !== undefined;

/**
 * Renders a value as a JavaScript expression.
 *
 * `JSON.stringify` is not enough: its output for a `__proto__` key is an object
 * literal that reassigns the prototype, it turns `NaN` and dates into something
 * else, and it cannot express `undefined` at all.
 */
const serialize = (value: unknown, seen: ReadonlySet<object>): string => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    // `String` already renders `NaN` and `Infinity` as the identifiers that
    // read back as themselves, which is why this is not `JSON.stringify`.
    case "number":
      return String(value);
    case "bigint":
      return `${value}n`;
    case "boolean":
      return String(value);
    case "function":
    case "symbol":
      return "undefined";
    default:
      break;
  }

  const object = value as object;
  if (seen.has(object)) {
    throw new Error("satteri-mdx-frontmatter: frontmatter data contains a circular reference.");
  }
  const nested = new Set(seen).add(object);

  if (object instanceof Date) {
    return Number.isNaN(object.getTime())
      ? "new Date(NaN)"
      : `new Date(${JSON.stringify(object.toISOString())})`;
  }

  if (Array.isArray(object)) {
    // A hole or an unrepresentable item becomes `null`, as it would in JSON,
    // so that later items keep their index.
    const items = object.map((item) => (isPlainValue(item) ? serialize(item, nested) : "null"));
    return `[${items.join(", ")}]`;
  }

  const entries = Object.entries(object)
    .filter(([, entryValue]) => isPlainValue(entryValue))
    .map(([key, entryValue]) => {
      // A string key `"__proto__"` still sets the prototype in an object
      // literal; only a computed key is an ordinary own property.
      const literalKey = key === "__proto__" ? `["__proto__"]` : JSON.stringify(key);
      return `${literalKey}: ${serialize(entryValue, nested)}`;
    });

  return `{${entries.join(", ")}}`;
};

/**
 * Exposes frontmatter to the compiled MDX module as an export — a port of
 * `remark-mdx-frontmatter`.
 *
 * Sätteri parses frontmatter itself and hands the raw text back on the compile
 * result, but it never reaches the module: `{frontmatter.title}` in a document
 * compiles to a free variable that is not defined anywhere. This plugin turns
 * the block into `export const frontmatter = …` so that expression resolves,
 * and so importers of the compiled module can read the metadata.
 *
 * YAML is parsed out of the box. TOML is not: supply a parser via `parsers`
 * if you use `+++` blocks.
 */
/** Overridable so a caller can swap in a stricter or faster YAML parser. */
const DEFAULT_PARSERS: Readonly<Record<string, FrontmatterParser>> = {
  yaml: (value) => parseYaml(value) as unknown,
};

export const satteriMdxFrontmatter = ({
  name = "frontmatter",
  parsers = {},
}: SatteriMdxFrontmatterOptions = {}): MdastPluginInput => {
  const resolvedParsers = { ...DEFAULT_PARSERS, ...parsers };
  const exportName = assertIdentifier(name);

  const toExport = (kind: string, value: string) => {
    const parser = resolvedParsers[kind];
    if (!parser) {
      throw new Error(
        `satteri-mdx-frontmatter: no parser registered for "${kind}" frontmatter. ` +
          `Pass one as \`parsers: { ${kind}: … }\`.`,
      );
    }

    return {
      type: "mdxjsEsm" as const,
      value: `export const ${exportName} = ${serialize(parser(value), new Set())};`,
    };
  };

  return defineMdastPlugin({
    name: "satteri-mdx-frontmatter",
    // In a plain Markdown compile there is no module to export into, so the
    // block is left as Sätteri found it (which renders nothing).
    yaml: (node, ctx) =>
      ctx.sourceFormat === "mdx" ? toExport("yaml", node.value) : undefined,
    toml: (node, ctx) =>
      ctx.sourceFormat === "mdx" ? toExport("toml", node.value) : undefined,
  });
};

export default satteriMdxFrontmatter;
