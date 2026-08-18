import { render } from "@satteri-plugins/test-kit";
import { describe, expect, it } from "vitest";
import { satteriSanitize } from "./index.js";

/**
 * A corpus check rather than a behaviour spec. The tests in `index.test.ts`
 * pin down what the plugin does; this asserts the one thing that must hold for
 * every input: nothing executable survives.
 *
 * Payloads are drawn from the shapes that recur across XSS filter-evasion
 * lists: tag casing, attribute quoting, entity encoding, control characters,
 * nesting, and malformed tags that browsers repair.
 */
const PAYLOADS = [
  '<script>alert(1)</script>',
  '<SCRIPT>alert(1)</SCRIPT>',
  '<script src="//evil.com/x.js"></script>',
  '<script\n>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<img src="x" onerror="alert(1)">',
  "<img src=x onerror=alert(`1`)>",
  '<img/src=x/onerror=alert(1)>',
  '<IMG SRC=x ONERROR=alert(1)>',
  '<svg onload=alert(1)>',
  '<svg><script>alert(1)</script></svg>',
  '<body onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
  '<object data="javascript:alert(1)"></object>',
  '<embed src="javascript:alert(1)">',
  '<a href="javascript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>',
  '<a href="java&#115;cript:alert(1)">x</a>',
  '<a href="javascript&colon;alert(1)">x</a>',
  '<a href="javascript&#58;alert(1)">x</a>',
  '<a href="java&colon;script:alert(1)">x</a>',
  '<a href="java\tscript:alert(1)">x</a>',
  '<a href="java\nscript:alert(1)">x</a>',
  '<a href=" javascript:alert(1)">x</a>',
  '<a href="&#106;avascript:alert(1)">x</a>',
  '<a href="javascript&sol;alert(1)">x</a>',
  '<a href="data&colon;text&sol;html&comma;base64&comma;PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '<a href="vbscript:msgbox(1)">x</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>',
  '[md](javascript:alert(1))',
  '![md](javascript:alert(1))',
  '<div onclick="alert(1)">x</div>',
  '<div onmouseover=alert(1)>x</div>',
  '<p style="background:url(javascript:alert(1))">x</p>',
  '<form action="javascript:alert(1)"><input></form>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<base href="javascript:alert(1)//">',
  '<link rel="stylesheet" href="javascript:alert(1)">',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '<template><script>alert(1)</script></template>',
  '<noscript><p title="</noscript><script>alert(1)</script>">',
  '<!--<script>alert(1)</script>-->',
  '<div title="a>b" onclick="alert(1)">x</div>',
  '<a href="x" title="</a><script>alert(1)</script>">y</a>',
  '<<script>alert(1)</script>',
  '<script>alert(1)',
];

/**
 * Only live markup is checked. Escaped text such as `&lt;img onerror=...&gt;`
 * is inert, and Markdown routinely produces it: backticks in a payload turn the
 * whole thing into a code span. Matching the raw string would flag those as
 * failures and, worse, would train the corpus to accept weaker assertions.
 */
const liveTags = (html: string): string[] => html.match(/<[^>]*>/g) ?? [];

/** Markers that must never appear inside a live tag. */
const FORBIDDEN = [
  /<script/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<svg/i,
  /<form/i,
  /<meta/i,
  /<base[\s>]/i,
  /<link/i,
  /\son[a-z]+\s*=/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /\sstyle\s*=/i,
  /srcdoc/i,
];

describe("satteri-sanitize xss corpus", () => {
  for (const payload of PAYLOADS) {
    it(`neutralises ${JSON.stringify(payload).slice(0, 62)}`, async () => {
      const html = await render(payload, { hastPlugins: [satteriSanitize()] });
      const markup = liveTags(html).join("");

      for (const pattern of FORBIDDEN) {
        expect(markup, `matched ${pattern} in: ${html}`).not.toMatch(pattern);
      }
    });
  }

  it("neutralises every payload when they are concatenated", async () => {
    const html = await render(PAYLOADS.join("\n\n"), {
      hastPlugins: [satteriSanitize()],
    });
    const markup = liveTags(html).join("");

    for (const pattern of FORBIDDEN) {
      expect(markup, `matched ${pattern} in: ${html}`).not.toMatch(pattern);
    }
  });
});
