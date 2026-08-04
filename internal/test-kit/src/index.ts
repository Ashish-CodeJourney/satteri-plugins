import { markdownToHtml } from "satteri";
import type { CompileOptions, MarkdownToHtmlResult } from "satteri";

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
