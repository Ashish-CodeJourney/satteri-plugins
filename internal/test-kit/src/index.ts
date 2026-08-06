import { markdownToHtml, mdxToJs } from "satteri";
import type {
  CompileOptions,
  MarkdownToHtmlResult,
  MdxCompileOptions,
  MdxToJsResult,
} from "satteri";

export type RenderOptions = Pick<
  CompileOptions,
  "mdastPlugins" | "hastPlugins" | "features" | "fileURL" | "data"
>;

/**
 * Compiles markdown with the plugin under test and returns the full result.
 *
 * `markdownToHtml` is sync unless a visitor is async; awaiting a non-promise is
 * harmless, so every test can use one signature regardless of the plugin.
 */
export const compile = async (
  markdown: string,
  options: RenderOptions = {},
): Promise<MarkdownToHtmlResult> => await markdownToHtml(markdown, options);

/** Compiles markdown and returns only the rendered HTML, trimmed. */
export const render = async (
  markdown: string,
  options: RenderOptions = {},
): Promise<string> => (await compile(markdown, options)).html.trim();

export type MdxOptions = Pick<
  MdxCompileOptions,
  "mdastPlugins" | "hastPlugins" | "features" | "fileURL" | "data" | "outputFormat"
>;

/**
 * Compiles MDX and returns the full result, for plugins whose output is JS
 * rather than HTML — exports, imports and the like.
 */
export const compileMdx = async (
  mdx: string,
  options: MdxOptions = {},
): Promise<MdxToJsResult> => await mdxToJs(mdx, options);

/** Compiles MDX and returns only the generated JavaScript. */
export const renderMdx = async (
  mdx: string,
  options: MdxOptions = {},
): Promise<string> => (await compileMdx(mdx, options)).code;
