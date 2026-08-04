import type { Element, ElementContent, Properties } from "hast";
import { defineHastPlugin } from "satteri";
import type { HastPluginInput } from "satteri";

/** Where the link is placed relative to the heading. */
export type AutolinkBehavior = "prepend" | "append" | "wrap" | "before" | "after";

type Build<T> = T | ((heading: Readonly<Element>) => T);

export type SatteriAutolinkHeadingsOptions = {
  /** Where to put the link. Default `"prepend"`. */
  readonly behavior?: AutolinkBehavior;
  /** Heading tag names to link. Default all six levels. */
  readonly test?: readonly string[];
  /** Nodes placed inside the link. Default a `<span class="icon icon-link">`. */
  readonly content?: Build<ElementContent | readonly ElementContent[]>;
  /** Properties of the link, replacing (not merging with) the defaults. */
  readonly properties?: Build<Properties>;
  /** Extra properties merged onto the heading itself. */
  readonly headingProperties?: Build<Properties>;
  /** Element wrapping link and heading together, for `before`/`after`. */
  readonly group?: Build<Element>;
};

const ALL_HEADINGS = ["h1", "h2", "h3", "h4", "h5", "h6"];

const DEFAULT_CONTENT: Element = {
  type: "element",
  tagName: "span",
  properties: { className: ["icon", "icon-link"] },
  children: [],
};

/** `rehype-autolink-headings` hides the link from assistive tech only when it sits inside the heading. */
const DEFAULT_PROPERTIES: Record<AutolinkBehavior, Properties> = {
  prepend: { ariaHidden: "true", tabIndex: -1 },
  append: { ariaHidden: "true", tabIndex: -1 },
  wrap: {},
  before: {},
  after: {},
};

const toArray = (
  value: ElementContent | readonly ElementContent[],
): ElementContent[] => (Array.isArray(value) ? [...value] : [value as ElementContent]);

const build = <T>(option: Build<T>, heading: Readonly<Element>): T =>
  typeof option === "function"
    ? (option as (heading: Readonly<Element>) => T)(heading)
    : option;

const anchor = (
  properties: Properties,
  children: readonly ElementContent[],
): Element => ({ type: "element", tagName: "a", properties, children: [...children] });

/**
 * Adds a link to every heading that has an `id` — a port of
 * `rehype-autolink-headings`. Run it after a plugin that assigns ids, such as
 * `satteri-slug`.
 */
export const satteriAutolinkHeadings = ({
  behavior = "prepend",
  test = ALL_HEADINGS,
  content,
  properties,
  headingProperties,
  group,
}: SatteriAutolinkHeadingsOptions = {}): HastPluginInput =>
  defineHastPlugin({
    name: "satteri-autolink-headings",
    element: {
      filter: [...test],
      visit(heading, ctx) {
        const id = heading.properties?.["id"];
        if (typeof id !== "string" || id === "") return;

        const linkContent =
          content === undefined
            ? behavior === "wrap"
              ? []
              : [DEFAULT_CONTENT]
            : toArray(build(content, heading));

        const link = anchor(
          {
            ...(properties === undefined
              ? DEFAULT_PROPERTIES[behavior]
              : build(properties, heading)),
            href: `#${id}`,
          },
          linkContent,
        );

        const rebuiltHeading = (children: readonly ElementContent[]): Element => ({
          type: "element",
          tagName: heading.tagName,
          properties: {
            ...heading.properties,
            ...(headingProperties === undefined
              ? {}
              : build(headingProperties, heading)),
          },
          children: [...children],
        });

        if (behavior === "wrap") {
          return rebuiltHeading([
            anchor(link.properties ?? {}, [...heading.children, ...linkContent]),
          ]);
        }

        if (behavior === "prepend") {
          return rebuiltHeading([link, ...heading.children]);
        }

        if (behavior === "append") {
          return rebuiltHeading([...heading.children, link]);
        }

        if (group !== undefined) {
          const wrapper = build(group, heading);
          return {
            ...wrapper,
            children:
              behavior === "before"
                ? [link, rebuiltHeading(heading.children)]
                : [rebuiltHeading(heading.children), link],
          };
        }

        // Sätteri cannot encode a root fragment as a replacement, so the link is
        // spliced in as a sibling and the heading is mutated in place.
        if (headingProperties !== undefined) {
          for (const [key, value] of Object.entries(
            build(headingProperties, heading),
          )) {
            ctx.setProperty(heading, key, value);
          }
        }

        if (behavior === "before") ctx.insertBefore(heading, link);
        else ctx.insertAfter(heading, link);

        return undefined;
      },
    },
  });

export default satteriAutolinkHeadings;
