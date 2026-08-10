import type { LiteDocument } from "mathjax-full/js/adaptors/lite/Document.js";
import type { LiteElement } from "mathjax-full/js/adaptors/lite/Element.js";
import type { LiteText } from "mathjax-full/js/adaptors/lite/Text.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import type { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import type { OutputJax } from "mathjax-full/js/core/OutputJax.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { CHTML } from "mathjax-full/js/output/chtml.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { defineMdastPlugin } from "satteri";
import type { MdastPluginInput } from "satteri";

/** Open/close marker pair, as MathJax's TeX input jax expects them. */
export type MathNotation = readonly [open: string, close: string];

/**
 * Configuration for the TeX input jax.
 * @see http://docs.mathjax.org/en/latest/options/input/tex.html
 */
export type TexOptions = {
  readonly baseURL?: string;
  readonly digits?: RegExp;
  readonly displayMath?: readonly MathNotation[];
  readonly formatError?: (jax: unknown, error: unknown) => string;
  readonly inlineMath?: readonly MathNotation[];
  readonly macros?: Readonly<Record<string, unknown>>;
  readonly maxBuffer?: number;
  readonly maxMacros?: number;
  readonly packages?: readonly string[];
  readonly processEnvironments?: boolean;
  readonly processEscapes?: boolean;
  readonly processRefs?: boolean;
  readonly tagIndent?: string;
  readonly tagSide?: "left" | "right";
  readonly tags?: "all" | "ams" | "none";
  readonly useLabelIds?: boolean;
};

type CommonOutputOptions = {
  readonly displayAlign?: "center" | "left" | "right";
  readonly displayIndent?: string;
  readonly exFactor?: number;
  readonly mathmlSpacing?: boolean;
  readonly merrorInheritFont?: boolean;
  readonly minScale?: number;
  readonly mtextInheritFont?: boolean;
  readonly scale?: number;
  readonly skipAttributes?: Readonly<Record<string, boolean>>;
};

/**
 * Configuration for the SVG output jax.
 * @see http://docs.mathjax.org/en/latest/options/output/svg.html
 */
export type SvgOptions = CommonOutputOptions & {
  readonly fontCache?: "global" | "local" | "none";
  readonly internalSpeechTitles?: boolean;
  readonly localID?: string;
  readonly titleID?: number;
};

/**
 * Configuration for the CHTML output jax. `fontURL` is required.
 * @see http://docs.mathjax.org/en/latest/options/output/chtml.html
 */
export type ChtmlOptions = CommonOutputOptions & {
  readonly fontURL: string;
  readonly adaptiveCSS?: boolean;
  readonly matchFontHeight?: boolean;
};

/** Which MathJax output jax to render with. */
export type MathjaxOutput = "svg" | "chtml" | "browser";

export type SatteriMathjaxOptions = {
  /** Output jax. Default `"svg"`, matching `rehype-mathjax`'s default export. */
  readonly output?: MathjaxOutput;
  readonly tex?: TexOptions;
  readonly svg?: SvgOptions;
  /** Required when `output` is `"chtml"`, because MathJax needs a font URL. */
  readonly chtml?: ChtmlOptions;
  /**
   * Emit MathJax's generated stylesheet alongside the first expression in each
   * document. Default `true`. Ignored for `"browser"`, which has no stylesheet.
   */
  readonly styleSheet?: boolean;
  /** Colour of the source text left in place when rendering throws. Default `"#cc0000"`. */
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
  `<span class="mathjax-error" title="${escapeHtml(message)}" ` +
  `style="color:${escapeHtml(color)}">${escapeHtml(source)}</span>`;

type Renderer = {
  readonly render: (source: string, display: boolean) => string;
  readonly styleSheet: () => string | undefined;
};

// A handler is a process-wide registration in MathJax, so it is made once for
// the lifetime of the module rather than per document; only the `MathDocument`
// is per document, which is what resets the `MJX-n` id counter.
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

type LiteOutputJax = OutputJax<LiteElement, LiteText, LiteDocument>;

const createMathjaxRenderer = (
  tex: TexOptions,
  output: LiteOutputJax,
  emitStyleSheet: boolean,
): Renderer => {
  const document: MathDocument<LiteElement, LiteText, LiteDocument> =
    mathjax.document("", {
      InputJax: new TeX({ packages: AllPackages, ...tex }),
      OutputJax: output,
    });

  return {
    render: (source, display) =>
      // `convert` is typed as possibly returning an `MmlNode`, which only
      // happens for pipelines that stop before the output jax; with an output
      // jax attached the result is always a rendered element.
      adaptor.outerHTML(document.convert(source, { display }) as LiteElement),
    styleSheet: () =>
      emitStyleSheet
        ? adaptor.outerHTML(output.styleSheet(document))
        : undefined,
  };
};

const createBrowserRenderer = (tex: TexOptions): Renderer => {
  const display = tex.displayMath?.[0] ?? ["\\[", "\\]"];
  const inline = tex.inlineMath?.[0] ?? ["\\(", "\\)"];

  return {
    render: (source, isDisplay) => {
      const [open, close] = isDisplay ? display : inline;
      return escapeHtml(open + source + close);
    },
    styleSheet: () => undefined,
  };
};

const createRendererFactory = ({
  output = "svg",
  tex = {},
  svg = {},
  chtml,
  styleSheet = true,
}: SatteriMathjaxOptions): (() => Renderer) => {
  if (output === "browser") {
    return () => createBrowserRenderer(tex);
  }

  if (output === "svg") {
    return () => createMathjaxRenderer(tex, new SVG(svg), styleSheet);
  }

  if (!chtml?.fontURL) {
    throw new Error(
      "satteri-mathjax: `chtml.fontURL` is required when `output` is " +
        '"chtml"; set it to a URL serving the MathJax CHTML fonts.',
    );
  }

  // The stylesheet is emitted with the *first* expression, before MathJax has
  // seen the rest of the document, so an adaptive sheet would be missing rules
  // for everything after it. A complete sheet is the only order-independent
  // one; an author who accepts the risk can ask for adaptive explicitly.
  const chtmlOptions = { adaptiveCSS: false, ...chtml };

  return () => createMathjaxRenderer(tex, new CHTML(chtmlOptions), styleSheet);
};

/**
 * Renders math with MathJax — a port of `rehype-mathjax`.
 *
 * Sätteri parses `$…$` and `$$…$$` but renders nothing, so without this plugin
 * math reaches the page as raw TeX. Requires `features: { math: true }`.
 *
 * Runs at the MDAST stage rather than on HAST: Astro's Sätteri processor puts
 * its syntax highlighter ahead of user HAST plugins, and that highlighter would
 * otherwise claim display math as a plaintext code block before this plugin
 * ever saw it.
 */
export const satteriMathjax = (
  options: SatteriMathjaxOptions = {},
): MdastPluginInput => {
  const { errorColor = "#cc0000" } = options;
  // Configuration is validated eagerly so a bad setup fails where it is
  // written, not part-way through compiling some document.
  const rendererFactory = createRendererFactory(options);

  // A factory, not a definition: Sätteri calls it once per compile, which gives
  // every document its own MathJax id counter and its own "stylesheet already
  // emitted" flag. Building the renderer lazily keeps math-free documents from
  // paying for MathJax at all.
  return () => {
    let renderer: Renderer | undefined;
    let styleSheetPending = true;

    const render = (source: string, display: boolean) => {
      renderer ??= rendererFactory();

      const prefix = styleSheetPending ? (renderer.styleSheet() ?? "") : "";
      styleSheetPending = false;

      try {
        return {
          type: "html" as const,
          value: prefix + renderer.render(source, display),
        };
      } catch (error) {
        // MathJax renders TeX mistakes as `merror` markup rather than throwing,
        // so reaching here means something more unusual went wrong. Either way
        // one bad expression should not fail the whole build.
        return {
          type: "html" as const,
          value: prefix + errorSpan(source, String(error), errorColor),
        };
      }
    };

    return defineMdastPlugin({
      name: "satteri-mathjax",
      math: (node) => render(node.value, true),
      inlineMath: (node) => render(node.value, false),
    });
  };
};

export default satteriMathjax;
