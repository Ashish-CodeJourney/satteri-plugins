import { defineMdastPlugin } from "satteri";
import type { MdastNode, MdastPluginInput } from "satteri";

// Derived from Sätteri's own node union rather than a direct `mdast` import,
// which this package does not depend on.
type NodeOfType<T extends MdastNode["type"]> = Extract<MdastNode, { type: T }>;
type Text = NodeOfType<"text">;
type InlineCode = NodeOfType<"inlineCode">;
type Strong = NodeOfType<"strong">;
type Link = NodeOfType<"link">;
type PhrasingContent = Link["children"][number];

export type SatteriGithubOptions = {
  /**
   * The repository references are resolved against, as `user/project` or as a
   * GitHub URL such as `https://github.com/user/project`. Required: without it
   * there is no way to know what `#12` points at.
   */
  readonly repository: string;
  /** Wrap mention text in `strong`, as GitHub does. Defaults to `true`. */
  readonly mentionStrong?: boolean;
};

/** GitHub allows abbreviating a SHA to seven characters, and so does the text. */
const SHA_ABBREVIATION_LENGTH = 7;

const GITHUB = "https://github.com";

/**
 * GitHub stopped linking `@mention` and `@mentions` to its own blog post about
 * mentions, so neither is treated as a user.
 */
const DENIED_MENTIONS: ReadonlySet<string> = new Set(["mention", "mentions"]);

/**
 * English words spelled entirely with hex letters. Seven characters is the
 * shortest abbreviation GitHub accepts, which makes these ambiguous, so plain
 * prose wins. Write more characters to link them.
 */
const DENIED_HASHES: ReadonlySet<string> = new Set([
  "acceded",
  "deedeed",
  "defaced",
  "effaced",
  "fabaceae",
]);

// A username is alphanumerics and single hyphens, and may not start with one.
const USER = "[\\da-z][-\\da-z]{0,38}";
// A project name additionally allows dots, except a literal `.git` suffix.
const PROJECT = "(?:\\.git[\\w-]|\\.(?!git)|[\\w-])+";
const REPO = `(${USER})\\/(${PROJECT})`;

const REPOSITORY_PATTERN = new RegExp(
  `(?:^|/(?:repos/)?)${REPO}(?=\\.git|[\\/#@]|$)`,
  "i",
);

/** `user/project#12`, `user#12`, `user/project@sha` — an explicitly scoped reference. */
const REFERENCE_PATTERN = new RegExp(
  `(${USER})(?:\\/(${PROJECT}))?(?:#([1-9]\\d*)|@([a-f\\d]{7,40}))`,
  "gi",
);
const MENTION_PATTERN = new RegExp(`@(${USER}(?:\\/${USER})?)`, "gi");
const ISSUE_PATTERN = /(?:#|\bgh-)([1-9]\d*)/gi;
const COMPARE_PATTERN = /\b([a-f\d]{7,40})\.{3}([a-f\d]{7,40})\b/gi;
const HASH_PATTERN = /\b[a-f\d]{7,40}\b/gi;

type Repository = { readonly user: string; readonly project: string };

const parseRepository = (repository: string): Repository => {
  if (!repository) throw new Error("Unexpected missing `repository` in `options`");

  const match = REPOSITORY_PATTERN.exec(repository);
  if (!match?.[1] || !match[2]) {
    throw new Error(
      "Unexpected invalid `repository`, expected for example `user/project`",
    );
  }

  return { user: match[1], project: match[2] };
};

const abbreviate = (sha: string): string => sha.slice(0, SHA_ABBREVIATION_LENGTH);

const text = (value: string): Text => ({ type: "text", value });
const code = (value: string): InlineCode => ({ type: "inlineCode", value });
const strong = (child: PhrasingContent): Strong => ({
  type: "strong",
  children: [child],
});
const link = (url: string, children: readonly PhrasingContent[]): Link => ({
  type: "link",
  url,
  children: [...children],
});

/**
 * A text node is scanned by several patterns in turn. A piece already turned
 * into a node is frozen so a later pattern cannot match across or inside it,
 * which is what keeps `user/project@sha` from also matching as a bare SHA.
 */
type Piece = { readonly value: string } | { readonly node: PhrasingContent };

const isRaw = (piece: Piece): piece is { readonly value: string } =>
  "value" in piece;

/**
 * Decides what a match becomes: a node, or `undefined` to leave the matched
 * text as it was. `input` is the piece being scanned, so the boundary checks
 * see the characters a previous pattern left adjacent.
 */
type Replacer = (match: RegExpExecArray, input: string) => PhrasingContent | undefined;

const scan = (pieces: readonly Piece[], pattern: RegExp, replace: Replacer): Piece[] =>
  pieces.flatMap((piece) => {
    if (!isRaw(piece)) return [piece];

    const input = piece.value;
    const out: Piece[] = [];
    let consumed = 0;

    // A fresh lastIndex per piece; the module-level patterns are `g`.
    pattern.lastIndex = 0;
    for (
      let match = pattern.exec(input);
      match !== null;
      match = pattern.exec(input)
    ) {
      const node = replace(match, input);
      if (!node) continue;

      if (match.index > consumed) {
        out.push({ value: input.slice(consumed, match.index) });
      }
      out.push({ node });
      consumed = match.index + match[0].length;
    }

    if (consumed === 0) return [piece];
    if (consumed < input.length) out.push({ value: input.slice(consumed) });
    return out;
  });

const before = (input: string, match: RegExpExecArray, back = 1): string =>
  input.charAt(match.index - back);

const after = (input: string, match: RegExpExecArray): string =>
  input.charAt(match.index + match[0].length);

/**
 * A reference or hash may only follow whitespace, `(`, `@`, `[` or `{` — and
 * nothing at all, since `charAt` past the string returns `""`, which no
 * negated character class matches.
 */
const OPENS_REFERENCE = /[^\t\n\r (@[{]/;
const OPENS_HASH = /[^\t\n\r (@[{.]/;

const replaceReference =
  (repository: Repository): Replacer =>
  (match, input) => {
    const [, user, specificProject, no, hash] = match;
    if (!user) return undefined;
    if (OPENS_REFERENCE.test(before(input, match))) return undefined;
    if (/\w/.test(after(input, match))) return undefined;

    const project = specificProject ?? repository.project;
    const scope =
      project !== repository.project
        ? `${user}/${project}`
        : user !== repository.user
          ? user
          : "";

    if (no) {
      return link(`${GITHUB}/${user}/${project}/issues/${no}`, [
        text(`${scope}#${no}`),
      ]);
    }
    if (!hash) return undefined;

    return link(`${GITHUB}/${user}/${project}/commit/${hash}`, [
      text(`${scope}@`),
      code(abbreviate(hash)),
    ]);
  };

const replaceMention =
  (mentionStrong: boolean): Replacer =>
  (match, input) => {
    const username = match[1];
    if (!username || DENIED_MENTIONS.has(username)) return undefined;
    // A backtick either side means the mention is part of code being written.
    if (/[\w`]/.test(before(input, match))) return undefined;
    if (/[/\w`]/.test(after(input, match))) return undefined;

    const label = text(match[0]);
    return link(`${GITHUB}/${username}`, [
      mentionStrong ? strong(label) : label,
    ]);
  };

const replaceIssue =
  (repository: Repository): Replacer =>
  (match, input) => {
    const no = match[1];
    if (!no) return undefined;
    if (/\w/.test(before(input, match))) return undefined;
    if (/\w/.test(after(input, match))) return undefined;

    const { user, project } = repository;
    return link(`${GITHUB}/${user}/${project}/issues/${no}`, [text(match[0])]);
  };

const isHashBoundaryBad = (match: RegExpExecArray, input: string): boolean =>
  OPENS_HASH.test(before(input, match)) ||
  // GitHub links a SHA after `..` but not after a single `.`.
  (before(input, match) === "." && before(input, match, 2) !== ".") ||
  /\w/.test(after(input, match));

const replaceCompare =
  (repository: Repository): Replacer =>
  (match, input) => {
    const [value, base, compare] = match;
    if (!base || !compare) return undefined;
    if (isHashBoundaryBad(match, input) || DENIED_HASHES.has(value)) return undefined;

    const { user, project } = repository;
    return link(`${GITHUB}/${user}/${project}/compare/${base}...${compare}`, [
      code(`${abbreviate(base)}...${abbreviate(compare)}`),
    ]);
  };

const replaceHash =
  (repository: Repository): Replacer =>
  (match, input) => {
    const value = match[0];
    if (isHashBoundaryBad(match, input) || DENIED_HASHES.has(value.toLowerCase()))
      return undefined;

    const { user, project } = repository;
    return link(`${GITHUB}/${user}/${project}/commit/${value}`, [
      code(abbreviate(value)),
    ]);
  };

/**
 * Links references to users, commits and issues the way GitHub does, a port of
 * `remark-github`.
 *
 * Sätteri keeps prose in mdast `text` nodes, so each is scanned and split into
 * the pieces the patterns found. `inlineCode` and `code` are separate node
 * types that a `text` visitor never sees, so code is safe by construction;
 * text inside a `link` is still a text node, so the parent is checked to avoid
 * nesting a link in a link.
 */
export const satteriGithub = ({
  repository,
  mentionStrong = true,
}: SatteriGithubOptions): MdastPluginInput => {
  // Parsed once, at configuration time, so a bad repository fails loudly rather
  // than silently producing nothing.
  const parsed = parseRepository(repository);

  const passes: readonly (readonly [RegExp, Replacer])[] = [
    [REFERENCE_PATTERN, replaceReference(parsed)],
    [MENTION_PATTERN, replaceMention(mentionStrong)],
    [ISSUE_PATTERN, replaceIssue(parsed)],
    [COMPARE_PATTERN, replaceCompare(parsed)],
    [HASH_PATTERN, replaceHash(parsed)],
  ];

  return defineMdastPlugin({
    name: "satteri-github",
    text(node, ctx) {
      const parentType = ctx.parent(node)?.type;
      if (parentType === "link" || parentType === "linkReference") return;

      const pieces = passes.reduce<readonly Piece[]>(
        (current, [pattern, replace]) => scan(current, pattern, replace),
        [{ value: node.value }],
      );

      if (pieces.length === 1 && isRaw(pieces[0]!)) return;

      const nodes = pieces.map<PhrasingContent>((piece) =>
        isRaw(piece) ? text(piece.value) : piece.node,
      );

      // `replaceNode` takes a single node, so the visited node becomes the first
      // piece and the rest are spliced in after it.
      const [first, ...rest] = nodes;
      ctx.replaceNode(node, first!);
      if (rest.length > 0) ctx.insertAfter(node, rest);
    },
  });
};

export default satteriGithub;
