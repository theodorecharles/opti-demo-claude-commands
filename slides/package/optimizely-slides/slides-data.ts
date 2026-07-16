import { slidesConfig, type HeroVariation } from "./slides.config";

// All demo-specific values flow from slides.config.ts. Prose here is generic
// and product-accurate; swap copy freely per prospect.

const SDK = slidesConfig.sdkKey || "YOUR_SDK_KEY";
const FLAG = slidesConfig.flagKey;
const USER = "visitor_123";
const SNIPPET_ID = slidesConfig.wxSnippetId;

export type Lang = "node" | "react" | "java" | "curl";

export const LANGS: { id: Lang; label: string; file: string }[] = [
  { id: "node", label: "Node.js", file: "app.js" },
  { id: "react", label: "React", file: "Hero.tsx" },
  { id: "java", label: "Java", file: "Shop.java" },
  { id: "curl", label: "cURL · Agent", file: "terminal" },
];

export type StepKey =
  | "install"
  | "initialize"
  | "userContext"
  | "decide"
  | "variables"
  | "trackBasic"
  | "trackTags";

export type Step = {
  title: string;
  blurb: string;
  code: Record<Lang, string>;
  bullets?: string[];
  // Optional trailing block that renders commented-out and "uncomments" on
  // hover (used for the ODP real-time segments add-on). Not every language has
  // one, so it's partial.
  odp?: Partial<Record<Lang, { commented: string; revealed: string }>>;
};

// A sample variation used to make the decide()/variables code examples show
// concrete, on-brand values. Prefer a challenger over the control for contrast.
const SAMPLE: HeroVariation =
  slidesConfig.heroVariations[1] ?? slidesConfig.heroVariations[0];

export const STEPS: Record<StepKey, Step> = {
  install: {
    title: "Install the SDK",
    blurb:
      "Each platform pulls in the Optimizely client as a dependency. The cURL track instead runs Optimizely Agent — a standalone service that wraps the SDK behind a REST API for any language.",
    code: {
      node: `npm install @optimizely/optimizely-sdk`,
      react: `npm install @optimizely/react-sdk`,
      java: `// build.gradle
dependencies {
  implementation 'com.optimizely.ab:core-api:4.0.1'
  implementation 'com.optimizely.ab:core-httpclient-impl:4.0.1'
}`,
      curl: `# Run Optimizely Agent (Docker) — no SDK to embed.
docker run -p 8080:8080 \\
  -e "OPTIMIZELY_CLIENT_SDKKEYS=${SDK}" \\
  optimizely/agent`,
    },
  },

  initialize: {
    title: "Import & initialize",
    blurb:
      "Create the client with your environment's SDK key. The SDK fetches the datafile and polls for changes, so flag/experiment updates reach your app within a couple of minutes — no redeploy.",
    code: {
      node: `import {
  createInstance,
  createPollingProjectConfigManager,
} from '@optimizely/optimizely-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: '${SDK}',
    autoUpdate: true,       // poll the datafile for changes
    updateInterval: 120000, // every 2 min
  }),
});

await optimizely.onReady();`,
      react: `import {
  createInstance,
  createPollingProjectConfigManager,
  OptimizelyProvider,
} from '@optimizely/react-sdk';

const optimizely = createInstance({
  projectConfigManager: createPollingProjectConfigManager({
    sdkKey: '${SDK}',
    autoUpdate: true,         // live updates
    updateInterval: 120000,   // poll every 2 min
  }),
});

// Wrap your app so any component can decide()
<OptimizelyProvider client={optimizely} user={{ id: '${USER}' }}>
  <App />
</OptimizelyProvider>`,
      java: `import com.optimizely.ab.Optimizely;
import com.optimizely.ab.OptimizelyFactory;

// Auto-fetches + polls the datafile for this SDK key
Optimizely optimizely =
    OptimizelyFactory.newDefaultInstance("${SDK}");`,
      curl: `# Agent already holds the datafile for the SDK key.
# Pass the key as a header on every request.
curl http://localhost:8080/v1/config \\
  -H "X-Optimizely-SDK-Key: ${SDK}"`,
    },
  },

  userContext: {
    title: "Create a user context",
    blurb:
      "A user context = a user ID + attributes. The ID drives deterministic bucketing; attributes power audience targeting.",
    bullets: [
      "The user ID is the bucketing key — pass a stable, logged-in ID so a user gets the same variation on every device and platform.",
      "Bucketing is deterministic: Optimizely hashes (user ID + experiment ID) with MurmurHash into a bucket from 0–9,999.",
      "Same inputs always map to the same bucket — no server round-trip and no stored assignment needed.",
      "Attributes (plan, device_type, …) don't change the bucket — they decide audience eligibility (who's targeted).",
      "No PII required — any opaque, stable identifier works; anonymous users can use a generated ID / VUID.",
      'Need behavioral targeting? Pull real-time segments from Optimizely Data Platform (ODP) with fetchQualifiedSegments(), then target on isQualifiedFor("…") — no attributes to pass yourself.',
    ],
    code: {
      node: `const user = optimizely.createUserContext('${USER}', {
  plan: 'pro',
  device_type: 'desktop',
  logged_in: true,
  loyalty_tier: 'gold',
});`,
      react: `// The 'user' prop IS the user context.
// Change it and every decide() re-evaluates automatically.
<OptimizelyProvider
  client={optimizely}
  user={{
    id: '${USER}',
    attributes: {
      plan: 'pro',
      loyalty_tier: 'gold',
      logged_in: true,
    },
  }}
>`,
      java: `Map<String, Object> attributes = new HashMap<>();
attributes.put("plan", "pro");
attributes.put("loyalty_tier", "gold");
attributes.put("logged_in", true);

OptimizelyUserContext user =
    optimizely.createUserContext("${USER}", attributes);`,
      curl: `# With Agent the user context travels in each request body:
#   "userId"          -> bucketing
#   "userAttributes"  -> targeting
# See the decide / track calls on the next slides.

# Real-time ODP segments are fetched server-side and usable
# as audience conditions (qualified segments) in your rules.`,
    },
    // Real-time ODP segments — shown commented-out, uncomments on hover.
    odp: {
      node: {
        commented: `// Pull real-time segments from Optimizely Data Platform (ODP)
// await user.fetchQualifiedSegments();
// user.isQualifiedFor('vip_customers');`,
        revealed: `// Pull real-time segments from Optimizely Data Platform (ODP)
await user.fetchQualifiedSegments();
user.isQualifiedFor('vip_customers'); // true / false`,
      },
      react: {
        commented: `// Real-time ODP segments via the user context hook:
// const { userContext } = useOptimizelyUserContext();
// await userContext.fetchQualifiedSegments();
// userContext.isQualifiedFor('vip_customers');`,
        revealed: `// Real-time ODP segments via the user context hook:
const { userContext } = useOptimizelyUserContext();
await userContext.fetchQualifiedSegments();
userContext.isQualifiedFor('vip_customers');`,
      },
      java: {
        commented: `// Real-time segments from Optimizely Data Platform (ODP)
// user.fetchQualifiedSegments();
// boolean vip = user.isQualifiedFor("vip_customers");`,
        revealed: `// Real-time segments from Optimizely Data Platform (ODP)
user.fetchQualifiedSegments();
boolean vip = user.isQualifiedFor("vip_customers");`,
      },
    },
  },

  decide: {
    title: "Make a decision",
    blurb:
      "decide() evaluates a flag for this user — enabled, variation, and variables — and it's the single call your code branches on.",
    bullets: [
      "decide() runs 100% locally against the in-memory datafile — no network request, sub-millisecond.",
      "Zero added latency on your request path, and it keeps working even if Optimizely is unreachable.",
      "Bucketing is computed locally (MurmurHash), so the result is identical across SDKs for the same user.",
      "The only network traffic is asynchronous and off the critical path: datafile polling + batched event dispatch.",
    ],
    code: {
      node: `const decision = user.decide('${FLAG}');

decision.enabled;       // true / false
decision.variationKey;  // e.g. "${SAMPLE.key}"
decision.variables;     // { headline, subtitle, ... }`,
      react: `import { useDecide } from '@optimizely/react-sdk';

function Hero() {
  const { decision } = useDecide('${FLAG}');
  if (!decision?.enabled) return <DefaultHero />;
  return <Hero {...decision.variables} />;
}`,
      java: `OptimizelyDecision decision = user.decide("${FLAG}");

boolean enabled     = decision.getEnabled();
String  variation   = decision.getVariationKey();  // "${SAMPLE.key}"
OptimizelyJSON vars = decision.getVariables();`,
      curl: `curl -X POST 'http://localhost:8080/v1/decide?keys=${FLAG}' \\
  -H 'X-Optimizely-SDK-Key: ${SDK}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "userId": "${USER}",
    "userAttributes": { "plan": "pro", "loyalty_tier": "gold" }
  }'`,
    },
  },

  variables: {
    title: "Read a flag's variables",
    blurb:
      "Variations carry typed variables — strings, booleans, numbers, JSON. Your UI reads them and renders. Switch the variation tab to see the same code produce a different experience.",
    code: {
      node: `const decision = user.decide('${FLAG}');

const headline = decision.variables['headline'];   // string
const bgColor  = decision.variables['bg_color'];    // string
const cta      = decision.variables['cta_label'];   // string

renderHero({ headline, bgColor, cta });`,
      react: `const { decision } = useDecide('${FLAG}');
const { headline, subtitle, cta_label, bg_color } =
  decision?.variables ?? {};

return (
  <section style={{ background: bg_color }}>
    <h1>{headline}</h1>
    <p>{subtitle}</p>
    <button>{cta_label}</button>
  </section>
);`,
      java: `OptimizelyJSON vars = decision.getVariables();

String headline = vars.getValue("headline", String.class);
String bgColor  = vars.getValue("bg_color", String.class);
String cta      = vars.getValue("cta_label", String.class);`,
      curl: `# The decide response already contains the variables:
{
  "flagKey": "${FLAG}",
  "enabled": true,
  "variationKey": "${SAMPLE.key}",
  "variables": {
    "headline": "${SAMPLE.headline}",
    "bg_color": "${SAMPLE.bg_color}",
    "cta_label": "${SAMPLE.cta_label}"
  }
}`,
    },
  },

  trackBasic: {
    title: "Track an event",
    blurb:
      "Tracking ties user behavior back to experiments. One call records a conversion for whatever variation the user is in — Optimizely attributes it automatically.",
    code: {
      node: `user.trackEvent('add_to_cart');`,
      react: `import { useOptimizelyUserContext } from '@optimizely/react-sdk';

const { userContext } = useOptimizelyUserContext();
userContext?.trackEvent('add_to_cart');`,
      java: `user.trackEvent("add_to_cart");`,
      curl: `curl -X POST 'http://localhost:8080/v1/track?eventKey=add_to_cart' \\
  -H 'X-Optimizely-SDK-Key: ${SDK}' \\
  -H 'Content-Type: application/json' \\
  -d '{ "userId": "${USER}" }'`,
    },
  },

  trackTags: {
    title: "Track with tags & values",
    blurb:
      "Attach event tags for richer metrics. revenue (integer cents) and value (float) are reserved — they power revenue and numeric-metric goals. Add any custom tags you want to slice by.",
    code: {
      node: `user.trackEvent('purchase_completed', {
  revenue: 4900,      // reserved: integer cents -> $49.00
  value: 49.00,       // reserved: float metric
  category: 'plans',
  items: 1,
});`,
      react: `userContext?.trackEvent('purchase_completed', {
  revenue: 4900,      // cents
  value: 49.00,
  category: 'plans',
  items: 1,
});`,
      java: `Map<String, Object> tags = new HashMap<>();
tags.put("revenue", 4900);     // reserved: integer cents
tags.put("value", 49.00);      // reserved: float metric
tags.put("category", "plans");

user.trackEvent("purchase_completed", tags);`,
      curl: `curl -X POST 'http://localhost:8080/v1/track?eventKey=purchase_completed' \\
  -H 'X-Optimizely-SDK-Key: ${SDK}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "userId": "${USER}",
    "eventTags": { "revenue": 4900, "value": 49.00, "category": "plans" }
  }'`,
    },
  },
};

// Datafile concept slide
export const DATAFILE = {
  title: "The datafile",
  blurb:
    "Every decision reads from the datafile — a JSON snapshot of your project's flags, experiments, audiences, and traffic allocation for one environment.",
  bullets: [
    "Downloaded once at init and held in memory; decide() reads it locally — that's why there's no per-decision network call.",
    "One per environment — each SDK key maps to its own datafile, so dev and prod stay isolated.",
    "Served from Optimizely's CDN; the SDK re-fetches it on the polling interval and swaps it in atomically.",
    "Flip a flag in Optimizely → a new datafile is published → the SDK picks it up on the next poll. No redeploy.",
    "Need it instantly? Push updates via webhook, or self-host the datafile yourself.",
  ],
  code: `GET https://cdn.optimizely.com/datafiles/${SDK}.json

{
  "version": "4",
  "revision": "42",
  "featureFlags": [ /* flags + their variables */ ],
  "experiments":  [ /* rules, variations, traffic */ ],
  "audiences":    [ /* targeting conditions */ ],
  "events":       [ /* trackable event keys */ ]
}`,
};

// Architecture slide snippets
export const WX_SNIPPET = `<!-- Web Experimentation: one snippet in your <head> -->
<script src="https://cdn.optimizely.com/js/${SNIPPET_ID}.js"></script>

<!-- Changes are authored in the visual editor and applied
     to the page's DOM as it loads. No code deploy. -->`;

export const FX_SNIPPET = `// Feature Experimentation: an SDK in your code
import { createInstance } from '@optimizely/optimizely-sdk';

const optimizely = createInstance({ sdkKey: 'YOUR_SDK_KEY' });
const user = optimizely.createUserContext('${USER}', {
  plan: 'pro',
});

const decision = user.decide('${FLAG}');
if (decision.enabled) renderHero(decision.variables);`;

// Live-preview variations for the "read variables" slide. Same code, different
// experience — sourced from slides.config.ts.
export type { HeroVariation };
export const HERO_VARIATIONS: HeroVariation[] = slidesConfig.heroVariations;

// ===========================================================================
// Web Experimentation track
// ===========================================================================

export const WX_OVERVIEW_BULLETS = [
  "One JavaScript snippet in your page's <head> — no SDK to embed, and no deploy for each change.",
  "Experiences are authored in a point-and-click Visual Editor. Marketers ship changes without engineering.",
  "Changes are applied as DOM mutations in the browser as the page loads.",
  "Or go snippetless: run the same experiments at the CDN edge (Cloudflare / Akamai / Vercel) for zero flicker.",
  "Same audiences, metrics, and Stats Engine as Feature Experimentation — one program, shared results.",
];

export const WX_SNIPPET_BULLETS = [
  "The snippet loads from Optimizely's CDN in the <head>, before your content paints.",
  "It pulls your project's config — experiments, variations, audiences, targeting — and evaluates it locally in the browser.",
  "Matching variations are applied as DOM changes.",
  "An anti-flicker snippet briefly hides affected elements so visitors never see a flash of the original content (FOOC).",
  "Flip an experiment live in Optimizely and the snippet picks it up on its next load — no redeploy.",
];

// Client-side render sequence for the snippet slide.
export const WX_FLOW: { n: string; title: string; detail: string }[] = [
  { n: "1", title: "Snippet loads", detail: "Synchronously in <head>, before paint" },
  { n: "2", title: "Anti-flicker", detail: "Targeted elements are hidden briefly" },
  { n: "3", title: "Evaluate", detail: "Audiences + experiments assessed in-browser" },
  { n: "4", title: "Apply", detail: "The variation's DOM changes are written" },
  { n: "5", title: "Reveal", detail: "Hidden elements un-hide — final experience" },
];

export type WxEdge = {
  id: string;
  label: string;
  filename: string;
  code: string;
};

export const WX_EDGE: WxEdge[] = [
  {
    id: "cloudflare",
    label: "Cloudflare",
    filename: "worker.js",
    code: `// Cloudflare Worker — decide + render the variation at the edge (no snippet)
import optimizely from '@optimizely/optimizely-sdk';

export default {
  async fetch(request, env) {
    const client = optimizely.createInstance({ sdkKey: env.OPTIMIZELY_SDK_KEY });
    await client.onReady();

    // Stable visitor id from a cookie (set one if missing)
    const vid = getVisitorId(request);
    const decision = client.createUserContext(vid).decide('${FLAG}');

    // Rewrite the origin HTML in-flight — the variation ships in the markup,
    // so the browser never sees a flash of the original.
    return new HTMLRewriter()
      .on('h1[data-hero-headline]', {
        element: (el) => el.setInnerContent(decision.variables.headline),
      })
      .on('section[data-hero]', {
        element: (el) =>
          el.setAttribute('style', 'background:' + decision.variables.bg_color),
      })
      .transform(await fetch(request));
  },
};`,
  },
  {
    id: "akamai",
    label: "Akamai",
    filename: "main.js",
    code: `// Akamai EdgeWorker — responseProvider rewrites the HTML at the edge
import { httpRequest } from 'http-request';
import { createResponse } from 'create-response';
import { decide } from './optimizely-edge.js';

export async function responseProvider(request) {
  const vid = readVid(request.getHeader('Cookie')) || newVid();
  const decision = decide(vid, '${FLAG}');

  const origin = await httpRequest('/');
  const html = (await origin.text())
    .replace('{{hero_headline}}', decision.variables.headline)
    .replace('{{hero_bg}}', decision.variables.bg_color);

  return createResponse(200, { 'Content-Type': ['text/html'] }, html);
}`,
  },
  {
    id: "vercel",
    label: "Vercel",
    filename: "middleware.ts",
    code: `// Vercel Edge Middleware — decide at the edge, before the page renders
import { createInstance } from '@optimizely/optimizely-sdk';
import { NextResponse } from 'next/server';

export const config = { matcher: '/' };

export default async function middleware(req) {
  const optimizely = createInstance({ sdkKey: process.env.OPTIMIZELY_SDK_KEY });
  await optimizely.onReady();

  const vid = req.cookies.get('vid')?.value || crypto.randomUUID();
  const decision = optimizely.createUserContext(vid).decide('${FLAG}');

  // Hand the decision to the render layer via a header / rewrite —
  // resolved before the browser ever paints.
  const res = NextResponse.next();
  res.headers.set('x-hero-variation', decision.variationKey);
  return res;
}`,
  },
];

export const WX_EDGE_BULLETS = [
  "Decisions run at the CDN edge — Cloudflare Workers, Akamai EdgeWorkers, or Vercel Edge — before the HTML reaches the browser.",
  "The variation ships inside the server-rendered markup, so there's zero flicker (no FOOC) and no render-blocking snippet.",
  "Fully server-rendered → SEO- and bot-friendly, and it works under a strict Content-Security-Policy.",
  "Same experiments, audiences, and results as the snippet path — you just move the decision upstream.",
  "Cloudflare is Optimizely's officially-supported Edge Delivery runtime; the same pattern also runs on Akamai or Vercel.",
];

export const WX_COMPARE: { dim: string; snippet: string; edge: string }[] = [
  {
    dim: "Where decisions run",
    snippet: "In the browser, after the snippet loads",
    edge: "At the CDN edge, before HTML reaches the browser",
  },
  {
    dim: "Flicker (FOOC)",
    snippet: "Possible — mitigated by the anti-flicker hide",
    edge: "None — the variation is already in the HTML",
  },
  {
    dim: "Page speed",
    snippet: "Snippet is render-blocking (anti-flicker)",
    edge: "No client blocking; variation is server-rendered",
  },
  {
    dim: "SEO / bots",
    snippet: "Changes applied via client JavaScript",
    edge: "Fully server-rendered markup",
  },
  {
    dim: "Setup",
    snippet: "Paste one snippet, author in the Visual Editor",
    edge: "Deploy an edge worker — more engineering",
  },
  {
    dim: "Best for",
    snippet: "Marketers iterating fast on content",
    edge: "Performance- & SEO-critical, flicker-sensitive pages",
  },
];

export const WX_AUDIENCE_BULLETS = [
  "Target by URL & query params, cookies, geo & device, or day/time — all no-code.",
  "Custom-JavaScript conditions for anything on the page or in your data layer.",
  "Real-time behavioral segments from Optimizely Data Platform (ODP).",
  "Audiences are shared with Feature Experimentation — define once, use everywhere.",
];

export const WX_AUDIENCE_CODE = `// Custom-JavaScript audience condition
// Returns true when the visitor qualifies for the experiment.
return window.dataLayer?.some(
  (e) => e.event === 'add_to_cart' && e.cart_value > 100
);`;

// Grouped links out to the Optimizely Web Experimentation docs.
// URLs verified to resolve (dev docs + support KB).
export const WX_DOC_GROUPS: {
  group: string;
  links: { label: string; href: string; sub: string }[];
}[] = [
  {
    group: "Get started",
    links: [
      {
        label: "Get started (JavaScript API)",
        href: "https://docs.developers.optimizely.com/web-experimentation/docs/getting-started",
        sub: "Web Experimentation overview",
      },
      {
        label: "Install the snippet",
        href: "https://support.optimizely.com/hc/en-us/articles/4410284311565-Optimizely-Web-Experimentation-JavaScript-snippet",
        sub: "Add it to your <head>",
      },
      {
        label: "Fix flashing / flicker (FOOC)",
        href: "https://support.optimizely.com/hc/en-us/articles/4410289626381-Fix-flashing-or-flickering-variation-content",
        sub: "Anti-flicker snippet",
      },
    ],
  },
  {
    group: "Author & target",
    links: [
      {
        label: "New Visual Editor",
        href: "https://support.optimizely.com/hc/en-us/articles/37424389168013-New-Visual-Editor",
        sub: "Point-and-click changes",
      },
      {
        label: "Custom code",
        href: "https://support.optimizely.com/hc/en-us/articles/4410283401997-Custom-code",
        sub: "Variation code editor",
      },
      {
        label: "Custom-JS audiences",
        href: "https://docs.developers.optimizely.com/web-experimentation/docs/custom-audience-targeting",
        sub: "Targeting conditions",
      },
      {
        label: "Real-time segments (ODP)",
        href: "https://docs.developers.optimizely.com/platform-optimizely/docs/configure-real-time-segments-for-web-experimentation",
        sub: "Behavioral audiences",
      },
    ],
  },
  {
    group: "Edge delivery & results",
    links: [
      {
        label: "Edge Delivery — install",
        href: "https://docs.developers.optimizely.com/web-experimentation/docs/installation-instructions",
        sub: "Snippetless on Cloudflare",
      },
      {
        label: "edge-delivery on GitHub",
        href: "https://github.com/optimizely/edge-delivery",
        sub: "Official Worker starters",
      },
      {
        label: "Experiment Results page",
        href: "https://support.optimizely.com/hc/en-us/articles/4410284017421-Optimizely-Experiment-Results-page",
        sub: "Reading your results",
      },
      {
        label: "Stats Engine",
        href: "https://support.optimizely.com/hc/en-us/articles/4410284008461-Calculate-the-statistical-likelihoods-of-variations-using-Stats-Engine",
        sub: "How results are scored",
      },
    ],
  },
];
