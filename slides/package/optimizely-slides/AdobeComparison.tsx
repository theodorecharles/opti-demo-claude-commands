// Adobe Target → Optimizely: Concept Translation Map.
// A faithful port of the Change Management Toolkit reference document — five
// sections mapping each Adobe Target concept to its Optimizely equivalent, with
// mapping-type tags (Direct / Process change / Gap), gap + Opal callouts, and
// "Only in Optimizely" blocks. Static server component; content is data-driven.

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { OptimizelyLogo } from "./OptimizelyLogo";
import { PrintButton } from "./PrintButton";
import { slidesConfig } from "./slides.config";

// Adobe's brand accent — kept a muted brick red so the "other platform" reads
// as distinct against Optimizely's fir/lime palette.
const ADOBE = "#b3402f";

type MapType = "direct" | "process" | "gap";

const TAG: Record<MapType, { label: string; tip: string; cls: string }> = {
  direct: {
    label: "Direct",
    tip: "Same concept, new name in Optimizely",
    cls: "bg-opti-lime text-opti-fir",
  },
  process: {
    label: "Process change",
    tip: "Concept exists, but the workflow is different",
    cls: "bg-amber-100 text-amber-800",
  },
  gap: {
    label: "Gap",
    tip: "Handled differently; see Opal callout",
    cls: "bg-rose-100 text-rose-800",
  },
};

type Callout =
  | { kind: "gap"; body: string }
  | { kind: "opal"; label: string; body: string };

type Row = {
  adobe: { term: string; type: MapType; desc: string };
  opti: { term: string; desc: string; callouts?: Callout[] };
};

type Section = {
  id: string;
  num: string;
  title: string;
  desc: string;
  icon: string;
  payoff: { headline: string; body: string };
  notes?: string[];
  rows: Row[];
  netnew: { name: string; desc: string }[];
};

// Render **bold** spans within a plain-text string.
function rich(
  text: string,
  strongCls = "font-semibold text-[#1F2937]",
): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className={strongCls}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const SECTIONS: Section[] = [
  {
    id: "core",
    num: "01",
    title: "Core testing concepts",
    desc: "Experiment types, structure, and setup",
    icon: "bg-[#EFF6FF] text-[#1D4ED8]",
    payoff: {
      headline: "Faster experiments, fewer developer dependencies.",
      body: "Once teams are fluent in Optimizely's model, the combination of a modular setup flow, Opal-generated variations, the Experiment Review Agent, and one-click winner deployment means the time from hypothesis to live experiment shrinks significantly — and the path from winning result to shipped change no longer requires a developer ticket. **Testing velocity increases. Developer contention decreases.** Teams who were bottlenecked by Adobe's three-step workflow and mbox architecture typically find they can run more experiments with the same headcount.",
    },
    notes: [
      "**A note on Optimizely's product scope:** Adobe Target is a single product. Optimizely's experimentation platform spans two complementary products that together cover what Target does — and more. **Web Experimentation** handles client-side testing via a JavaScript snippet: A/B tests, personalization campaigns, and Visual Editor changes. **Feature Experimentation** handles server-side and full-stack testing via open-source SDKs in 14 languages — enabling engineers to run experiments in APIs, mobile apps, backend services, and anywhere with a network connection. The two products share audiences, metrics, and data. Where this map references Feature Experimentation, it is describing Optimizely's answer to use cases that Target addresses with a limited server-side SDK — without a dedicated platform, without a local datafile, and with a network call to Adobe's edge required for every decision.",
    ],
    rows: [
      {
        adobe: {
          term: "Activity",
          type: "direct",
          desc: "The top-level container for a test or personalization rule. Includes A/B Test, Auto-Allocate, Auto-Target, XT, MVT, AP, and Recommendations as distinct activity types.",
        },
        opti: {
          term: "Experiment",
          desc: "The equivalent top-level container. A/B, multivariate, redirect, and personalization are all experiment types within Optimizely Web Experimentation. Feature flags are the equivalent in Feature Experimentation.",
        },
      },
      {
        adobe: {
          term: "Experience",
          type: "direct",
          desc: 'A version of the page or content shown to a visitor. Control is "Experience A" by default. Each activity can have multiple experiences.',
        },
        opti: {
          term: "Variation",
          desc: 'Same concept — the original is "Original," challengers are Variation #1, #2, etc. The Opal AI Variation Development Agent can generate and apply variation code directly from a text description, inside the Visual Editor.',
          callouts: [
            {
              kind: "opal",
              label: "Opal advantage",
              body: "Describe the change you want in plain language — \"make the hero button larger and change copy to 'Start free trial'\" — and the AI Variation Development Agent builds and applies it, maintaining brand consistency automatically.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Offer / Offer Library",
          type: "process",
          desc: "Reusable content units (HTML, JSON, redirect, remote) stored centrally in the Offer Library and attached to experiences. Offers are built independently of activities, allowing the same content to be reused across multiple campaigns without duplication.",
        },
        opti: {
          term: "Experience Templates + Visual Editor + Feature variables",
          desc: "The mapping depends on offer type. **Reusable HTML components** — carousels, modals, notification bars, lightboxes — map directly to Optimizely Experience Templates. Developers build a template once with HTML, CSS, and JavaScript; non-technical users insert and configure it inside the Visual Editor across any experiment or campaign, with no code required. Templates are only compiled into the snippet when actively used in a variation, keeping payload lean. **Simple text, image, and layout changes** are made directly in the Visual Editor — no library step needed. **JSON and remote offers** used for server-side configuration map to Feature Experimentation's feature variables. **Redirect offers** are handled as redirect experiments.",
          callouts: [
            {
              kind: "gap",
              body: "**Migration exercise required:** The Offer Library has no single equivalent — its contents need to be triaged by type during migration. Reusable HTML components become Templates (developer build required). Simple content changes move to the Visual Editor. JSON/config offers move to Feature Experimentation variables. Redirect offers become redirect experiments. Budget this triage as a discovery task in the partner SOW.",
            },
            {
              kind: "opal",
              label: "Opal advantage",
              body: "The AI Variation Development Agent can generate Template-compatible HTML, CSS, and JavaScript from a plain-language description — accelerating the rebuild of complex offer components into Optimizely Templates. Use Opal to prioritize which offers are worth templating versus which are simpler to recreate directly in the Visual Editor.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Auto-Allocate",
          type: "direct",
          desc: "Automatically shifts traffic toward the winning variation as the test runs, using a multi-armed bandit approach. Reduces opportunity cost during an experiment.",
        },
        opti: {
          term: "Stats Accelerator / Multi-armed bandit (MAB)",
          desc: "Optimizely's Stats Accelerator and MAB feature provide equivalent traffic-shifting behavior. MABs continuously reallocate traffic to top performers. The key difference: Optimizely's Stats Engine provides clearer confidence intervals and explicit false discovery rate control.",
        },
      },
      {
        adobe: {
          term: "Multivariate Test (MVT)",
          type: "process",
          desc: "Tests combinations of offers across multiple page elements simultaneously. Available in Target Standard. Uses full-factorial or partial-factorial designs.",
        },
        opti: {
          term: "Multivariate experiment",
          desc: "Available in Optimizely but requires a plan above Web Experimentation Standard. Confirm plan tier during migration scoping. The setup process is similar but the statistical reporting uses Optimizely's Stats Engine, which reports differently from Target's MVT reporting.",
          callouts: [
            {
              kind: "gap",
              body: "**Plan check required:** MVT availability depends on your Optimizely subscription tier. Validate during contract and migration scoping to avoid surprises post-cutover.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Three-step guided workflow",
          type: "process",
          desc: "Target's fixed setup flow: (1) Experiences, (2) Targeting, (3) Goals & Settings. Every activity type follows this structure.",
        },
        opti: {
          term: "Experiment configuration (non-linear)",
          desc: "Optimizely's experiment setup is more modular — pages, variations, audiences, metrics, and traffic allocation are configured in separate sections without a fixed step order. This feels less guided initially but allows faster iteration once learned.",
          callouts: [
            {
              kind: "opal",
              label: "Opal bridges it",
              body: "The Experiment Review Agent performs a pre-launch check on your configuration and flags missing components — effectively replacing the guardrails that the three-step wizard provided.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Activity Priority",
          type: "direct",
          desc: "Numeric priority (0–999 or Low/Med/High) determining which activity wins when multiple activities target the same location and audience.",
        },
        opti: {
          term: "Exclusion groups / Experiment priority",
          desc: "Optimizely uses Exclusion Groups to prevent the same visitor from being in multiple conflicting experiments — a more explicit and auditable approach than Adobe's priority number system. Traffic allocation handles percentage-based isolation.",
        },
      },
    ],
    netnew: [
      {
        name: "Experiment Review Agent",
        desc: "Before a test goes live, Opal audits the full experiment configuration — targeting, metrics, traffic allocation, variation setup — and flags statistical or structural problems. **Adobe has no pre-launch AI review capability.** Teams that previously caught configuration errors in production now catch them before a single visitor is bucketed.",
      },
      {
        name: "One-click winner deployment",
        desc: "When an experiment concludes, Optimizely can deploy the winning variation directly — no developer required, no separate deployment ticket. **In Adobe Target, shipping a winner always requires an engineering handoff.** This closes the gap between experiment result and production change.",
      },
      {
        name: "Experience Templates with snippet efficiency",
        desc: "Templates are only compiled into the snippet when actively used in a live variation — unused templates carry zero payload cost. **Adobe has no equivalent component library with this kind of runtime efficiency.** Programs can maintain a rich template library without penalising page load time.",
      },
      {
        name: "Unified web + feature experimentation",
        desc: "Marketing and engineering teams share a single experimentation model — the same audiences, metrics, and data layer power both Visual Editor tests and server-side SDK experiments. **Adobe Target has no feature flagging or server-side SDK product.** Teams using Target for web and a separate tool for product experiments can consolidate onto one platform.",
      },
    ],
  },

  {
    id: "personalization",
    num: "02",
    title: "Personalization & targeting",
    desc: "Audiences, rules, and automated personalization",
    icon: "bg-[#FDF4FF] text-[#7E22CE]",
    payoff: {
      headline:
        "Self-service personalization — with a model you can actually explain.",
      body: "Adobe Sensei's personalization decisions are a black box: it optimizes, but nobody on the team can say why a visitor saw a particular experience. Optimizely's contextual bandits surface the attributes that drove each decision — making personalization logic auditable, debuggable, and improvable by the team who runs it. **Marketers and CX teams build and iterate personalization campaigns without routing through data science.** Product recommendations run natively with full merchandising override capability, so business teams retain control over what the algorithm surfaces.",
    },
    rows: [
      {
        adobe: {
          term: "Audience",
          type: "direct",
          desc: "Reusable groups of visitors defined by attributes (device, geo, behavior, profile). Can be shared across Adobe Experience Cloud solutions via Audience Manager.",
        },
        opti: {
          term: "Audience",
          desc: "Same concept and term. Optimizely audiences are defined using attributes and conditions. Audiences created in ODP (Optimizely Data Platform) are available for targeting across Web Experimentation, Feature Experimentation, and Personalization.",
        },
      },
      {
        adobe: {
          term: "Profile attributes / mbox parameters",
          type: "process",
          desc: "Visitor-level data passed into Target via JavaScript (profile.X) or mbox calls. Stored in visitor profiles for segmentation and personalization. Limit of 50 attributes per mbox call.",
        },
        opti: {
          term: "Attributes (Web) / User attributes (Feature)",
          desc: "Custom attributes are passed via the Optimizely snippet (Web) or SDK (Feature Experimentation). No equivalent hard limit. In ODP, attributes are enriched as customer profile properties and can feed both experimentation and personalization targeting.",
          callouts: [
            {
              kind: "gap",
              body: "**Implementation effort:** Existing mbox parameter names do not transfer. Attribute passing logic must be re-implemented using the Optimizely snippet or SDK. This is a billable workstream in the partner SOW.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Experience Targeting (XT)",
          type: "direct",
          desc: 'Rule-based delivery of specific content to specific audiences without a statistical test. The "if audience = X, show experience Y" pattern. Used for segmented content delivery and geo-targeting.',
        },
        opti: {
          term: "Personalization campaign",
          desc: "Optimizely Personalization campaigns are the direct equivalent — audience-targeted content delivery without a statistical test. Works across Web Experimentation and Personalization products. The Opal AI Variation Development Agent works inside personalization campaigns just as it does for experiments.",
        },
      },
      {
        adobe: {
          term: "Auto-Target / Automated Personalization (AP)",
          type: "process",
          desc: "Adobe Sensei-powered ML automatically selects the best experience per visitor based on real-time behavioral profile. AP tests offer combinations; Auto-Target serves the best complete experience. Deeply integrated with Adobe Analytics and RTCDP.",
        },
        opti: {
          term: "Contextual bandits (GA) + MAB",
          desc: "Contextual bandits are now generally available in Optimizely Personalization campaigns. Unlike MABs which find one best variation for all users, contextual bandits serve each visitor the best variation based on their specific attributes (device, location, behavioral history, etc.) — the direct equivalent of Auto-Target's per-visitor personalization. The key difference from Sensei: Optimizely's model shows you which attributes drove decisions, making the personalization logic transparent and auditable rather than a black box.",
          callouts: [
            {
              kind: "gap",
              body: "**Setup note:** Contextual bandits require user attributes to be explicitly defined and populated — the model is only as good as the attribute data fed to it. Teams should inventory their available user attributes during migration scoping. Contextual Multi-Armed Bandits (CMAB) for Feature Experimentation are currently in beta.",
            },
            {
              kind: "opal",
              label: "Opal advantage",
              body: "Opal can help design contextual bandit attribute strategies from natural language descriptions of your audience segments. The results page surfaces the top weighted attributes that drove variation decisions — giving you the explainability that Adobe Sensei never provided.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Recommendations (Target Premium)",
          type: "process",
          desc: "Algorithm-driven product/content recommendations (People who bought X also bought Y). Requires catalog feed, entity definitions, and Target Premium license. Deeply integrated with AP activities and Adobe catalog management.",
        },
        opti: {
          term: "Optimizely Product Recommendations",
          desc: "Optimizely has a native Product Recommendations capability with ML algorithm stacks, real-time behavioral personalization, and a full merchandising layer. Algorithms are applied in a configurable stack formation — if the first algorithm can't return enough results, the next in the stack is used. Merchandising campaigns let teams add override rules on top of algorithmic output: hand-pick rules force specific products regardless of the algorithm, and master rules scope campaigns to specific pages, categories, or visitor segments.",
          callouts: [
            {
              kind: "gap",
              body: "**Implementation differs:** Unlike Target Recommendations which is configured inside the Target UI, Optimizely's recommendations require developer setup of the tracking service, catalog feed export, and recommendation widgets before merchandisers can work in the portal. Budget this as a technical workstream in the partner SOW — the merchant-facing experience is comparable once set up, but the initial implementation is distinct.",
            },
            {
              kind: "opal",
              label: "Opal advantage",
              body: "Merchandising rules and recommendation strategies can be interrogated and iterated via Opal. The Competitive Insights agent can inform which product categories or algorithm strategies to prioritize during initial setup.",
            },
          ],
        },
      },
    ],
    netnew: [
      {
        name: "Attribute transparency in ML decisions",
        desc: "Optimizely's contextual bandit results surface the top-weighted attributes that drove each variation decision — showing precisely which user characteristics the model relied on. **Adobe Sensei's Auto-Target and AP are black boxes: they optimize, but the team never sees why.** Explainability matters for regulated industries, brand governance, and teams who need to justify personalization decisions to stakeholders.",
      },
      {
        name: "Merchandising overrides on algorithmic recommendations",
        desc: "Optimizely Product Recommendations gives merchandising teams direct, real-time control over what the algorithm surfaces — hand-pick rules force specific products regardless of the algorithm, master rules scope campaigns to specific pages or visitor segments. **Adobe Recommendations offers less granular merchandiser control over algorithm output at the campaign level.**",
      },
    ],
  },

  {
    id: "analytics",
    num: "03",
    title: "Analytics & reporting",
    desc: "The highest-friction transition area for most teams",
    icon: "bg-[#F0FDF4] text-[#15803D]",
    payoff: {
      headline:
        "Experiment results that anyone on the team can read — without an analyst in the room.",
      body: "The most significant operational shift in this section is who owns results interpretation. In Adobe's model, experiment data lives in Analytics for Target (A4T) — which means a custom AA report, an analytics team resource, and a time delay stand between a completed experiment and a business decision. In Optimizely, sequential stats mean results are always valid and readable in real time. Bayesian outputs give stakeholders a probability they intuitively understand. Opal summarizes results in plain language. **Analytics teams move from being interpreters of every experiment to owners of the overall program strategy.** The day-to-day decision cycle accelerates because results are self-serve.",
    },
    rows: [
      {
        adobe: {
          term: "Analytics for Target (A4T)",
          type: "process",
          desc: "The integration that routes Target experiment data into Adobe Analytics for reporting. In practice, A4T means experiment results are only fully accessible inside AA — requiring an analyst to build and maintain custom reports before a testing team can read their own results. Target's native results page is intentionally limited, making AA the de facto reporting dependency for any meaningful analysis. Data access is gated by analytics team availability.",
        },
        opti: {
          term: "Native results page + Warehouse-Native Analytics",
          desc: "Optimizely's native results page is the primary reporting surface — not a fallback. Real-time sequential stats mean results are always valid and readable the moment data starts flowing, with no analyst required to interpret them. Testing teams own their results directly. For downstream analysis, Warehouse-Native Experimentation Analytics sends experiment data directly into Snowflake, BigQuery, Redshift, or Databricks, where data teams work in their existing tools and workflows — rather than requiring everyone to operate inside Adobe Analytics. The outcome is a two-tier model: **testing teams get immediate, self-serve access to results**; **data teams get experiment data natively in the warehouse**, eliminating the AA intermediary entirely.",
          callouts: [
            {
              kind: "gap",
              body: "**Transition planning required:** Teams will need to learn Optimizely's results page and build trust in Stats Engine before decommissioning their A4T setup. Run both surfaces in parallel during the transition period. Analytics leaders who built custom AA dashboards around Target data should be engaged early — this is a workflow change for them, not just a tool change.",
            },
            {
              kind: "opal",
              label: "Opal accelerates the transition",
              body: 'The AI Exploration Generator lets anyone on the testing team ask natural-language questions of experiment data — "which variation performed best for mobile users in EMEA?" — without routing through an analyst or building a custom report. The AI Exploration Summary generates plain-language result narratives automatically. Together, these reduce the analyst dependency that made A4T feel essential in the first place.',
            },
          ],
        },
      },
      {
        adobe: {
          term: "Success metric",
          type: "direct",
          desc: "The KPI tracked to determine a winning experience. Configured at the activity level. Supports conversion, revenue, engagement, and custom metrics tied to mbox calls or A4T events.",
        },
        opti: {
          term: "Metric",
          desc: "Same concept. Metrics in Optimizely are built from Events (click, pageview, custom). Each experiment requires at least one primary metric and can have multiple secondary metrics. Ratio metrics (e.g. revenue per visitor) are now supported. Metric direction (increase vs. decrease = win) must be set explicitly.",
          callouts: [
            {
              kind: "gap",
              body: "**Metric re-mapping required:** Metrics tied to mbox calls in Target must be rebuilt using Optimizely events. This is a systematic mapping exercise, not a one-time click — budget time in the partner SOW.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Reporting audience",
          type: "direct",
          desc: 'Post-hoc audience segment applied to results to analyze performance within subgroups (e.g. "how did mobile users perform?"). Does not affect traffic allocation.',
        },
        opti: {
          term: "Results segmentation",
          desc: "Optimizely results pages support filtering by audience attributes after the experiment runs — equivalent to Adobe's reporting audiences. Warehouse-Native Analytics allows even more flexible post-hoc segmentation directly in your data warehouse.",
        },
      },
      {
        adobe: {
          term: "Fixed-horizon significance (frequentist)",
          type: "direct",
          desc: 'Target\'s A/B testing uses traditional frequentist statistics with a fixed sample size plan. Teams are cautioned not to "peek" at results before the planned sample size is reached. This is the method most enterprise analytics and compliance teams are familiar with.',
        },
        opti: {
          term: "Sequential, Fixed Horizon, Bayesian — plus CUPED",
          desc: 'Optimizely now offers three statistical methodologies, selectable per experiment. **Sequential (Stats Engine)** — Optimizely\'s default; always-valid, peek-anytime testing with false discovery rate control. **Fixed Horizon** — the traditional frequentist approach teams know from Adobe; predetermined sample size, results reviewed once. Ideal for regulated environments and compliance-sensitive programs. **Bayesian** — expresses results as probability that a variation is better ("90% chance Variation A beats control"), which many business stakeholders find more intuitive than p-values. Fixed Horizon and Bayesian are currently in beta — contact your CSM to enable. **CUPED** (Controlled-experiment Using Pre-Experiment Data) is also available — a variance reduction technique that makes experiments reach significance faster by controlling for pre-experiment noise.',
          callouts: [
            {
              kind: "opal",
              label: "Opal bridges the mindset gap",
              body: "Teams moving from Adobe's fixed-horizon model can start with Fixed Horizon enabled to maintain familiar reporting patterns, then migrate to Sequential or Bayesian as confidence grows. Use Opal's Experiment Result Summary to generate plain-language interpretations across all three method outputs for stakeholders who are accustomed to reading Adobe's reporting style.",
            },
          ],
        },
      },
    ],
    netnew: [
      {
        name: "Program-level holdouts",
        desc: "A configurable percentage of traffic can be excluded from all experiments simultaneously, creating a clean control group that measures the cumulative lift of the entire experimentation program — not just individual tests. **Adobe Target has no native holdout capability.** This is particularly compelling for enterprise stakeholders who need to demonstrate program-level ROI to a CFO or board, not just report individual experiment wins.",
      },
      {
        name: "Three statistical methods plus CUPED — selectable per experiment",
        desc: "Sequential, Fixed Horizon, and Bayesian are all available and switchable per experiment, along with CUPED for variance reduction. **Adobe Target offers one statistical model with no ability to choose.** Teams in regulated industries can use Fixed Horizon for compliance-sensitive tests while using Sequential for everything else — all within the same platform.",
      },
      {
        name: "Opal result summarization",
        desc: "Experiment results can be summarized in plain language by Opal — automatically generating a narrative that stakeholders can read without statistical training. **Adobe has no equivalent AI results layer.** The analyst bottleneck that A4T created is removed not just by a better reporting surface, but by an AI layer that does the interpretation work.",
      },
    ],
  },

  {
    id: "technical",
    num: "04",
    title: "Technical implementation",
    desc: "For IT, engineering, and QA teams",
    icon: "bg-[#FFF7ED] text-[#C2410C]",
    payoff: {
      headline:
        "A simpler stack, a faster page, and an implementation model that fits how your teams actually work.",
      body: "Adobe Target's at.js + global mbox + Launch dependency chain is one of the most common sources of page load latency and QA fragility in enterprise implementations. Removing it eliminates a category of performance debt your teams already know they have. Optimizely's snippet is deployed directly in the <head> — no tag manager required, no third-party dependency in the critical path. Custom Snippets and Projects let enterprise teams right-size their implementation: distributed teams get projects scoped to the areas of the site they own, and each project carries only the experiment configuration relevant to that section. **The result is leaner payloads, faster load times, and governance that maps to how your organization is actually structured** — not to a one-size-fits-all monolithic snippet.",
    },
    rows: [
      {
        adobe: {
          term: "at.js / mbox",
          type: "process",
          desc: "The Target JavaScript library (at.js 2.x) and the mbox mechanism used to request and deliver personalized content. mbox calls are the fundamental unit of content delivery and tracking. The global mbox fires on every page load, carrying the full weight of all active activities regardless of page type.",
        },
        opti: {
          term: "Optimizely snippet — direct <head> placement (Web) / SDK (Feature)",
          desc: "The preferred and recommended implementation for Web Experimentation is a direct JavaScript snippet placed in the page <head> — no tag manager required. Direct placement eliminates the additional latency, asynchronous loading risks, and governance complexity that tag manager deployments introduce. Changes are applied via CSS selectors in the Visual Editor or custom JS. Feature Experimentation uses server-side or client-side SDKs (14 languages supported).",
          callouts: [
            {
              kind: "gap",
              body: "**Implementation shift:** at.js must be removed and the Optimizely snippet added directly to the page template. Any custom mbox call logic must be re-evaluated — most won't have a direct equivalent and will need to be re-implemented as custom events. This is a clean break, not an incremental change.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Single global at.js (no equivalent)",
          type: "process",
          desc: "Adobe Target uses a single at.js library across the entire site. All activities — homepage, search, checkout, personalization — are served from the same global implementation. There is no native mechanism to serve a leaner payload to specific sections or to isolate team-level experiment ownership at the implementation layer.",
        },
        opti: {
          term: "Custom Snippets + Projects",
          desc: "Optimizely offers two complementary tools for right-sizing implementation at enterprise scale. **Custom Snippets** allow a single project to serve section-specific JS files — a global snippet loads on every page, while leaner section snippets (homepage, search, checkout, etc.) load only where relevant. Each visitor downloads only the experiment configuration for the page they are on. **Projects** allow separate teams — regional markets, product lines, or functional groups — to operate fully independent Optimizely environments with their own experiments, audiences, snippets, and permissions. The right architecture depends on the customer: a single global brand like Levi's might use one project with custom snippets scoped per site section; a multi-market enterprise like a global retailer might use separate projects per region. Both models can be combined.",
          callouts: [
            {
              kind: "opal",
              label: "Performance advantage",
              body: "A monolithic snippet that grows with your experimentation program is a performance liability. Custom Snippets keep payloads lean regardless of program scale — a checkout snippet contains only checkout experiments, so a visitor landing directly in checkout never downloads homepage hero test configuration. Once cached, a snippet costs zero network overhead for the remainder of the session.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Visual Experience Composer (VEC)",
          type: "direct",
          desc: "WYSIWYG editor for creating and modifying experiences without code. Requires a browser extension. Known for reliability issues with SPAs and CSP-protected sites. Performance impact from page pre-hiding snippet.",
        },
        opti: {
          term: "Visual Editor (overlay-based)",
          desc: "Optimizely's Visual Editor was updated in 2025 to use a direct overlay approach instead of an iframe — eliminating most of the page-loading and CSP issues that plagued Adobe's VEC. No browser extension required for standard use. Works directly on the live site surface.",
          callouts: [
            {
              kind: "opal",
              label: "Opal advantage",
              body: "The AI Variation Development Agent operates inside the Visual Editor — describe a change in the Element Change window and Opal generates and applies it. This removes the need for developer involvement on routine visual changes.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Form-based Experience Composer",
          type: "process",
          desc: "Non-visual interface for creating experiences tied to specific mbox locations. Used for email, non-web environments, and cases where VEC is impractical.",
        },
        opti: {
          term: "Custom code editor / Feature Experimentation SDK",
          desc: "Non-visual changes in Optimizely Web are handled via the custom code editor within experiments. Server-side and non-browser environments use Feature Experimentation SDKs. The use cases are the same; the tooling is different and generally cleaner.",
        },
      },
      {
        adobe: {
          term: "QA mode / Activity preview URL",
          type: "direct",
          desc: "Generate a URL that forces a specific experience to render for QA purposes without affecting live traffic. Accessible via the Activity QA link.",
        },
        opti: {
          term: "Preview URL / Allowlisting",
          desc: "Optimizely's Preview tool generates shareable URLs for each variation. Allowlisting lets specific user IDs or email addresses be forced into a variation for internal testing. Equivalent functionality, slightly different workflow.",
          callouts: [
            {
              kind: "opal",
              label: "Opal bridges it",
              body: "The Experiment Review Agent performs a full pre-launch configuration check, flagging missing metrics, audience issues, or variation problems before the experiment goes live — adding a QA layer beyond what preview URLs cover.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Adobe Launch / Experience Platform tags",
          type: "process",
          desc: "Adobe's tag management system, required for deploying at.js, managing mbox rules, and coordinating the A4T integration. Most enterprise Target implementations are deployed and governed through Launch — making Launch a hard dependency for experimentation, not just a delivery vehicle.",
        },
        opti: {
          term: "Direct <head> placement (preferred) — tag manager optional",
          desc: "Optimizely has no dependency on any tag management system. The recommended approach is direct snippet placement in the page template — this gives engineering teams full control over load order, caching headers, and performance characteristics without a TMS intermediary. Tag managers (GTM, Tealium, Launch) can be used if an existing governance requirement demands it, but they introduce asynchronous loading risk and additional latency that direct placement avoids entirely. The goal is to remove Adobe Launch as a dependency, not to replace it with a different TMS dependency.",
          callouts: [
            {
              kind: "gap",
              body: "**Governance transition:** If Launch currently manages audience data collection, event tracking, or personalization rules that feed Target, each of these must be inventoried during migration. Rules that are Optimizely-specific should be decommissioned from Launch; rules serving other tools can remain. This is among the highest-effort items in the partner SOW — do not assume a one-to-one port of Launch rules.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Adobe Target server-side SDK",
          type: "process",
          desc: "Adobe Target offers Node.js, Java, Python, and other SDKs for server-side delivery. Decisions can be made via on-device decisioning (using a locally cached rule artifact) or via a network call to Adobe's edge. The on-device artifact must be periodically fetched and refreshed from Adobe's servers — there is no persistent local datafile model. Server-side and client-side experimentation are managed as separate activities within the same Target interface, but share no unified SDK model with web testing.",
        },
        opti: {
          term: "Feature Experimentation (dedicated full-stack platform)",
          desc: "Feature Experimentation is Optimizely's dedicated server-side and full-stack experimentation platform — not a bolted-on SDK. It supports 14 languages and frameworks, runs experiments in APIs, mobile apps, backend services, and any networked environment. Crucially, all experiment decisions are evaluated locally against a JSON datafile that the SDK downloads and caches — **zero network calls per decision, microsecond latency**. The same audiences, metrics, and experiment model used in Web Experimentation apply in Feature Experimentation, giving engineering and marketing teams a unified experimentation program rather than parallel, disconnected tools.",
          callouts: [
            {
              kind: "gap",
              body: "**Platform shift, not just an SDK swap:** Teams using Target's server-side SDK should not think of Feature Experimentation as a drop-in replacement SDK. It is a full platform with its own project structure, environments, datafile management, and deployment model. Budget a dedicated technical discovery and onboarding workstream in the partner SOW.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Target on-device decisioning artifact",
          type: "process",
          desc: "Target's on-device decisioning uses a locally cached JSON rule artifact that must be fetched from Adobe's CDN and periodically refreshed. Not all activity types support on-device decisioning — activities using profile scripts or remote audiences still require a network call.",
        },
        opti: {
          term: "Datafile (Feature Experimentation)",
          desc: "Feature Experimentation's datafile is the complete, language-agnostic JSON representation of all experiment configuration for a project. SDKs download and cache it locally — all decisions are evaluated in-process with no network dependency per call. Unlike Target's artifact, the datafile supports all experiment types without exception, and can be self-hosted on your own CDN for complete infrastructure independence.",
        },
      },
    ],
    netnew: [
      {
        name: "Microsecond decisioning via local datafile",
        desc: "Feature Experimentation compiles all experiment configuration into a local JSON datafile. The SDK evaluates decisions in microseconds with zero network calls per visitor — entirely client or server-side. **Adobe Target requires a network round-trip to Adobe's edge for every decision.** For high-traffic applications where experimentation latency is a hard constraint, this is an architectural advantage with no Adobe equivalent.",
      },
      {
        name: "Custom Snippets + Projects for distributed team governance",
        desc: "Enterprise teams can structure their Optimizely implementation to match their org — separate projects per region or team, custom snippets per site section, or a combination. Each configuration carries only the experiment payload relevant to that context. **Adobe Target offers no equivalent architectural flexibility for distributed enterprise governance.** A single global at.js file serves all teams regardless of relevance.",
      },
    ],
  },

  {
    id: "data",
    num: "05",
    title: "Data platform",
    desc: "ODP vs. Adobe Experience Platform / RTCDP",
    icon: "bg-[#F0F9FF] text-[#0369A1]",
    payoff: {
      headline:
        "Experiment data flows to where your team already works — not the other way around.",
      body: "Adobe's data model requires experiment results to live in Adobe Analytics — which means your analysts must work in AA, your dashboards must pull from AA, and your data governance must accommodate Adobe's architecture. Optimizely's warehouse-native analytics flips this: experiment data flows directly into Snowflake, BigQuery, Redshift, or Databricks, where your data team already operates. ODP handles experimentation-layer audience activation without displacing your enterprise CDP. **Platform lock-in decreases. Data portability increases.** Your existing BI tools, data science workflows, and reporting infrastructure can consume experiment results natively — no AA dependency required.",
    },
    rows: [
      {
        adobe: {
          term: "Visitor Profile / AEP Real-Time CDP",
          type: "process",
          desc: "Adobe maintains visitor profiles via mbox parameters. Enterprise teams often connect Target to AEP/RTCDP for unified customer profiles that power both Target personalization and broader Adobe Experience Cloud activation.",
        },
        opti: {
          term: "ODP (Optimizely Data Platform)",
          desc: "ODP is a native CDP that collects, stores, and enriches customer data for activation across Optimizely products. It feeds audience definitions into Web Experimentation, Feature Experimentation, and Personalization. It can ingest data from your existing CDP via API, event tracking, or data warehouse connectors.",
          callouts: [
            {
              kind: "gap",
              body: "**Integration scope:** Teams using AEP/RTCDP as their customer data backbone should not assume ODP is a replacement — it is an experimentation-focused CDP, not a full enterprise CDP. The integration pattern is AEP/RTCDP as source → ODP as activation layer for experimentation. Scope this carefully in discovery.",
            },
            {
              kind: "opal",
              label: "Opal advantage",
              body: 'ODP audience definitions can be queried and interrogated via Opal system tools (exp_execute_query, exp_get_schemas) — enabling practitioners to ask questions like "show me all audiences with mobile + loyalty attributes" in natural language, without SQL.',
            },
          ],
        },
      },
      {
        adobe: {
          term: "Category Affinity Targeting",
          type: "gap",
          desc: "Target Premium feature that automatically builds behavioral interest profiles based on page categories visited. Can be used for targeting and personalization without explicit customer data.",
        },
        opti: {
          term: "ODP behavioral events (custom build)",
          desc: "There is no out-of-the-box Category Affinity equivalent. Behavioral affinity targeting in Optimizely requires capturing category/product view events in ODP and building audiences based on event sequences. This is achievable but requires explicit implementation effort.",
          callouts: [
            {
              kind: "gap",
              body: "**Build required:** Teams relying on Category Affinity for personalization rules need to plan a behavioral data model in ODP during migration. Include in partner SOW as a discovery and implementation item.",
            },
          ],
        },
      },
      {
        adobe: {
          term: "Audience Manager (AAM) integration",
          type: "process",
          desc: "Enterprise Target customers often connect Audience Manager for DMP-based segment sharing between Adobe products. AAM segments are imported into Target for audience targeting.",
        },
        opti: {
          term: "ODP audience sync / third-party CDP integration",
          desc: 'ODP can ingest audience data from external CDPs and DMPs via API and event streaming. If AAM or a successor platform remains in the stack, the integration pattern shifts to "external system → ODP → Optimizely targeting." The net capability is equivalent; the wiring is different.',
        },
      },
    ],
    netnew: [
      {
        name: "Warehouse Audience Sync",
        desc: "Audiences defined in your warehouse — Snowflake, BigQuery, Redshift, or Databricks — are published directly into ODP and made available for experiment targeting and personalization campaigns across Web and Feature Experimentation. The warehouse is the authoritative source; Optimizely activates from it. **Adobe's warehouse integrations push audience data out of AEP into the warehouse — the direction of data flow is inverted.** Adobe has no native mechanism to define an audience in your warehouse and activate it directly into Target for experiment targeting. For enterprise teams whose most precise customer segments live in the warehouse — behavioral cohorts, transactional segments, ML-derived clusters — this closes a loop that Adobe's architecture leaves open.",
      },
    ],
  },
];

const NAV = [
  { href: "#core", label: "Core testing" },
  { href: "#personalization", label: "Personalization" },
  { href: "#analytics", label: "Analytics & reporting" },
  { href: "#technical", label: "Technical / IT" },
  { href: "#data", label: "Data platform" },
];

function Tag({ type }: { type: MapType }) {
  const t = TAG[type];
  return (
    <span
      title={t.tip}
      className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${t.cls}`}
    >
      {t.label}
    </span>
  );
}

function CalloutView({ c }: { c: Callout }) {
  if (c.kind === "gap") {
    return (
      <div className="mt-2.5 break-inside-avoid rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900">
        {rich(c.body, "font-semibold text-amber-950")}
      </div>
    );
  }
  return (
    <div className="mt-2 break-inside-avoid rounded-lg border border-opti-fir/15 bg-opti-lime/10 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-opti-fir/80">
      <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-opti-fir">
        <span className="h-1.5 w-1.5 rounded-full bg-opti-lime ring-1 ring-opti-fir/20" />
        {c.label}
      </div>
      {rich(c.body, "font-semibold text-opti-fir")}
    </div>
  );
}

function MapRow({ row }: { row: Row }) {
  return (
    <div className="grid break-inside-avoid grid-cols-1 border-t border-opti-fir/10 md:grid-cols-[1fr_40px_1fr]">
      {/* Adobe */}
      <div className="bg-white px-5 py-4 md:border-r md:border-opti-fir/10">
        <div
          className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] md:hidden"
          style={{ color: ADOBE }}
        >
          Adobe Target
        </div>
        <div
          className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold"
          style={{ color: ADOBE }}
        >
          <span>{row.adobe.term}</span>
          <Tag type={row.adobe.type} />
        </div>
        <div className="text-[13px] leading-relaxed text-opti-fir/60">
          {rich(row.adobe.desc)}
        </div>
      </div>
      {/* Arrow */}
      <div className="flex items-center justify-center bg-opti-cream/60 py-1 text-opti-fir/30 md:border-r md:border-opti-fir/10 md:py-0">
        <span className="rotate-90 md:rotate-0">→</span>
      </div>
      {/* Optimizely */}
      <div className="bg-opti-lime/[0.06] px-5 py-4">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-opti-fir md:hidden">
          Optimizely
        </div>
        <div className="mb-1.5 text-sm font-semibold text-opti-fir">
          {row.opti.term}
        </div>
        <div className="text-[13px] leading-relaxed text-opti-fir/60">
          {rich(row.opti.desc)}
        </div>
        {row.opti.callouts?.map((c, i) => (
          <CalloutView key={i} c={c} />
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ s }: { s: Section }) {
  return (
    <section id={s.id} className="mb-12 scroll-mt-16 pt-6">
      <div className="mb-5 flex items-center gap-3 border-b border-opti-fir/10 pb-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-opti-lime font-mono text-sm font-semibold text-opti-fir">
          {s.num}
        </div>
        <span className="text-[21px] font-semibold text-opti-fir">
          {s.title}
        </span>
        <span className="ml-auto hidden text-[13px] text-opti-fir/50 sm:block">
          {s.desc}
        </span>
      </div>

      {/* Payoff */}
      <div className="mb-5 flex break-inside-avoid flex-col gap-4 rounded-2xl bg-opti-fir p-5 sm:flex-row">
        <div className="shrink-0 pt-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-opti-lime/70">
          End state
        </div>
        <div>
          <div className="mb-1.5 text-sm font-semibold leading-snug text-opti-cream">
            {s.payoff.headline}
          </div>
          <div className="text-[13px] leading-relaxed text-opti-cream/70">
            {rich(s.payoff.body, "font-semibold text-opti-lime")}
          </div>
        </div>
      </div>

      {s.notes?.map((note, i) => (
        <div
          key={i}
          className="mb-5 rounded-2xl border border-opti-fir/15 bg-white px-5 py-4 text-[13.5px] leading-relaxed text-opti-fir/70"
        >
          {rich(note, "font-semibold text-opti-fir")}
        </div>
      ))}

      {/* Map grid */}
      <div className="overflow-hidden rounded-xl border border-opti-fir/15 bg-white">
        <div className="hidden md:grid md:grid-cols-[1fr_40px_1fr]">
          <div
            className="border-r border-opti-fir/10 bg-opti-fir/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: ADOBE }}
          >
            Adobe Target
          </div>
          <div className="flex items-center justify-center border-r border-opti-fir/10 bg-opti-cream/60 text-opti-fir/30">
            →
          </div>
          <div className="bg-opti-lime/20 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-opti-fir">
            Optimizely
          </div>
        </div>
        {s.rows.map((row, i) => (
          <MapRow key={i} row={row} />
        ))}
      </div>

      {/* Only in Optimizely */}
      {s.netnew.length > 0 && (
        <div className="mt-5 break-inside-avoid overflow-hidden rounded-2xl border border-opti-fir/20">
          <div className="flex flex-wrap items-center gap-2.5 bg-opti-fir px-5 py-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-opti-lime">
              Only in Optimizely
            </span>
            <span className="text-xs text-opti-cream/60">
              Capabilities with no Adobe Target equivalent
            </span>
          </div>
          <div className="bg-white">
            {s.netnew.map((it, i) => (
              <div
                key={i}
                className="grid break-inside-avoid grid-cols-1 gap-1 border-b border-opti-fir/10 px-5 py-3.5 last:border-b-0 sm:grid-cols-[200px_1fr] sm:gap-5"
              >
                <div className="text-[13px] font-semibold leading-snug text-opti-fir">
                  {it.name}
                </div>
                <div className="text-[13px] leading-relaxed text-opti-fir/65">
                  {rich(it.desc)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v11m0 0l-4-4m4 4l4-4M5 21h14" />
    </svg>
  );
}

export function AdobeComparison() {
  return (
    <div className="min-h-screen bg-opti-cream text-opti-fir">
      {/* Print / PDF styling: white paper, keep brand colors, tidy margins. */}
      <style>{`@page{margin:14mm}@media print{html,body{background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style>

      {/* Header */}
      <header className="bg-opti-fir px-6 py-10 text-opti-cream sm:px-10 sm:py-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <OptimizelyLogo className="h-6 w-auto" />
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-opti-lime/70 sm:inline">
                Change Management Toolkit
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2 print:hidden">
              <PrintButton className="inline-flex items-center gap-1.5 rounded-full bg-opti-lime px-4 py-1.5 text-xs font-semibold text-opti-fir transition hover:brightness-95">
                <DownloadIcon /> Download PDF
              </PrintButton>
              <Link
                href={slidesConfig.deckPath}
                className="rounded-full border border-opti-cream/25 px-4 py-1.5 text-xs text-opti-cream/85 transition hover:bg-opti-cream/10"
              >
                ← Back to deck
              </Link>
            </div>
          </div>
          <h1 className="mt-4 max-w-[640px] text-[26px] font-semibold leading-tight sm:text-[32px]">
            Adobe Target → Optimizely
            <br />
            Concept Translation Map
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] font-light text-opti-cream/70">
            A reference guide for experimentation practitioners, analytics teams,
            and IT leads transitioning from Adobe Target to Optimizely&apos;s full
            experimentation platform.
          </p>

          {/* Mapping key */}
          <table className="mt-7 w-full max-w-[640px] border-collapse text-left">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.1em] text-opti-cream/40">
                <th className="w-[130px] border-b border-opti-cream/15 pb-2 pr-4 font-medium">
                  Mapping type
                </th>
                <th className="border-b border-opti-cream/15 pb-2 pr-4 font-medium">
                  What it means
                </th>
                <th className="hidden w-[160px] border-b border-opti-cream/15 pb-2 pr-4 font-medium sm:table-cell">
                  Migration effort
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child_td]:border-b-0">
              {(
                [
                  [
                    "direct",
                    "The concept exists in both platforms and works the same way. Only the terminology changes.",
                    "Vocabulary update only",
                  ],
                  [
                    "process",
                    "The capability exists in Optimizely, but how teams access or use it differs from Adobe. Training and workflow adjustment required.",
                    "Workflow re-learning",
                  ],
                  [
                    "gap",
                    "The feature works materially differently or requires a different approach. Read the callout in each row for specifics.",
                    "Planning required",
                  ],
                ] as [MapType, string, string][]
              ).map(([type, desc, impact]) => (
                <tr key={type}>
                  <td className="border-b border-opti-cream/10 py-2.5 pr-4 align-top">
                    <Tag type={type} />
                  </td>
                  <td className="border-b border-opti-cream/10 py-2.5 pr-4 text-[13px] leading-snug text-opti-cream/70">
                    {desc}
                  </td>
                  <td className="hidden border-b border-opti-cream/10 py-2.5 pr-4 align-top font-mono text-[11px] text-opti-cream/40 sm:table-cell">
                    {impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </header>

      {/* Sticky filter nav */}
      <nav className="sticky top-0 z-30 border-b border-opti-fir/10 bg-opti-cream/95 backdrop-blur print:hidden">
        <div className="no-scrollbar mx-auto flex max-w-[1100px] items-center justify-start overflow-x-auto px-4 sm:justify-center">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap border-b-2 border-transparent px-5 py-3.5 text-sm font-semibold text-opti-fir/70 transition hover:border-opti-lime hover:text-opti-fir"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="mx-auto max-w-[1100px] px-6 py-10 pb-20 sm:px-10">
        <div className="mb-8 rounded-2xl border border-opti-fir/15 bg-white px-5 py-4 text-[13.5px] leading-relaxed text-opti-fir/70">
          {rich(
            "**How to use this map:** Each row translates one Adobe Target concept to its Optimizely equivalent. Use the mapping type key above to understand the level of transition effort each row requires. Hover over any tag for a quick reminder. Opal callouts throughout the map identify where Optimizely's AI capabilities directly accelerate or simplify the transition.",
            "font-semibold text-opti-fir",
          )}
        </div>

        {SECTIONS.map((s) => (
          <SectionBlock key={s.id} s={s} />
        ))}
      </main>

      {/* Footer */}
      <div className="border-t border-opti-fir/10 bg-white px-5 py-6 text-center text-xs text-opti-fir/50">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-3">
          <div>
            Optimizely Change Management Toolkit · Adobe Target → Optimizely
            Concept Translation Map · For internal use and customer-facing
            delivery
          </div>
          <div className="flex flex-wrap justify-center gap-3 print:hidden">
            <PrintButton className="inline-flex items-center gap-1.5 rounded-full bg-opti-lime px-4 py-1.5 font-semibold text-opti-fir transition hover:brightness-95">
              <DownloadIcon /> Download PDF
            </PrintButton>
            <Link
              href={slidesConfig.deckPath}
              className="rounded-full border border-opti-fir/20 px-4 py-1.5 text-opti-fir transition hover:bg-opti-fir/[0.03]"
            >
              ← Back to the deck
            </Link>
            <Link
              href={slidesConfig.homeHref}
              className="rounded-full border border-opti-fir/20 px-4 py-1.5 text-opti-fir transition hover:bg-opti-fir/[0.03]"
            >
              Back to the app
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
