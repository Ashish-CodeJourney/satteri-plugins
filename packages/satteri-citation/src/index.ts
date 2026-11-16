import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-csl";
import { defineMdastPlugin } from "satteri";
import type { MdastContent, MdastPluginInput } from "satteri";

export type SatteriCitationOptions = {
  /** BibTeX or CSL-JSON files. Several are merged. Read once, when the plugin is created. */
  readonly bibliography: string | readonly string[];
  /** Leave the reference list out of the document. */
  readonly suppressBibliography?: boolean;
};

type Item = {
  readonly key: string;
  readonly prefix: string;
  readonly suffix: string;
};

type Citation =
  | { readonly kind: "cluster"; readonly items: readonly Item[] }
  | { readonly kind: "narrative"; readonly item: Item };

type Piece =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "citation"; readonly citation: Citation };

const KEY = String.raw`\w(?:[\w:.-]*\w)?`;
const TOKEN = new RegExp(String.raw`\[([^[\]]*)\]|(?<![\w@])@(${KEY})`, "g");
const ITEM = new RegExp(String.raw`^\s*([^@]*?)\s*@(${KEY})(?:\s*,\s*(.*?))?\s*$`);
const LOCATOR = /^(?:(p|pp|ch|chap|sec|fig|vol|eq)\.?\s*)?(\S+)$/;
const LOCATOR_LABELS: Readonly<Record<string, string>> = {
  p: "page",
  pp: "page",
  ch: "chapter",
  chap: "chapter",
  sec: "section",
  fig: "figure",
  vol: "volume",
  eq: "equation",
};
const LANG = "en-US";
const CSL = "apa";

const loadLibrary = (paths: string | readonly string[]): Cite => {
  const files = typeof paths === "string" ? [paths] : paths;
  const entries = files.flatMap((file) => new Cite(readFileSync(resolve(file), "utf8")).data);
  return new Cite(entries);
};

const escapeHtml = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const parseItem = (chunk: string, isKnown: (key: string) => boolean): Item | undefined => {
  const match = ITEM.exec(chunk);
  const key = match?.[2];
  if (match === null || key === undefined || !isKnown(key)) return undefined;
  /* v8 ignore next -- unreachable: the prefix group is mandatory (it may be empty), so it always participates */
  return { key, prefix: match[1] ?? "", suffix: match[3] ?? "" };
};

const parseToken = (match: RegExpExecArray, isKnown: (key: string) => boolean): Citation | undefined => {
  const [, group, narrativeKey] = match;
  if (group !== undefined) {
    const items = group.split(";").map((chunk) => parseItem(chunk, isKnown));
    return items.every((item): item is Item => item !== undefined)
      ? { kind: "cluster", items }
      : undefined;
  }
  if (narrativeKey === undefined || !isKnown(narrativeKey)) return undefined;
  return { kind: "narrative", item: { key: narrativeKey, prefix: "", suffix: "" } };
};

const tokenize = (text: string, isKnown: (key: string) => boolean): readonly Piece[] => {
  const { pieces, cursor } = [...text.matchAll(TOKEN)].reduce(
    (acc, match) => {
      const start = match.index;
      const citation = parseToken(match, isKnown);
      const gap: Piece = { kind: "text", value: text.slice(acc.cursor, start) };
      const token: Piece = citation
        ? { kind: "citation", citation }
        : { kind: "text", value: match[0] };
      return { pieces: [...acc.pieces, gap, token], cursor: start + match[0].length };
    },
    { pieces: [] as readonly Piece[], cursor: 0 },
  );
  const tail: Piece = { kind: "text", value: text.slice(cursor) };
  return [...pieces, tail].filter((piece) => piece.kind === "citation" || piece.value !== "");
};

const locatorFields = (suffix: string) => {
  const locator = LOCATOR.exec(suffix);
  if (locator === null) return suffix === "" ? {} : { suffix };
  /* v8 ignore next -- unreachable: an omitted label group means page, which is always a key of LOCATOR_LABELS */
  const label = LOCATOR_LABELS[locator[1] ?? "p"] ?? "page";
  /* v8 ignore next -- unreachable: the locator group is mandatory, so it always participates */
  return { label, locator: locator[2] ?? "" };
};

const toEntry = ({ key, prefix, suffix }: Item) => ({
  id: key,
  ...(prefix === "" ? {} : { prefix }),
  ...locatorFields(suffix),
});

const formatCitation = (library: Cite, entry: readonly object[]): string =>
  library.format("citation", { format: "text", template: CSL, lang: LANG, entry });

const renderCitation = (library: Cite, citation: Citation): string => {
  if (citation.kind === "cluster") return formatCitation(library, citation.items.map(toEntry));
  const { key: id } = citation.item;
  const author = formatCitation(library, [{ id, "author-only": true }]);
  const year = formatCitation(library, [{ id, "suppress-author": true }]);
  return `${author} ${year}`;
};

const keysOf = (citation: Citation): readonly string[] =>
  citation.kind === "cluster" ? citation.items.map((item) => item.key) : [citation.item.key];

const citationId = (citation: Citation, number: number): string =>
  `citation--${keysOf(citation).map((key) => key.toLowerCase()).join("--")}--${number}`;

const referenceList = (library: Cite, cited: ReadonlySet<string>): string => {
  const entries = library.data.filter((item) => cited.has(String(item.id)));
  const html = new Cite(entries).format("bibliography", {
    format: "html",
    template: CSL,
    lang: LANG,
  });
  return html
    .replace('<div class="csl-bib-body">', '<div id="refs" class="references csl-bib-body">')
    .replace(
      /data-csl-entry-id="([^"]+)" class="csl-entry"/g,
      (_, id: string) => `class="csl-entry" id="bib-${id.toLowerCase()}"`,
    );
};

export const satteriCitation = ({
  bibliography,
  suppressBibliography = false,
}: SatteriCitationOptions): MdastPluginInput => {
  const library = loadLibrary(bibliography);
  const isKnown = (key: string): boolean => library.data.some((item) => String(item.id) === key);

  return () => {
    const cited = new Set<string>();
    let citations = 0;

    const toMdast = (piece: Piece): MdastContent => {
      if (piece.kind === "text") return { type: "text", value: piece.value };
      const { citation } = piece;
      citations += 1;
      keysOf(citation).forEach((key) => cited.add(key));
      const id = citationId(citation, citations);
      const text = escapeHtml(renderCitation(library, citation));
      return { type: "html", value: `<span id="${id}">${text}</span>` };
    };

    return defineMdastPlugin({
      name: "satteri-citation",
      text: (node, ctx) => {
        const pieces = tokenize(node.value, isKnown);
        if (!pieces.some((piece) => piece.kind === "citation")) return;
        ctx.replaceNode(node, pieces.map(toMdast));
      },
      after: (root, ctx) => {
        if (suppressBibliography || cited.size === 0) return;
        ctx.appendChild(root, { type: "html", value: referenceList(library, cited) });
      },
    });
  };
};

export default satteriCitation;
