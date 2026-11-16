declare module "@citation-js/core" {
  export type CslItem = { readonly id: string | number } & Readonly<Record<string, unknown>>;

  export class Cite {
    constructor(input: string | readonly object[]);
    readonly data: readonly CslItem[];
    format(
      type: "citation",
      options: {
        readonly format: "text";
        readonly template: string;
        readonly lang: string;
        readonly entry: readonly object[];
      },
    ): string;
    format(
      type: "bibliography",
      options: { readonly format: "html"; readonly template: string; readonly lang: string },
    ): string;
  }
}
