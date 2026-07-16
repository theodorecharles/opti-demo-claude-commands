---
description: Build an Optimizely Feature Experimentation demo (iOS SwiftUI or Web React/Next.js) end-to-end — project, flags, events, audiences, and the app.
model: claude-opus-4-8
effort: xhigh
---

# Optimizely Feature Experimentation Demo Builder

You are building an Optimizely Feature Experimentation demo app for a prospect. The user is a Solution Engineer at Optimizely. This skill automates the full end-to-end workflow: creating the Optimizely FX project, retrieving the SDK key, creating attributes/events/audiences, creating feature flags **with variables and variations**, wiring up **targeting rules** (a per-tier targeted delivery for each tiered audience, plus A/B experiments) that serve those variations, standing up a couple of **running A/B tests on production**, building and running the demo app, and finally **seeding those production experiments with fake results** so their Results pages show a clear winner.

## Step 0: Load API Token

Read the API token from `~/.optimizely/api_token`:

```bash
cat ~/.optimizely/api_token
```

- If the file exists and contains a token, use that token for all API calls in this workflow. Store it as `TOKEN` for use in all subsequent steps.
- If the file does not exist or is empty, ask the user: **"Please paste your Optimizely API token (e.g., `2:abc123...`). You can find this in your Optimizely account under Settings > API Access."**
  - Once they provide it, save it for future use:
    ```bash
    mkdir -p ~/.optimizely && echo "<THEIR_TOKEN>" > ~/.optimizely/api_token && chmod 600 ~/.optimizely/api_token
    ```
  - Then proceed with that token.

Also refresh the project-config runner (it does all the Optimizely API work in
this skill). **Always pull the latest** — the runner gains capabilities over time
(e.g. flag variations and targeting rules), and an older cached copy silently
lacks them. Download to a temp file and only replace on success, so a failed
download (offline) leaves any existing runner intact:

```bash
mkdir -p ~/.optimizely && \
  curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_config.py" -o ~/.optimizely/opti_config.py.new \
  && mv ~/.optimizely/opti_config.py.new ~/.optimizely/opti_config.py \
  && chmod +x ~/.optimizely/opti_config.py
```

(Downloading to `.new` and only `mv`-ing on success means a failed/offline
download leaves any existing runner untouched.)

Confirm it supports the subcommands this skill needs (`flags` variations + the
`rules` command). If `rules` is missing, the refresh didn't take:

```bash
python3 ~/.optimizely/opti_config.py --help | grep -q rules && echo "runner OK (has rules)" || echo "runner STALE — re-download"
```

The runner reads the token from `~/.optimizely/api_token` itself, so you don't
pass it on the command line.

## Arguments

The user will provide:
- **Prospect name** and context (e.g., "Simon Premium Outlets")
- **Platform**: iOS (SwiftUI), Web (React/Next.js), or other
- **Feature flags** they want to demo (descriptions of what they want to toggle/configure)
- **Events** they want to track
- **Any screenshots or design references** for the UI

If any of these are missing, ask before proceeding.

## Optimizely configuration (via `opti_config.py`)

All Optimizely-side setup runs through the project-config runner
(`~/.optimizely/opti_config.py`) rather than hand-written curl — it's faster and
encodes the tricky parts correctly (the `is_flags_enabled` project flag, prod
unrestriction, audience attribute-name resolution, and the flags-ruleset shape
for variations/rules — variation values go under `variables` as `{value}`, A/B
rules need a metric, audience ids must be integers, and the flag must be enabled
in the environment or no rule serves). Every subcommand reads the token from
`~/.optimizely/api_token` and prints JSON. The bulk subcommands take a spec via
`--spec FILE` or `--json '<inline>'` and skip entities that already exist, so
re-runs are safe. Read each command's JSON output before moving on.

Subcommands: `project`, `attributes`, `flags` (now also creates custom
**variations**), `events`, `audiences`, `rules` (targeting rules that serve
specific variations), `ab-info` (resolves an A/B rule's Results URL +
winner/loser variation ids for the fake-data runner), and `enable-flag`.

## Step 1: Create the project (+ SDK keys)

Name the project after the **app name**, not the prospect — the demo may be
reused across prospects.

```bash
python3 ~/.optimizely/opti_config.py project --name "<APP_NAME>" --platform custom --description "FX demo for <PROSPECT_NAME>"
```

This creates a proper Feature Experimentation project (with
`is_flags_enabled: true` — without it you'd get a legacy FullStack project that
has no flags v1 API), unrestricts the production environment, and returns the
project id plus dev/prod SDK keys. From the JSON output, save:
- `project_id` → **PROJECT_ID**
- `dev_sdk_key` → **SDK_KEY** (the app uses the development environment)

## Step 2: Create user attributes

```bash
python3 ~/.optimizely/opti_config.py attributes --project <PROJECT_ID> --json '[
  {"key": "loyalty_tier", "name": "Loyalty Tier", "description": "Membership tier"},
  {"key": "device_type",  "name": "Device Type",  "description": "Device category"}
]'
```

Attributes are available in the SDK datafile for targeting immediately. **Give
each attribute a human-readable `name`** (e.g. key `loyalty_tier` → name
`Loyalty Tier`). Audiences (Step 5) reference attributes by that display name —
the runner maps key → display name for you, which is the whole reason audience
creation is now reliable (see Step 5).

## Step 3: Create feature flags (with variables AND variations)

Every flag should get **variables** (dynamic config) AND **custom variations**
(named value-sets the app/experiment serves). Without variations you only get the
auto-created `on`/`off` — which is exactly the "I only see on or off" gap. Define
both in one call: put the schema in `variable_definitions` and the concrete
value-sets in `variations`.

```bash
python3 ~/.optimizely/opti_config.py flags --project <PROJECT_ID> --json '[
  {"key": "homepage_hero", "name": "Homepage Hero", "description": "Hero A/B test",
   "variable_definitions": {
     "headline":  {"type": "string", "default_value": "The default headline", "description": "Hero headline"},
     "bg_color":  {"type": "string", "default_value": "#000000", "description": "Hero background"},
     "cta_label": {"type": "string", "default_value": "Shop now", "description": "CTA text"}
   },
   "variations": [
     {"key": "control",   "name": "Control",
      "variable_values": {"headline": "The default headline", "bg_color": "#000000", "cta_label": "Shop now"}},
     {"key": "treatment", "name": "Treatment",
      "variable_values": {"headline": "Welcome back — 20% off", "bg_color": "#0B5FFF", "cta_label": "Claim your deal"}}
   ]}
]'
```

- `variable_definitions` `type` is one of `string|boolean|integer|double|json`.
  The runner fills in each variable's required `key` for you.
- `variations` each become a **real named variation** on the flag (alongside the
  auto-created `on`/`off`). `variable_values` overrides the defaults; any variable
  you omit is backfilled from its default so every variation defines the same
  variables (the API requires this). Values are coerced to the strings the flags
  API expects. Give the first variation the control/baseline values.
- The **variations are what Step 6's targeting rules reference by key**, so create
  them here before you build rules.

**Flags ship OFF by default** (`decide()` returns `enabled: false`, serving the
auto-created `off` variation) — this is the right **live-toggle** starting point:
the SE flips the flag on in the Optimizely UI during the demo and the app reacts
within ~2s. Step 6 (targeting rules) enables the flag so its variations serve; if
you skip Step 6 and just want a flag **ON at 100%** immediately (so the demo works
out of the box / can be screenshot-verified), add an everyone-delivery rule:

```bash
python3 ~/.optimizely/opti_config.py enable-flag --project <PROJECT_ID> --flag <FLAG_KEY> --env-key development
```

Then confirm the datafile flipped (allow a few seconds for the CDN):

```bash
curl -s "https://cdn.optimizely.com/datafiles/<SDK_KEY>.json?cb=$(date +%s)" | grep -o '"featureEnabled":[a-z]*' | head
```

## Step 4: Create custom events

```bash
python3 ~/.optimizely/opti_config.py events --project <PROJECT_ID> --json '[
  {"key": "add_to_cart", "name": "Add To Cart"},
  {"key": "purchase_completed", "name": "Purchase Completed"}
]'
```

## Step 5: Create audiences

Audiences target on the attributes from Step 2. Reference each attribute by its
**key** — the runner resolves it to the attribute's display name, which is what
the audiences API actually validates against.

```bash
python3 ~/.optimizely/opti_config.py audiences --project <PROJECT_ID> --json '[
  {"name": "Gold Loyalty Tier", "attribute": "loyalty_tier", "value": "gold"},
  {"name": "Mobile Users",      "attribute": "device_type",  "value": "mobile"},
  {"name": "Gold on Mobile",    "all": [
     {"attribute": "loyalty_tier", "value": "gold"},
     {"attribute": "device_type",  "value": "mobile"}]}
]'
```

**There is no propagation delay to design around.** The old belief that
newly-created attributes take "minutes to hours" before audiences accept them
was a misdiagnosis. The real cause: the `/v2/audiences` API validates a
`custom_attribute` condition's `name` against the attribute's **display name**
(e.g. `Loyalty Tier`), not its key (`loyalty_tier`). Sending the key yields
`Custom attribute 'loyalty_tier' does not exist` — no amount of retrying fixes
it. The runner GETs the project's attributes and rewrites each condition to use
the correct display name, so audiences create on the first try. (Use
`--dry-run` to print the exact conditions without creating anything.) If you
ever do hit a genuine transient, just re-run — existing audiences are skipped.

## Step 6: Create targeting rules (serve the variations)

Now wire the variations (Step 3) and audiences (Step 5) together into **targeting
rules** so flags serve real variations instead of just on/off. This is the step
that turns "on/off" into actual experiments. Two rule types cover almost every
demo:

- **`targeted_delivery`** — deliver ONE variation to a specific audience (great
  for "Gold members always see the premium hero"). No metric required.
- **`a/b`** — split traffic across variations (the classic experiment). **An
  `a/b` rule REQUIRES at least one metric** (an event key from Step 4).

Rules are evaluated in spec order (first = highest priority), so list targeted
deliveries before any catch-all A/B split. Variation keys must match the ones you
created in Step 3.

### 6a. Development env — what the running app serves

The app reads the **development** SDK key (Step 1), so put the rules you want to
demo live here. **For a tiered audience set (e.g. loyalty gold/silver/bronze),
create one `targeted_delivery` rule per tier** — one rule per audience, never a
single collapsed rule — each serving that tier's variation. That's what makes
audience targeting tangible. Follow the tiers with an everyone-else A/B split so
users outside every tier still land in an experiment:

```bash
python3 ~/.optimizely/opti_config.py rules --project <PROJECT_ID> --flag homepage_hero --env-key development --json '[
  {"key": "gold_tier",   "name": "Gold tier → premium",    "type": "targeted_delivery", "audience": "Gold Loyalty Tier",   "variation": "premium"},
  {"key": "silver_tier", "name": "Silver tier → plus",     "type": "targeted_delivery", "audience": "Silver Loyalty Tier", "variation": "plus"},
  {"key": "bronze_tier", "name": "Bronze tier → standard", "type": "targeted_delivery", "audience": "Bronze Loyalty Tier", "variation": "standard"},
  {"key": "hero_ab",     "name": "Hero A/B (everyone else)", "type": "a/b",
   "distribution": {"control": 5000, "treatment": 5000}, "metrics": ["purchase_completed"]}
]'
```

- one `targeted_delivery` per tier — do NOT collapse tiers into one rule; each
  audience gets its own rule so the SE can point at each tier individually.
- `audience` is the audience **name** from Step 5 (resolved to id). Omit targeting
  to match everyone. `variation` picks the single served variation.
- `distribution` maps variation key → basis points and **must sum to 10000**.
  Shorthands: `variation` (single key) or `variations` (list, split evenly).
- `metrics` entries are event keys (from Step 4); pass an object
  `{"event": "purchase_completed", "winning_direction": "increasing"}` to override
  aggregator/direction/scope.
- The runner **enables the flag in that environment by default** so the rules
  actually serve (a disabled flag compiles none of its rules into the datafile).
  Pass `--no-enable` to keep the OFF-by-default live-toggle starting point — then
  the SE flips it on in the UI mid-demo and all the pre-built rules light up.

### 6b. Production env — A/B tests to seed with results

**Pick a couple of the more interesting features and stand up a running A/B test
on the `production` environment.** These are the experiments Step 10 fills with
fake results, so the Optimizely **Results** page tells a complete story — a clear
winner, real significance — the moment the prospect opens it. Same command, just
`--env-key production` (a/b rules default to `status: running`, so they start
immediately):

```bash
python3 ~/.optimizely/opti_config.py rules --project <PROJECT_ID> --flag checkout_flow --env-key production --json '[
  {"key": "checkout_ab", "name": "Checkout A/B", "type": "a/b",
   "distribution": {"control": 3334, "express": 3333, "minimal": 3333},
   "metrics": ["purchase_completed"]}
]'
```

Give **at least one** production test **three variations** so Step 10 can show a
winner AND a loser (two-variation tests get just a winner). **Remember the flag
keys you use here — Step 10 needs them.**

Confirm the dev datafile compiled the rules (allow a few seconds for the CDN) —
you should see the A/B rule under `experiments` and each targeted delivery under
`rollouts`, with its variations:

```bash
curl -s "https://cdn.optimizely.com/datafiles/<SDK_KEY>.json?cb=$(date +%s)" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('experiments:',[(e['key'],[v['key'] for v in e['variations']]) for e in d.get('experiments',[])]);print('rollout rules:',[(x['key'],x.get('audienceIds')) for r in d.get('rollouts',[]) for x in r.get('experiments',[])])"
```

## Step 7: Build the Demo App

### For iOS (SwiftUI):

1. Create a new Xcode project using xcodegen (check `which xcodegen` first, install with `brew install xcodegen` if needed)
2. Add Optimizely Swift SDK dependency: `https://github.com/optimizely/swift-sdk.git` (product name: `Optimizely`, from version 4.0.0)
3. Use the `SDK_KEY` from Step 1 in the OptimizelyManager
4. Set `periodicDownloadInterval: 2` for live demo polling
5. Use `@Published` properties + `addDatafileChangeNotificationListener` to auto-update UI
6. For feature decisions, use the Decide API:
   ```swift
   let user = client.createUserContext(userId: userId, attributes: attributes)
   let decision = user.decide(key: "flag_key")
   // decision.enabled — whether the flag is on
   // decision.variables.toMap() — variable values
   ```
7. For event tracking: `try? client.track(eventKey:userId:attributes:eventTags:)`
8. **IMPORTANT**: Check `decision.enabled` in addition to variables so toggling flags on/off in the Optimizely UI works immediately without needing rules/variations configured
9. Force light mode with `.preferredColorScheme(.light)` for demo consistency
10. Use a custom tab bar (not TabView) if you need 6+ tabs on iPhone — iOS 18+ limits TabView to 5 visible tabs
11. Download stock photos from Unsplash for realistic product imagery (use `https://images.unsplash.com/photo-<ID>?w=600&h=750&fit=crop`)
12. The `createUserContext` method returns a non-optional `OptimizelyUserContext` — do NOT use `guard let` on it

### For Web (React/Next.js):

The package that installs today is **`@optimizely/react-sdk@4.x`** (built on `optimizely-sdk@6`), which uses a **modular** API. The old `datafileOptions` / `useDecision` / `optimizely.track` API **no longer exists** — do NOT use it. The following is verified working against react-sdk 4.0.0 / Next.js 16 / React 19.

1. Install the SDK (React 19 peer ranges require the legacy flag):
   ```bash
   npm install @optimizely/react-sdk --legacy-peer-deps
   ```
2. Create the client with the modular config manager + event processor (this replaces `datafileOptions`):
   ```ts
   import {
     createInstance,
     createPollingProjectConfigManager,
     createBatchEventProcessor,
   } from "@optimizely/react-sdk";

   const optimizely = createInstance({
     projectConfigManager: createPollingProjectConfigManager({
       sdkKey: SDK_KEY,
       autoUpdate: true,
       updateInterval: 2000, // 2s polling so UI reacts to flag toggles live
     }),
     eventProcessor: createBatchEventProcessor({ flushInterval: 1000, batchSize: 10 }),
   });
   ```
3. Wrap the app in `<OptimizelyProvider>` — props are `client` + `user` (changing the `user` prop re-decides, which is exactly what you want for live attribute/audience targeting):
   ```tsx
   <OptimizelyProvider client={optimizely} user={{ id: userId, attributes }} timeout={500}>
   ```
4. For feature decisions use the **`useDecide`** hook (NOT `useDecision`):
   ```ts
   const { isLoading, error, decision } = useDecide("flag_key");
   // decision?.enabled   -> boolean (gate the feature on this)
   // decision?.variables -> { [key]: unknown } (cast as needed)
   ```
   Other exported hooks: `useDecideForKeys`, `useDecideAll`, `useOptimizelyClient`, `useOptimizelyUserContext`.
5. For event tracking, go through the **user context** (NOT `optimizely.track`):
   ```ts
   const { userContext } = useOptimizelyUserContext();
   userContext?.trackEvent("purchase_completed", {
     revenue: Math.round(total * 100), // reserved: integer cents
     value: Number(total.toFixed(2)),  // reserved: float
     // ...custom tags
   });
   ```
6. **IMPORTANT**: Gate UI on `decision.enabled` (same principle as iOS) so toggling the flag on/off in the Optimizely UI works immediately without needing rules/variations configured.

#### Web build notes (Next.js 16 / create-next-app):

- `create-next-app .` **fails if the current directory name has capital letters** (npm package-naming rules). Scaffold into a **lowercase** subdir, e.g.:
  ```bash
  npx create-next-app@latest cort-checkout --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
  ```
- Next.js 16 uses **Turbopack by default** — the package scripts are just `next dev` / `next build` (no `--turbopack` flag). `next lint` was **removed**.
- A stray `package-lock.json` in a parent/home dir confuses Turbopack's workspace-root inference. Pin the root in `next.config.ts`:
  ```ts
  import path from "path";
  const nextConfig = { turbopack: { root: path.resolve(__dirname) } };
  export default nextConfig;
  ```
- For remote product images (Unsplash), prefer a plain `<img>` with an `onError` fallback over `next/image` — Next 16 tightened `next/image` (required `remotePatterns`, new `qualities` / `maximumRedirects` defaults). **Validate that each Unsplash photo ID returns HTTP 200 before using it**, and keep a branded fallback tile so the catalog never looks broken.
- The scaffold's `AGENTS.md` notes Next 16's breaking changes and points to `node_modules/next/dist/docs/` — worth a read if something behaves unexpectedly.

#### SSR / hydration (this is a client-heavy SDK app):

- The Optimizely client (polling config manager + event processor) and `localStorage` must run **browser-only**. Gate the interactive tree behind a `mounted` check (render a splash on the server / first paint), and create the client **lazily** — a `typeof window` guard or a `useState`/singleton inside the client boundary.
- If you persist cart/state to `localStorage`, **don't let the persist effect write before the hydrate effect commits** — otherwise the initial empty state clobbers saved data on refresh (React StrictMode double-invoking effects in dev makes this worse). Gate persistence on a `hydrated` flag that you set at the **end** of the hydrate effect.

#### Add the Optimizely Slides deck (during the build — Web track only):

The interactive product deck ships **with** the app — build it in now, as part of
this step, not as a bolted-on afterthought. It's a React/Next package, so it only
applies to this Web track (skip it for the iOS track above). You already have
everything needed to tailor it: **SDK_KEY**, **PROJECT_ID**, the flags/events you
created, and the prospect's brand. The package is cached locally by the installer
at `~/.optimizely/slides/package` (`PKG` below); `/add-slides` remains available
to re-sync a demo to a newer baseline later.

1. Copy the payload in (this scaffold uses `--src-dir`, so `SRC_ROOT=src` and
   `APP_DIR=src/app`):
   ```bash
   PKG=~/.optimizely/slides/package
   cp -R "$PKG/optimizely-slides" src/optimizely-slides
   cp -R "$PKG/app/slides"        src/app/slides
   mkdir -p public && cp "$PKG/assets/optimizely-logo.svg" "$PKG/assets/opal-orb.png" public/
   ```
2. Wire the deck stylesheet — add its import to `src/app/globals.css` **right
   after** `@import "tailwindcss";` (the relative path is correct because
   `globals.css` sits in `app/` and `optimizely-slides/` is its sibling under
   `src/`):
   ```css
   @import "tailwindcss";
   @import "../optimizely-slides/slides.css";
   ```
   The SDK dependency (`@optimizely/react-sdk`) is already installed from the
   steps above, and the deck reuses your `<OptimizelyProvider>` if present or
   creates its own from `sdkKey` — no extra wiring needed.
3. **Tailor `src/optimizely-slides/slides.config.ts` to THIS demo** (this is the
   step that makes it feel bespoke rather than a generic deck): set `sdkKey` to
   **SDK_KEY**, `flagKey` to the primary hero/homepage flag, `homeHref` to `/`,
   and `deckPath` to `/slides`. Fill `brand` (name, logoText, accent hex, heroBg,
   siteHost, nav, features, catalog) from the prospect and the app you just
   built, and mirror the real hero flag's variations into `heroVariations` (the
   first entry is the control) so the "read variables" slide and live preview
   match the actual experiment. Set `benchAttributes` to representative user
   attributes. Trim any track/slide that isn't relevant to this prospect.

The deck then builds and serves with the app in the next step — `/slides` (deck)
and `/slides/adobe-comparison` (Adobe Target → Optimizely concept map) become
routes of the demo itself.

## Step 8: Build and Run

### iOS:
```bash
xcodegen generate
xcodebuild -project <Project>.xcodeproj -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build build
xcrun simctl boot "iPhone 17 Pro"
open -a Simulator
xcrun simctl install "iPhone 17 Pro" build/Build/Products/Debug-iphonesimulator/<App>.app
xcrun simctl launch "iPhone 17 Pro" <bundle_id>
```

### Web:
```bash
npm run dev
```

## Step 9: Verify

Take a screenshot of the running app and show it to the user. Confirm all feature flags are working and events are being tracked. Exercise the **variations and targeting rules** from Step 6 — e.g. switch the user's attributes so a targeted-delivery audience matches and confirm the app renders that variation's values. For the Web track, also confirm `/slides` and `/slides/adobe-comparison` appear in the route list and the deck loads (screenshot `http://localhost:3000/slides`).

## Step 10: Seed the production experiments with results (fake data)

Last thing in the build: populate each **production A/B test** from Step 6b with
results so its Optimizely **Results** page shows a decisive winner out of the box.
This is the same job `/fake-data` does interactively — but you already know the
flag and how it should resolve, so drive the runner directly (no prompts). Two
calls per experiment.

First, resolve the experiment with `ab-info` (it reads the flag's compiled A/B
rule — no datafile/CDN wait):

```bash
python3 ~/.optimizely/opti_config.py ab-info --project <PROJECT_ID> --flag checkout_flow --env-key production
```

Read its JSON. It returns `results_url`, `winner` and `loser` with variation ids,
already applying the intended outcome: **baseline is `control`, the non-baseline
variation wins, and the third variation (if the test has one) loses.** `loser` is
`null` for two-variation tests.

Then send **25,000 visitors** with those ids:

```bash
python3 ~/.optimizely/fake_data.py send "<results_url>" --visitors 25000 --winner <winner.id> --loser <loser.id>
```

- Omit `--loser <id>` when `ab-info` reports `loser: null` (two-variation tests).
- **Repeat both calls for every production A/B test** you created in Step 6b.
- Do NOT run the interactive `/fake-data` command — `ab-info` already supplies the
  winner/loser, so calling the runner directly keeps this prompt-free.
- The runner POSTs in batches to `logx.optimizely.com` (expect `HTTP 204`).
  Numbers appear on the Results page within ~1–5 minutes; refresh to watch them
  populate. 25k visitors at the default conversion spread (winner ~15%, baseline
  ~11%, loser ~8%) is comfortably enough to reach significance.

## Key Principles for Demo Apps

- **Auto-update is critical**: The datafile must poll every 2 seconds so changes in the Optimizely UI reflect in the app within seconds, with ZERO interaction needed
- **Use real-looking data**: Stock photos, realistic store/product names, actual date ranges
- **Event tracking on every interaction**: Track opens, favorites, add-to-cart, etc. with rich event tags (item ID, category, store name)
- **User attributes for targeting**: Set attributes based on user behavior so the SE can demo audience-based targeting
- **Smooth transitions**: Animate layout changes when features toggle (e.g., grid → list, banner modes)
- **SDK Key should be a constant**: Easy to find and swap if needed
- **Only track on positive actions**: e.g., track `deal_favorited` when favoriting, not when unfavoriting

## Output

After completing all steps, summarize:
1. Optimizely project name and ID
2. SDK key (development environment)
3. All attributes created
4. All feature flags created, with their variables **and variations**
5. All events created
6. Audiences created
7. Targeting rules created — development (per-tier targeted deliveries + any A/B) and production (the started A/B tests), noting type, variations served, and audience per rule
8. Production experiments seeded with fake results (per experiment: Results URL, visitor count, and which variation was made winner/loser)
9. App location and how to run it
10. (Web track) The Optimizely Slides deck at `/slides`, and what you tailored in `slides.config.ts`
