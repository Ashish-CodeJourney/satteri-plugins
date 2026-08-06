# Security policy

## Reporting a vulnerability

Please report privately through
[GitHub security advisories](https://github.com/Ashish-CodeJourney/satteri-plugins/security/advisories/new)
rather than opening a public issue.

Include the Markdown input, the HTML it produced, and the version you used. A minimal reproduction
matters more than a long description.

Expect an acknowledgement within a few days. Once a fix is released the advisory will be published
with credit, unless you would rather stay anonymous.

## Scope

`satteri-sanitize` is the package where a security report is most likely to apply. Anything that
makes it emit executable output is a vulnerability: a live `script`, `iframe` or event handler, or a
`javascript:` URL that survives.

The other packages are in scope where they emit HTML from document content. `satteri-katex` echoes a
failing expression back into the page, and escapes it before doing so.

## Something you should know regardless

**Sätteri passes raw HTML through unparsed.** Without a sanitiser, this Markdown:

```md
<script>alert(1)</script>
```

reaches the page as a live script tag. That is Sätteri's behaviour, not a bug in these packages, and
it is the same posture as `unified` with `allowDangerousHtml` enabled.

If any of your Markdown comes from somewhere you do not control, comments, user profiles, a CMS, a
pull request body, run [`satteri-sanitize`](packages/satteri-sanitize) last in your `hastPlugins`.

## Supported versions

The latest minor release of each package receives security fixes. These packages are pre-1.0 and
there are no long-term support branches.
