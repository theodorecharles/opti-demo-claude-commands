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

## Arguments

The user will provide:
- **Prospect name** and context (e.g., "Simon Premium Outlets")
- **Platform**: iOS (SwiftUI), Web (React/Next.js), or other
- **Feature flags** they want to demo (descriptions of what they want to toggle/configure)
- **Events** they want to track
- **Any screenshots or design references** for the UI

If any of these are missing, ask before proceeding.

## Optimizely API Configuration

- **Base URL**: `https://api.optimizely.com`
- **Auth Header**: `Authorization: Bearer <TOKEN>` (where `<TOKEN>` is loaded from Step 0)

**Shell note**: The default shell here is **zsh**, which (unlike bash) does **not** word-split unquoted parameter expansions. Any `for x in $var` loop over a space-separated string will iterate **once** over the whole string, not per word. In scripts you write (e.g. loops over flag keys, the `create-audiences.sh` below), use an explicit list (`for x in a b c`), an array (`arr=(...)`; `for x in "${arr[@]}"`), or zsh's split form `${=var}`.

## Step 1: Create the Optimizely FX Project

**CRITICAL**: You MUST include `"is_flags_enabled": true` in the request body. Without this, the API creates a legacy FullStack project (sunset) that does NOT support the flags v1 API. Only `is_flags_enabled: true` creates a proper Feature Experimentation project. **Do NOT omit this field under any circumstances.**

Also: name the project after the **app name**, not the prospect name — the demo may be reused across prospects.

```bash
curl -s -X POST "https://api.optimizely.com/v2/projects" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "<APP_NAME>", "description": "FX demo for <PROSPECT_NAME>", "platform": "custom", "is_flags_enabled": true}'
```

Save the `id` from the response as `PROJECT_ID`. **Verify** that `"is_flags_enabled": true` appears in the response before proceeding.

After creating the project, unrestrict the production environment so the flags API has permission to create flags:

```bash
# Get environment IDs
curl -s "https://api.optimizely.com/v2/environments?project_id=<PROJECT_ID>" \
  -H "Authorization: Bearer <TOKEN>"

# Unrestrict production (development is already unrestricted by default)
curl -s -X PATCH "https://api.optimizely.com/v2/environments/<PROD_ENV_ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"has_restricted_permissions": false}'
```

## Step 2: Get the Development Environment SDK Key

```bash
# List environments to get the development env ID
curl -s "https://api.optimizely.com/v2/environments?project_id=<PROJECT_ID>" \
  -H "Authorization: Bearer <TOKEN>"
```

Find the environment with `"is_primary": false` (development). Save its `id` as `DEV_ENV_ID`.

```bash
# Get SDK key from environment detail
curl -s "https://api.optimizely.com/v2/environments/<DEV_ENV_ID>" \
  -H "Authorization: Bearer <TOKEN>"
```

The SDK key is at `response.datafile.sdk_key`. Save this as `SDK_KEY`.

## Step 3: Create User Attributes (EARLY — before flags, to start propagation)

**IMPORTANT**: Create attributes as early as possible. There is a propagation delay (potentially minutes to hours) before the audience conditions API recognizes newly-created attributes. Creating them first gives them maximum time to propagate while you build the rest.

```bash
curl -s -X POST "https://api.optimizely.com/v2/attributes" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "key": "<attribute_key>",
    "name": "<Attribute Name>",
    "description": "<description>"
  }'
```

Attributes are immediately available in the SDK datafile for targeting. The app can send and receive them right away. Only the audience conditions REST API has the propagation delay.

## Step 4: Create Feature Flags

For each feature flag the user wants:

```bash
curl -s -X POST "https://api.optimizely.com/flags/v1/projects/<PROJECT_ID>/flags" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "<flag_key>",
    "name": "<Flag Name>",
    "description": "<description>",
    "variable_definitions": {
      "<var_key>": {
        "key": "<var_key>",
        "type": "<string|boolean|integer|double|json>",
        "default_value": "<default>",
        "description": "<var description>"
      }
    }
  }'
```

**Important**: Every variable in `variable_definitions` MUST include a `"key"` field matching its dictionary key.

### (Optional) Enable a flag at 100% via the API

By default a newly-created flag ships **OFF**: `decide()` returns `enabled: false` and only the auto-created `off` variation serves at 100%. That's a perfectly good **live-toggle** starting point — the SE flips the flag on in the Optimizely UI during the demo and the app reacts within ~2s (this is the default the rest of this skill assumes).

If you instead want the flag serving **on** at 100% immediately (so the demo works out of the box / can be screenshot-verified), add a delivery rule with a **JSON Patch**. Verified facts about this API:

- The `on` and `off` variations are **auto-created** with the flag — POSTing an `on` variation returns `409 already exists`.
- There is **no** `POST .../rules` endpoint (it 404s), and `/ruleset/enabled` is `405`. You enable + add a delivery rule by PATCHing the **ruleset base URL** with a JSON Patch **array** body. Use the environment **key** (e.g. `development`) — matching the environment whose SDK key the app uses — not the numeric env ID:

```bash
curl -s -X PATCH \
  "https://api.optimizely.com/flags/v1/projects/<PROJECT_ID>/flags/<FLAG_KEY>/environments/<ENV_KEY>/ruleset" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '[
    {"op":"add","path":"/rules/everyone","value":{
      "key":"everyone","name":"Everyone","type":"targeted_delivery",
      "audience_conditions":[],"percentage_included":10000,"enabled":true,
      "variations":{"on":{"key":"on","percentage_included":10000}}
    }},
    {"op":"replace","path":"/rule_priorities","value":["everyone"]}
  ]'
```

Then verify the CDN datafile flips to serving the `on` variation (`featureEnabled: true`). Add a cache-buster query param and allow a few seconds for the CDN to refresh:

```bash
curl -s "https://cdn.optimizely.com/datafiles/<SDK_KEY>.json?cb=$(date +%s)"
```

## Step 5: Create Custom Events

```bash
curl -s -X POST "https://api.optimizely.com/v2/projects/<PROJECT_ID>/custom_events" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"key": "<event_key>", "name": "<Event Name>", "description": "<description>", "event_type": "custom"}'
```

## Step 6: Build the Demo App

### For iOS (SwiftUI):

1. Create a new Xcode project using xcodegen (check `which xcodegen` first, install with `brew install xcodegen` if needed)
2. Add Optimizely Swift SDK dependency: `https://github.com/optimizely/swift-sdk.git` (product name: `Optimizely`, from version 4.0.0)
3. Use the `SDK_KEY` from Step 2 in the OptimizelyManager
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

## Step 8: Create Audiences (LAST — after build, to allow propagation time)

Attempt to create audiences referencing the attributes from Step 3. The audience conditions format is:

```bash
curl -s -X POST "https://api.optimizely.com/v2/audiences" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": <PROJECT_ID>,
    "name": "<Audience Name>",
    "description": "<description>",
    "conditions": "[\"and\", [\"or\", [\"or\", {\"match_type\": \"exact\", \"name\": \"<attribute_key>\", \"type\": \"custom_attribute\", \"value\": <value>}]]]"
  }'
```

### Audience conditions format notes:
- `conditions` must be a **stringified JSON array** (escaped JSON inside a string). Passing a raw array returns `400 ... is not of type 'string'`.
- Structure: `["and", ["or", ["or", {condition}]]]` (nested and/or/or)
- Each condition: `{"match_type": "exact", "name": "<attr_key>", "type": "custom_attribute", "value": <val>}`
- Valid match_type values: `"exact"`, `"exists"`, `"substring"`, `"gt"`, `"lt"`
- Boolean values: `true` / `false` (not strings)
- String values: `"some_string"`

### Handling propagation delay:
- If audience creation fails with `Custom attribute '<key>' does not exist`, the audience-conditions validator hasn't caught up yet. **Do NOT promise success after a few retries.** In practice the attributes were present in `/v2/attributes` **and** in the live datafile, yet `/v2/audiences` still rejected them well past 3×30s — its validator keeps a separate cache that can lag **minutes to hours**.
- A couple of quick retries (e.g. 2×30s) is fine to catch the fast case, but don't block the demo waiting on it.
- Instead, **ship a re-runnable `create-audiences.sh` script** (the curl call above, parameterized over the audiences you want) that the SE can run later once the cache catches up. (Mind the zsh **Shell note** above if the script loops over attribute/audience lists.)
- Tell the SE the **Optimizely UI** audience builder does **not** have this lag — building the audience in the UI works immediately. That's the fastest path if they need it during the demo.
- Either way, the SDK/app targeting works regardless, because the attributes are already in the datafile. Audiences are only needed for the Optimizely UI's rule configuration.

## Step 9: Verify

Take a screenshot of the running app and show it to the user. Confirm all feature flags are working and events are being tracked.

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
6. Audiences created (or note if they need manual creation due to propagation delay)
7. App location and how to run it
