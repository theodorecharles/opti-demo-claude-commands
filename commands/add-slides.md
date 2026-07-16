---
description: Add (or re-sync) the interactive Optimizely product deck into the current demo app, tailored to the demo's context.
model: claude-opus-4-8
effort: xhigh
---

# Add Optimizely Slides to a Demo

You are adding the reusable **Optimizely Slides** deck to an Optimizely demo app
the user (a Solution Engineer) has already built. The deck is an interactive,
two-track product walkthrough — **Feature Experimentation** and **Web
Experimentation** — plus the **Adobe Target → Optimizely** concept translation
map, the live `decide()` benchmark, the Visual Editor mock, and more.

The package is a **copy-in snapshot**: you copy the current version into the
demo and then tailor it to this specific prospect. Re-running this command
re-syncs the engine to the latest version while preserving the tuned config.

## Step 0: Get / refresh the local package cache

The package source of truth lives in the `opti-demo-claude-commands` repo. A
local cache is kept at `~/.optimizely/slides/`. Refresh it (this also creates it
on first use):

```bash
mkdir -p ~/.optimizely/slides && \
curl -fsSL https://github.com/theodorecharles/opti-demo-claude-commands/archive/refs/heads/main.tar.gz \
  | tar -xz -C ~/.optimizely/slides --strip-components=2 opti-demo-claude-commands-main/slides
```

Verify the payload landed:

```bash
cat ~/.optimizely/slides/VERSION
ls ~/.optimizely/slides/package/optimizely-slides
```

If the download fails (offline), and a cache already exists from a prior run,
proceed with the cached copy and warn the user it may be stale.

## Step 1: Locate the demo app

The command runs from inside (or near) the demo. Confirm the app root:

- It has a `package.json` listing **`next`** and is a Next.js **App Router** app.
- Find the app directory: `src/app/` (src-dir scaffold) **or** `app/` at the
  root. Call this the **APP_DIR**, and its parent (`src/` or the project root)
  the **SRC_ROOT**. `optimizely-slides/` goes directly under **SRC_ROOT** so it
  is a sibling of `app/`.
- Find the global stylesheet (usually `<APP_DIR>/globals.css`).

If the current directory isn't a Next.js app (e.g. a static-HTML `/wx-demo`
site with no React), stop and tell the user: **the slides deck is a React/Next
package and needs a React/Next demo to host it.** Offer to add a minimal Next
route only if they want one; otherwise skip.

## Step 2: Copy the payload

Let `PKG=~/.optimizely/slides/package`.

**First install** (no existing `<SRC_ROOT>/optimizely-slides`):

```bash
cp -R "$PKG/optimizely-slides" "<SRC_ROOT>/optimizely-slides"
cp -R "$PKG/app/slides"        "<APP_DIR>/slides"
cp "$PKG/assets/optimizely-logo.svg" "$PKG/assets/opal-orb.png" "<APP_DIR>/../public/" 2>/dev/null \
  || cp "$PKG/assets/"* "<project public dir>/"
```

Put the two SVG/PNG assets in the app's **`public/`** directory (the deck loads
them from `/optimizely-logo.svg` and `/opal-orb.png`).

**Re-sync** (folder already exists): preserve the tuned config, refresh
everything else.

```bash
cp "<SRC_ROOT>/optimizely-slides/slides.config.ts" /tmp/slides.config.keep.ts
rm -rf "<SRC_ROOT>/optimizely-slides"
cp -R "$PKG/optimizely-slides" "<SRC_ROOT>/optimizely-slides"
cp /tmp/slides.config.keep.ts "<SRC_ROOT>/optimizely-slides/slides.config.ts"
cp -R "$PKG/app/slides" "<APP_DIR>/slides"
```

Warn the user that a re-sync overwrites component and `slides-data.ts` edits with
the latest baseline; only `slides.config.ts` is preserved. If they made content
edits they want to keep, note them first.

## Step 3: Wire the stylesheet

The deck styles are self-contained in `slides.css` (Tailwind v4 `@theme` tokens
+ animation). Add one import to the app's global stylesheet, **right after**
`@import "tailwindcss";`:

```css
@import "tailwindcss";
@import "../optimizely-slides/slides.css";
```

(The relative path is correct because `globals.css` lives in `app/` and
`optimizely-slides/` is its sibling under SRC_ROOT.) If an equivalent import is
already present, leave it.

## Step 4: Ensure the SDK dependency

The live benchmark needs `@optimizely/react-sdk`. If the app doesn't already
depend on it (an `/fx-demo` app will), install it:

```bash
npm install @optimizely/react-sdk --legacy-peer-deps
```

No `<OptimizelyProvider>` wiring is required: if one already wraps the app the
benchmark reuses it; otherwise it creates its own client from `sdkKey`.

## Step 5: Tailor `slides.config.ts` to THIS demo

This is the important step — make the deck match the demo it ships beside. Edit
`<SRC_ROOT>/optimizely-slides/slides.config.ts` using everything you know about
this demo (the prospect, the app you built, the flags/events you created). Fill:

- **`sdkKey`** — the demo's Feature Experimentation SDK key (find it in the
  app's config, e.g. a `SDK_KEY`/`NEXT_PUBLIC_OPTIMIZELY_SDK_KEY` constant).
  Powers both the code samples and the live benchmark.
- **`flagKey`** — the primary flag the demo shows (e.g. a hero/homepage flag).
- **`wxSnippetId`** — the Web Experimentation snippet/project id, if the prospect
  has one; otherwise leave the placeholder.
- **`homeHref`** — where "Back to the app" and Escape should go (usually `/`).
- **`deckPath`** — the route you mounted the deck at. Default `/slides`; keep it
  matching the `app/slides` folder (rename both together if you want another
  path).
- **`brand`** — make the Visual Editor mock look like the prospect: `name`,
  `logoText`, `accent` (brand hex), `heroBg`, `siteHost`, `userName`,
  `userInitials`, `nav`, `features`, `catalog`. Pull real product/section names
  and colors from the demo you built.
- **`heroVariations`** — if the demo has a real hero/homepage flag, mirror its
  variations here (key, label, headline, subtitle, cta_label, bg_color) so the
  "read variables" slide and live preview match the actual experiment. The first
  entry is the control.
- **`benchAttributes`** — representative user attributes for the benchmark.

Also tailor **content** where it helps: `slides-data.ts` holds every slide's
copy and code sample, and each component is plain source. Remove tracks or
slides that aren't relevant to this prospect, reword examples for their
industry, drop in their real flag/event names. The deck should feel bespoke.

## Step 6: Verify

```bash
npm run build
```

Confirm `/slides` and `/slides/adobe-comparison` appear in the route list and
the build passes. If a dev server is running, point the user at
`http://localhost:3000/slides` and take a screenshot.

## Step 7: Summarize

Tell the user:
1. The package version installed (`~/.optimizely/slides/VERSION`).
2. Where it landed (`<SRC_ROOT>/optimizely-slides`, `<APP_DIR>/slides`, assets in
   `public/`).
3. What you set in `slides.config.ts` (sdkKey, flag, brand, variations).
4. The routes: `/slides` (deck) and `/slides/adobe-comparison` (concept map).
5. That they can keep iterating — just ask to reword slides, add/remove content,
   or re-point config, and re-run `/add-slides` to pull a newer baseline.
