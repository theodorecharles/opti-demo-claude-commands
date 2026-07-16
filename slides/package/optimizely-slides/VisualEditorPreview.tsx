"use client";

import { useState } from "react";
import { slidesConfig } from "./slides.config";

// A miniature of a homepage for the Web Experimentation "Visual Editor" slide.
// Hovering any element highlights it with a translucent blue overlay, a blue
// outline, and a label tab — mimicking Optimizely's Visual Editor element
// selection. Pure CSS hover; selectable elements are leaves (never nested), so
// only the element under the cursor lights up. A clickable Opal chat widget
// sits in the corner. All brand-specific content comes from slides.config.ts.

const BRAND = slidesConfig.brand;
const CONTROL =
  slidesConfig.heroVariations[0] ?? {
    headline: "Build better, ship faster.",
    subtitle: "Everything your team needs to launch and grow, in one place.",
    cta_label: "Get started",
  };

function OpalOrb({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/opal-orb.png" alt="Opal" className={className} />;
}

function Editable({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`group/el relative cursor-pointer rounded-[2px] outline outline-2 outline-transparent transition-[outline-color] duration-100 hover:z-10 hover:outline-[#2563eb] ${className}`}
    >
      {children}
      {/* Translucent blue selection overlay */}
      <span className="pointer-events-none absolute inset-0 rounded-[2px] bg-[#2563eb]/0 transition-colors duration-100 group-hover/el:bg-[#2563eb]/25" />
      {/* Element label tab */}
      <span className="pointer-events-none absolute left-0 top-0 z-20 hidden -translate-y-full whitespace-nowrap rounded-t-[3px] bg-[#2563eb] px-1.5 py-[1px] text-[9px] font-medium leading-tight text-white group-hover/el:block">
        {label}
      </span>
    </div>
  );
}

function MiniCard({
  name,
  price,
  tag,
}: {
  name: string;
  price: string;
  tag?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-black/10 bg-white">
      <div className="relative h-12 bg-gradient-to-br from-zinc-200 to-zinc-300">
        {tag && (
          <span className="absolute left-1 top-1 rounded bg-black/80 px-1 py-[1px] text-[7px] font-medium text-white">
            {tag}
          </span>
        )}
      </div>
      <div className="p-1.5">
        <div className="text-[8px] font-semibold leading-tight text-black">
          {name}
        </div>
        <div className="text-[8px] text-black/50">{price}</div>
      </div>
    </div>
  );
}

export function VisualEditorPreview() {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-xl border border-opti-fir/15 bg-white shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-opti-fir/10 bg-opti-fir/[0.03] px-3 py-1.5">
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
          <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
          <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
        </span>
        <span className="mx-auto rounded-full border border-opti-fir/10 bg-white px-3 py-0.5 text-[10px] text-opti-fir/40">
          {BRAND.siteHost}
        </span>
      </div>

      {/* Mini homepage */}
      <div className="bg-white">
        {/* Site header */}
        <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <Editable label="Logo">
              <span className="block text-[13px] font-bold tracking-tight text-black">
                {BRAND.logoText}
                <span style={{ color: BRAND.accent }}>✓</span>
              </span>
            </Editable>
            <div className="hidden gap-1 sm:flex">
              {BRAND.nav.map((n, i) => (
                <Editable key={n} label="Nav link">
                  <span
                    className={`block rounded-full px-2 py-0.5 text-[9px] ${
                      i === 0 ? "bg-black text-white" : "text-black/60"
                    }`}
                  >
                    {n}
                  </span>
                </Editable>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Editable label="Cart">
              <svg
                viewBox="0 0 24 24"
                className="block h-3.5 w-3.5 text-black/70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L22 7H6" />
              </svg>
            </Editable>
            <Editable label="Account">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ backgroundColor: BRAND.accent }}
              >
                {BRAND.userInitials}
              </span>
            </Editable>
          </div>
        </div>

        {/* Hero */}
        <div
          className="px-4 py-5 text-white"
          style={{ backgroundColor: BRAND.heroBg }}
        >
          <Editable label="Eyebrow" className="w-fit">
            <span className="block rounded-full border border-white/20 px-2 py-0.5 text-[8px] text-white/70">
              Welcome back, {BRAND.userName}
            </span>
          </Editable>
          <Editable label="Headline · h1" className="mt-2 w-fit">
            <div className="max-w-[16rem] text-[18px] font-bold leading-tight">
              {CONTROL.headline}
            </div>
          </Editable>
          <Editable label="Subtitle · p" className="mt-1.5 w-fit">
            <div className="max-w-[15rem] text-[10px] leading-snug text-white/70">
              {CONTROL.subtitle}
            </div>
          </Editable>
          <div className="mt-3 flex gap-2">
            <Editable label="CTA · button">
              <span
                className="block rounded-full px-3 py-1.5 text-[9px] font-semibold"
                style={{ backgroundColor: BRAND.accent }}
              >
                {CONTROL.cta_label}
              </span>
            </Editable>
            <Editable label="CTA · link">
              <span className="block rounded-full border border-white/30 px-3 py-1.5 text-[9px] font-semibold">
                Learn more
              </span>
            </Editable>
          </div>
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-4 gap-2 bg-[#f6f6f6] px-3 py-3">
          {BRAND.features.map(([t, d]) => (
            <Editable key={t} label="Promo">
              <div className="text-[9px] font-semibold text-black">{t}</div>
              <div className="text-[8px] text-black/50">{d}</div>
            </Editable>
          ))}
        </div>

        {/* Featured items */}
        <div className="px-3 pb-4 pt-3">
          <Editable label="Heading · h2" className="mb-2 w-fit">
            <div className="text-[11px] font-bold text-black">Featured</div>
          </Editable>
          <div className="grid grid-cols-3 gap-2">
            {BRAND.catalog.map((p) => (
              <Editable key={p.name} label="Product card">
                <MiniCard {...p} />
              </Editable>
            ))}
          </div>
        </div>
      </div>

      {/* Opal chat widget */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2">
        {chatOpen && (
          <div className="w-56 overflow-hidden rounded-xl border border-opti-fir/15 bg-white shadow-xl">
            <div className="flex items-center gap-1.5 bg-opti-fir px-3 py-2 text-opti-cream">
              <OpalOrb className="h-4 w-4 rounded-full" />
              <span className="text-xs font-bold">Opal</span>
              <span className="ml-auto text-[9px] text-opti-cream/50">
                AI assistant
              </span>
            </div>
            <div className="space-y-1.5 p-2.5">
              <div className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-opti-fir px-2 py-1 text-[10px] leading-snug text-opti-cream">
                Make the headline bigger and change the CTA to &ldquo;Start free
                trial.&rdquo;
              </div>
              <div className="w-fit max-w-[90%] rounded-lg rounded-bl-sm bg-opti-fir/[0.06] px-2 py-1 text-[10px] leading-snug text-opti-fir/80">
                Done — updated the hero headline and CTA. Preview the variation?
              </div>
            </div>
            <div className="flex items-center gap-1 border-t border-opti-fir/10 px-2.5 py-2">
              <span className="text-[10px] text-opti-fir/35">
                Ask Opal to change the page…
              </span>
              <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-opti-lime text-opti-fir">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen((o) => !o)}
          aria-label={chatOpen ? "Hide Opal" : "Ask Opal"}
          className="h-11 w-11 overflow-hidden rounded-full shadow-lg ring-2 ring-white/80 transition hover:scale-105 hover:brightness-105"
        >
          <OpalOrb className="h-full w-full object-cover" />
        </button>
      </div>
    </div>
  );
}
