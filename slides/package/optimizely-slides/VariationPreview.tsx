"use client";

import { useState } from "react";
import { HERO_VARIATIONS } from "./slides-data";
import { slidesConfig } from "./slides.config";

const ACCENT = slidesConfig.brand.accent;

export function VariationPreview() {
  const [active, setActive] = useState(
    HERO_VARIATIONS.length > 1 ? 1 : 0, // default to a challenger for contrast
  );
  const v = HERO_VARIATIONS[active];

  return (
    <div className="flex flex-col gap-3">
      {/* Variation tabs */}
      <div className="flex flex-wrap gap-1.5">
        {HERO_VARIATIONS.map((variation, i) => (
          <button
            key={variation.key}
            onClick={() => setActive(i)}
            className={`rounded-full px-3 py-1.5 font-mono text-xs transition ${
              i === active
                ? "bg-opti-fir text-opti-cream"
                : "bg-opti-fir/10 text-opti-fir/60 hover:bg-opti-fir/20"
            }`}
          >
            {variation.label}
          </button>
        ))}
      </div>

      {/* Live hero preview — the flag's variations rendered by one code path */}
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 p-5 transition-colors duration-300"
        style={{ backgroundColor: v.bg_color }}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
          style={{ backgroundColor: `${ACCENT}4d` }}
        />
        <div key={v.key} className="opti-fade-in relative">
          <div className="mb-2 inline-block rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/70">
            live preview
          </div>
          <h3 className="text-xl font-bold leading-tight text-white">
            {v.headline}
          </h3>
          <p className="mt-1.5 text-sm text-white/70">{v.subtitle}</p>
          <button
            className="mt-3 rounded-full px-4 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            {v.cta_label}
          </button>
        </div>
      </div>

      {/* Variable values for the active variation */}
      <div className="rounded-xl border border-white/10 bg-[#0b0c10] p-3">
        <div className="mb-1.5 font-mono text-[11px] text-opti-cream/40">
          decision.variables
        </div>
        <dl className="space-y-1 font-mono text-xs">
          {[
            ["headline", v.headline],
            ["subtitle", v.subtitle],
            ["cta_label", v.cta_label],
            ["bg_color", v.bg_color],
          ].map(([k, val]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-sky-300">{k}:</dt>
              <dd className="truncate text-emerald-300">&quot;{val}&quot;</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
