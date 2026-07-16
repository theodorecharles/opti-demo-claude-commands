// Public entry point for the Optimizely Slides package.
//
//   import { Deck } from "@/optimizely-slides";
//   import { AdobeComparison } from "@/optimizely-slides";
//
// Everything demo-specific lives in ./slides.config.ts — start there.

export { Deck } from "./Deck";
export { AdobeComparison } from "./AdobeComparison";
export { slidesConfig } from "./slides.config";
export type { SlidesConfig, HeroVariation } from "./slides.config";
