---
description: Build an Optimizely Feature Experimentation demo (iOS SwiftUI or Web React/Next.js) end-to-end — project, flags, events, audiences, and the app.
model: claude-opus-4-8
effort: xhigh
---

# Optimizely Feature Experimentation Demo Builder

You are building an Optimizely Feature Experimentation demo app for a prospect. The user is a Solution Engineer at Optimizely. This skill automates the full end-to-end workflow: creating the Optimizely FX project, retrieving the SDK key, creating feature flags/events/attributes/audiences, building the demo app, and running it.

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

Also make sure the project-config runner is present (it does all the Optimizely
API work in this skill). If `~/.optimizely/opti_config.py` is missing, download it:

```bash
[ -f ~/.optimizely/opti_config.py ] || (mkdir -p ~/.optimizely && curl -fsSL "https://raw.githubusercontent.com/theodorecharles/opti-demo-claude-commands/main/scripts/opti_config.py" -o ~/.optimizely/opti_config.py && chmod +x ~/.optimizely/opti_config.py)
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
unrestriction, and — importantly — audience attribute-name resolution). Every
subcommand reads the token from `~/.optimizely/api_token` and prints JSON. The
bulk subcommands take a spec via `--spec FILE` or `--json '<inline>'` and skip
entities that already exist, so re-runs are safe. Read each command's JSON
output before moving on.

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

## Step 3: Create feature flags

```bash
python3 ~/.optimizely/opti_config.py flags --project <PROJECT_ID> --json '[
  {"key": "homepage_hero", "name": "Homepage Hero", "description": "Hero A/B test",
   "variable_definitions": {
     "headline":  {"type": "string", "default_value": "The default headline", "description": "Hero headline"},
     "bg_color":  {"type": "string", "default_value": "#000000", "description": "Hero background"},
     "cta_label": {"type": "string", "default_value": "Shop now", "description": "CTA text"}
   }}
]'
```

`type` is one of `string|boolean|integer|double|json`. The runner fills in each
variable's required `key` for you.

**Flags ship OFF by default** (`decide()` returns `enabled: false`, serving the
auto-created `off` variation) — this is the right **live-toggle** starting point:
the SE flips the flag on in the Optimizely UI during the demo and the app reacts
within ~2s. That's the default the rest of this skill assumes.

To instead serve a flag **ON at 100%** immediately (so the demo works out of the
box / can be screenshot-verified), add an everyone-delivery rule:

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

## Step 6: Build the Demo App

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

## Step 7: Build and Run

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

## Step 8: Verify

Take a screenshot of the running app and show it to the user. Confirm all feature flags are working and events are being tracked. For the Web track, also confirm `/slides` and `/slides/adobe-comparison` appear in the route list and the deck loads (screenshot `http://localhost:3000/slides`).

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
4. All feature flags created with their variables
5. All events created
6. Audiences created
7. App location and how to run it
8. (Web track) The Optimizely Slides deck at `/slides`, and what you tailored in `slides.config.ts`
