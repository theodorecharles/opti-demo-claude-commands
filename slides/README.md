# Optimizely Slides

A reusable, interactive product deck you can drop into any React/Next.js demo.
Two tracks — **Feature Experimentation** and **Web Experimentation** — plus the
**Adobe Target → Optimizely** concept translation map, with the live `decide()`
benchmark, the hover-to-select Visual Editor mock, variation preview, decision
flow, and results chart.

This is the **source of truth**. Edit it here, push, and demos pick up the new
version on their next `/add-slides` (or `/update-demo-commands` to refresh the
local cache). Demos keep the snapshot they were built with until re-synced.

## What's in here

```
slides/
  VERSION                       # bumped when the package changes
  README.md                     # this file
  package/                      # the copy-in payload
    optimizely-slides/          # -> demo's src/optimizely-slides/
      Deck.tsx                  # track selector + FX deck shell
      WxSlides.tsx              # WX track slides
      AdobeComparison.tsx       # Adobe → Optimizely concept map
      DecideBenchmark.tsx       # live decide() latency benchmark
      VisualEditorPreview.tsx   # hover-to-select mock + Opal widget
      VariationPreview.tsx      # live hero variation preview
      DecisionFlow.tsx          # how decide() walks a ruleset
      ResultsChart.tsx          # faux experiment results
      CodeBlock.tsx             # syntax-highlighted code w/ ODP reveal
      SlideKit.tsx              # shared slide primitives
      OptimizelyLogo.tsx        # /optimizely-logo.svg wordmark
      PrintButton.tsx           # print-to-PDF for the comparison
      slides-data.ts            # all deck copy + code samples (config-driven)
      slides.config.ts          # <- the one file you tune per demo
      slides.css                # self-contained theme tokens + animations
      index.ts                  # barrel: { Deck, AdobeComparison, slidesConfig }
    app/slides/                 # -> demo's src/app/slides/ (route pages)
      page.tsx                  # /slides  -> <Deck/>
      adobe-comparison/page.tsx # /slides/adobe-comparison -> <AdobeComparison/>
    assets/                     # -> demo's public/
      optimizely-logo.svg
      opal-orb.png
```

## Design

- **Self-contained styling.** `slides.css` registers the Optimizely palette as
  Tailwind v4 theme tokens (`@theme`) and ships the deck's animation, so the
  deck looks right regardless of the host app's own theme. Import it once from
  the app's global stylesheet, after `@import "tailwindcss";`.
- **One config seam.** Everything demo-specific — SDK key, flag key, WX snippet
  id, brand for the Visual Editor mock, hero variations, nav destinations —
  lives in `slides.config.ts`. The rest of the package reads from it.
- **Benchmark is provider-optional.** If the host app wraps the deck in an
  `<OptimizelyProvider>`, the benchmark reuses that client. Otherwise it lazily
  creates its own from `slidesConfig.sdkKey`. With neither, it shows a hint.

## Requirements in the host app

- React 18/19 + Next.js App Router (Tailwind CSS v4).
- `@optimizely/react-sdk` (pulls in `@optimizely/optimizely-sdk`) — needed for
  the live benchmark. `/fx-demo` apps already have it.
- `optimizely-slides/` is dropped in as a sibling of the `app/` directory (both
  under `src/`, or both at the project root). The route pages use relative
  imports, so no `@/*` alias or `src/`-dir convention is required.

## Customizing per demo

Edit `slides.config.ts` in the demo. Common tweaks:

| Field | What it changes |
|-------|-----------------|
| `sdkKey` | Powers code samples + the live benchmark. |
| `flagKey` | The flag used in every `decide()` example + benchmark. |
| `wxSnippetId` | The `.../js/<id>.js` snippet shown in the WX track. |
| `homeHref` | Where "Back to the app" / Escape go. |
| `deckPath` | Route the deck is mounted at (match the `app/` folder). |
| `brand.*` | The Visual Editor mock — name, logo, accent, nav, catalog, host. |
| `heroVariations` | The "read variables" slide + live preview + mock control. |
| `benchAttributes` | Attributes the benchmark decides with. |

Beyond config, every slide's copy lives in `slides-data.ts` and every component
is plain editable source — tailor freely (add/remove slides, reword for the
prospect's industry). Just note that re-syncing overwrites component and data
files with the latest baseline; your `slides.config.ts` is preserved.

## Versioning

Bump `VERSION` on any change to `package/`. Demos record the version they were
built against so you can tell what's stale.
