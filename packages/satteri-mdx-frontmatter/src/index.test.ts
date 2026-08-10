import { render, renderMdx } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriMdxFrontmatter } from "./index.js";
import type { SatteriMdxFrontmatterOptions } from "./index.js";

/**
 * YAML is a superset of JSON, so `JSON.parse` is a real (if minimal) YAML
 * parser. Using it keeps these tests about the plugin's job — turning parsed
 * data into an export — rather than about somebody else's YAML implementation.
 */
const jsonParsers = { yaml: JSON.parse, toml: JSON.parse } as const;

const compile = (mdx: string, options: SatteriMdxFrontmatterOptions = {}) =>
  renderMdx(mdx, {
    mdastPlugins: [satteriMdxFrontmatter({ parsers: jsonParsers, ...options })],
  });

const doc = (frontmatter: string, kind: "yaml" | "toml" = "yaml") => {
  const fence = kind === "yaml" ? "---" : "+++";
  return `${fence}\n${frontmatter}\n${fence}\n\ntext\n`;
};

/** The emitted `export const NAME = …;` statement, whitespace-normalised. */
const exportStatement = (code: string): string => {
  const match = /^export const [\s\S]*?;$/m.exec(code);
  if (!match) throw new Error(`no export found in:\n${code}`);
  return match[0].replaceAll(/\s+/g, " ");
};

/** The runtime value of the emitted export, so tests assert data not syntax. */
const exportedValue = (code: string): unknown => {
  const match = /^export const \w+ = ([\s\S]*?);$/m.exec(code);
  if (!match) throw new Error(`no export found in:\n${code}`);
  return Function(`"use strict"; return (${match[1] ?? ""});`)() as unknown;
};

describe("default yaml parser", () => {
  it("parses yaml frontmatter with no configuration at all", async () => {
    const code = await renderMdx('---\ntitle: Hello\ncount: 3\n---\n\n# hi\n', {
      mdastPlugins: [satteriMdxFrontmatter()],
    });

    expect(code).toContain("export const frontmatter");
    expect(code).toContain("Hello");
    expect(code).toContain("3");
  });

  it("still honours an explicitly supplied parser", async () => {
    const code = await renderMdx('---\n{"a":1}\n---\n\n# hi\n', {
      mdastPlugins: [satteriMdxFrontmatter({ parsers: { yaml: JSON.parse } })],
    });

    expect(code).toContain("export const frontmatter");
    expect(code).toContain("1");
  });
});

describe("satteri-mdx-frontmatter", () => {
  describe("the export it defines", () => {
    it("exports frontmatter under the name `frontmatter` by default", async () => {
      const code = await compile(doc(`{"title": "Hello"}`));

      expect(exportStatement(code)).toBe(`export const frontmatter = { "title": "Hello" };`);
    });

    it("exports the parsed data, not the raw text", async () => {
      const code = await compile(doc(`{"count": 3, "ok": true, "list": ["a", "b"]}`));

      expect(exportedValue(code)).toEqual({ count: 3, ok: true, list: ["a", "b"] });
    });

    it("preserves nested structures", async () => {
      const code = await compile(doc(`{"a": {"b": {"c": [1, {"d": null}]}}}`));

      expect(exportedValue(code)).toEqual({ a: { b: { c: [1, { d: null }] } } });
    });

    it("uses the `name` option as the export name", async () => {
      const code = await compile(doc(`{"title": "Hello"}`), { name: "meta" });

      expect(exportStatement(code)).toBe(`export const meta = { "title": "Hello" };`);
    });

    it("makes the export visible to expressions in the document", async () => {
      const code = await renderMdx(`---\n{"title": "Hi"}\n---\n\n# {frontmatter.title}\n`, {
        mdastPlugins: [satteriMdxFrontmatter({ parsers: jsonParsers })],
      });

      expect(code).toContain("frontmatter.title");
      expect(code).toContain("export const frontmatter");
    });

    it("removes the frontmatter block from the document body", async () => {
      const code = await compile(doc(`{"title": "Hello"}`));

      expect(code).not.toContain(`"title": "Hello"\n`);
      expect(code).toContain(`children: "text"`);
    });
  });

  describe("frontmatter that is not an object", () => {
    it("exports a bare string", async () => {
      const code = await compile(doc(`"just a string"`));

      expect(exportStatement(code)).toBe(`export const frontmatter = "just a string";`);
    });

    it("exports a bare array", async () => {
      const code = await compile(doc(`["a", "b"]`));

      expect(exportedValue(code)).toEqual(["a", "b"]);
    });

    it("exports a bare number", async () => {
      const code = await compile(doc(`42`));

      expect(exportedValue(code)).toBe(42);
    });

    it("exports null when the parser yields null", async () => {
      const code = await compile(doc(`null`));

      expect(exportStatement(code)).toBe(`export const frontmatter = null;`);
    });

    it("exports undefined when the parser yields undefined", async () => {
      const code = await compile(doc(`ignored`), { parsers: { yaml: () => undefined } });

      expect(exportStatement(code)).toBe(`export const frontmatter = undefined;`);
    });
  });

  describe("parsers", () => {
    it("passes the raw frontmatter text to the parser", async () => {
      const seen: string[] = [];

      await compile(doc(`{"a": 1}`), {
        parsers: {
          yaml: (value) => {
            seen.push(value);
            return null;
          },
        },
      });

      expect(seen).toEqual([`{"a": 1}`]);
    });

    it("uses the toml parser for a toml block", async () => {
      const code = await compile(doc(`{"from": "toml"}`, "toml"), {
        parsers: { yaml: () => "wrong", toml: JSON.parse },
      });

      expect(exportedValue(code)).toEqual({ from: "toml" });
    });

    it("lets a parse failure escape the compile", async () => {
      await expect(compile(doc(`this is not json`))).rejects.toThrow();
    });

    it("throws a named error for a block kind with no parser", async () => {
      // YAML has a default parser; TOML does not.
      await expect(
        renderMdx("+++\na = 1\n+++\n\n# hi\n", {
          mdastPlugins: [satteriMdxFrontmatter()],
          features: { frontmatter: true },
        }),
      ).rejects.toThrow(/no parser.*toml/i);
    });
  });

  describe("serialisation safety", () => {
    it("does not let a `__proto__` key change the exported object's prototype", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ ["__proto__"]: { polluted: true } }) },
      });
      const value = exportedValue(code);

      expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
      expect(Object.keys(value as object)).toEqual(["__proto__"]);
    });

    it("serialises an invalid Date without emitting broken JavaScript", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ when: new Date("not a date") }) },
      });

      // `new Date("Invalid Date")` would not round-trip, so NaN is written out.
      expect(exportStatement(code)).toBe(`export const frontmatter = { "when": new Date(NaN) };`);
      expect(Number.isNaN((exportedValue(code) as { when: Date }).when.getTime())).toBe(true);
    });

    it("serialises a Date as a Date rather than a string", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ when: new Date("2020-01-01T00:00:00.000Z") }) },
      });

      expect(exportedValue(code)).toEqual({ when: new Date("2020-01-01T00:00:00.000Z") });
    });

    it("escapes strings that would otherwise break out of the literal", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ evil: `";\nexport const hacked = 1;//` }) },
      });

      // The payload survives as data inside the string literal; what must not
      // happen is it escaping into a statement of its own.
      expect(code).not.toMatch(/^export const hacked/m);
      expect(exportedValue(code)).toEqual({ evil: `";\nexport const hacked = 1;//` });
    });

    it("drops undefined object values the way JSON does", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ a: 1, b: undefined }) },
      });

      expect(Object.keys(exportedValue(code) as object)).toEqual(["a"]);
    });

    it("writes undefined array holes as null the way JSON does", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => [1, undefined, 3] },
      });

      expect(exportedValue(code)).toEqual([1, null, 3]);
    });

    it("keeps non-finite numbers valid instead of emitting null", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ n: Number.NaN, i: Number.POSITIVE_INFINITY }) },
      });

      expect(exportedValue(code)).toEqual({ n: Number.NaN, i: Number.POSITIVE_INFINITY });
    });

    it("serialises a bigint as a bigint literal", async () => {
      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ big: 9007199254740993n }) },
      });

      expect(exportedValue(code)).toEqual({ big: 9007199254740993n });
    });

    it("exports undefined for a value that has no literal form", async () => {
      const code = await compile(doc(`ignored`), { parsers: { yaml: () => () => 1 } });

      expect(exportStatement(code)).toBe(`export const frontmatter = undefined;`);
    });

    it("allows the same object to appear twice without calling it circular", async () => {
      const shared = { a: 1 };

      const code = await compile(doc(`ignored`), {
        parsers: { yaml: () => ({ first: shared, second: shared }) },
      });

      expect(exportedValue(code)).toEqual({ first: { a: 1 }, second: { a: 1 } });
    });

    it("rejects circular data rather than recursing forever", async () => {
      const circular: Record<string, unknown> = {};
      circular["self"] = circular;

      await expect(compile(doc(`ignored`), { parsers: { yaml: () => circular } })).rejects.toThrow(
        /circular/i,
      );
    });
  });

  describe("the export name", () => {
    it("rejects a name that is not a valid identifier", () => {
      expect(() => satteriMdxFrontmatter({ name: "not valid" })).toThrow(/identifier/i);
    });

    it("rejects a reserved word", () => {
      expect(() => satteriMdxFrontmatter({ name: "const" })).toThrow(/identifier/i);
    });

    it("accepts an identifier with a dollar sign or underscore", async () => {
      const code = await compile(doc(`{"a": 1}`), { name: "$_meta1" });

      expect(exportStatement(code)).toBe(`export const $_meta1 = { "a": 1 };`);
    });
  });

  describe("documents the plugin cannot help", () => {
    it("emits no export when the document has no frontmatter", async () => {
      const code = await compile("just text\n");

      expect(code).not.toContain("frontmatter");
    });

    it("leaves a plain markdown compile alone", async () => {
      const html = await render(doc(`{"title": "Hello"}`), {
        mdastPlugins: [satteriMdxFrontmatter({ parsers: jsonParsers })],
      });

      expect(html).toBe("<p>text</p>");
    });

    it.each(["yaml", "toml"] as const)(
      "does not parse — or demand a parser — for %s in a plain markdown compile",
      async (kind) => {
        const html = await render(doc(`this is not json`, kind), {
          mdastPlugins: [satteriMdxFrontmatter()],
        });

        expect(html).toBe("<p>text</p>");
      },
    );
  });
});
