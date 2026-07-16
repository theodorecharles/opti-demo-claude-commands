"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { SlideHeader, Bullets } from "./SlideKit";
import { CodeBlock } from "./CodeBlock";
import { ResultsChart } from "./ResultsChart";
import { VisualEditorPreview } from "./VisualEditorPreview";
import { slidesConfig } from "./slides.config";
import {
  WX_SNIPPET,
  WX_OVERVIEW_BULLETS,
  WX_SNIPPET_BULLETS,
  WX_FLOW,
  WX_EDGE_BULLETS,
  WX_COMPARE,
  WX_AUDIENCE_BULLETS,
  WX_AUDIENCE_CODE,
  WX_DOC_GROUPS,
} from "./slides-data";

export type WxSlideKind =
  | "overview"
  | "snippet"
  | "visual"
  | "edge"
  | "compare"
  | "audiences"
  | "results"
  | "resources";

export const WX_SLIDES: { kind: WxSlideKind; title: string }[] = [
  { kind: "overview", title: "Web Experimentation" },
  { kind: "snippet", title: "The snippet" },
  { kind: "visual", title: "Visual Editor" },
  { kind: "edge", title: "Edge delivery" },
  { kind: "compare", title: "Snippet vs. edge" },
  { kind: "audiences", title: "Audiences" },
  { kind: "results", title: "Results" },
  { kind: "resources", title: "Resources" },
];

function OverviewSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Web Experimentation"
        title="The visual, client-side way to test"
        blurb="Optimizely Web Experimentation runs A/B tests and personalization on your site from a single snippet — authored visually, delivered in the browser or at the edge."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Bullets items={WX_OVERVIEW_BULLETS} />
        <CodeBlock code={WX_SNIPPET} filename="index.html" />
      </div>
    </div>
  );
}

function SnippetSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Delivery"
        title="One snippet, applied in the browser"
        blurb="The snippet loads in your <head>, evaluates your experiments locally, and applies the winning variation as DOM changes — with an anti-flicker guard so visitors never see the original."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Bullets items={WX_SNIPPET_BULLETS} />
        <CodeBlock code={WX_SNIPPET} filename="index.html" />
      </div>

      {/* Render sequence */}
      <div className="mt-6 rounded-2xl border border-opti-fir/15 bg-white p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-opti-fir/40">
          How a variation renders, client-side
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          {WX_FLOW.map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div className="flex-1 rounded-xl border border-opti-fir/10 bg-opti-cream/50 p-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-opti-lime text-xs font-bold text-opti-fir">
                  {s.n}
                </div>
                <div className="mt-2 text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-opti-fir/55">{s.detail}</div>
              </div>
              {i < WX_FLOW.length - 1 && (
                <span className="hidden shrink-0 text-opti-fir/30 sm:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisualSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Authoring"
        title="Change anything, without code"
        blurb="The Visual Editor lets marketers build variations by pointing and clicking on the live page. Hover any element in the preview to select it — exactly like the editor."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_1.25fr] lg:items-start">
        <Bullets
          items={[
            "Point-and-click to edit text, restyle, move, hide, or rearrange any element on the page.",
            "No code required — the editor writes the DOM changes for you. Drop into custom CSS/JS anytime.",
            "Or just describe it to Opal — the AI Variation Development Agent builds and applies the change from plain language.",
            "Each variation is a set of changes applied to the live page.",
            "Preview any variation, then publish — no redeploy.",
          ]}
        />
        <div>
          <VisualEditorPreview />
          <p className="mt-2 text-center text-xs text-opti-fir/45">
            Hover an element to select it — or ask{" "}
            <span className="font-semibold text-opti-fir">Opal</span>{" "}
            (bottom-right) to make the change for you.
          </p>
        </div>
      </div>
    </div>
  );
}

function Sparkle({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.6 6.8L20 10l-6.4 1.2L12 18l-1.6-6.8L4 10l6.4-1.2z" />
    </svg>
  );
}

function EdgeNode({
  title,
  sub,
  icon,
  highlight,
}: {
  title: string;
  sub: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex-1 rounded-xl border p-4 text-center ${
        highlight
          ? "border-2 border-opti-fir bg-opti-lime/15"
          : "border border-opti-fir/15 bg-opti-cream/40"
      }`}
    >
      <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-opti-fir text-opti-lime">
        {icon}
      </div>
      <div className="text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-xs text-opti-fir/55">{sub}</div>
    </div>
  );
}

function EdgeArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1 py-1">
      <span className="rotate-90 text-lg leading-none text-opti-fir/30 sm:rotate-0">
        →
      </span>
      <span className="mt-0.5 whitespace-nowrap text-[10px] text-opti-fir/40">
        {label}
      </span>
    </div>
  );
}

function EdgeDiagram() {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <div className="rounded-2xl border border-opti-fir/15 bg-white p-5">
      {/* Optimizely config feeds the worker */}
      <div className="flex flex-col items-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-opti-fir/20 bg-opti-lime/15 px-3 py-1 text-xs font-semibold text-opti-fir">
          <Sparkle /> Optimizely · audiences · variations
        </div>
        <span className="my-1 leading-none text-opti-fir/30">↓</span>
      </div>

      {/* Request pipeline */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <EdgeNode
          title="Visitor"
          sub="Requests the page"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          }
        />
        <EdgeArrow label="request" />
        <EdgeNode
          highlight
          title="Cloudflare edge worker"
          sub="Decides the variation, rewrites the HTML in-flight"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
              <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 18 18z" />
            </svg>
          }
        />
        <EdgeArrow label="fetch origin" />
        <EdgeNode
          title="Origin app"
          sub="Your app — base HTML"
          icon={
            <svg viewBox="0 0 24 24" className="h-4 w-4" {...stroke}>
              <rect x="4" y="4" width="16" height="6" rx="1.5" />
              <rect x="4" y="14" width="16" height="6" rx="1.5" />
              <path d="M7.5 7h.01M7.5 17h.01" />
            </svg>
          }
        />
      </div>

      {/* Return path */}
      <div className="mt-4 flex flex-col items-start gap-2 rounded-xl bg-opti-fir px-4 py-3 text-opti-cream sm:flex-row sm:items-center">
        <span className="shrink-0 rounded bg-opti-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-opti-fir">
          Returns
        </span>
        <span className="text-sm">
          Fully-rendered HTML with the variation baked in —{" "}
          <span className="font-semibold text-opti-lime">zero flicker</span>, no
          render-blocking snippet.
        </span>
      </div>
    </div>
  );
}

function EdgeSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Delivery · snippetless"
        title="Run experiments at the edge"
        blurb="Move the decision upstream: a CDN edge worker decides the variation and rewrites the HTML before it reaches the browser. Zero flicker, no render-blocking snippet, fully server-rendered."
      />
      <EdgeDiagram />
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Bullets items={WX_EDGE_BULLETS} />
        <div className="rounded-xl border border-opti-fir/10 bg-opti-sage px-4 py-3 text-sm leading-relaxed text-opti-fir/70">
          <span className="font-semibold text-opti-fir">Cloudflare</span>{" "}
          is Optimizely&apos;s officially-supported Edge Delivery runtime{" "}
          (<span className="font-mono">@optimizely/edge-delivery</span>). The
          same decision-at-the-edge pattern also runs on Akamai EdgeWorkers or
          Vercel Edge.
        </div>
      </div>
    </div>
  );
}

function CompareSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Delivery"
        title="Snippet vs. edge"
        blurb="Both run the same experiments, audiences, and Stats Engine. The difference is where the decision happens — and what that means for flicker, speed, and SEO."
      />
      <div className="overflow-hidden rounded-2xl border border-opti-fir/15 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(120px,0.8fr)_1.1fr_1.1fr]">
          <div className="hidden bg-opti-fir/[0.03] px-4 py-3 sm:block" />
          <div className="hidden items-center border-l border-opti-fir/10 bg-opti-fir/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-wide text-opti-fir/60 sm:flex">
            JS snippet · client-side
          </div>
          <div className="hidden items-center gap-2 border-l border-opti-fir/10 bg-opti-lime/20 px-4 py-3 text-xs font-bold uppercase tracking-wide text-opti-fir sm:flex">
            Edge delivery
          </div>
          {WX_COMPARE.map((row) => (
            <div key={row.dim} className="contents">
              <div className="border-t border-opti-fir/10 px-4 py-3 text-sm font-semibold sm:flex sm:items-center">
                {row.dim}
              </div>
              <div className="border-t border-opti-fir/10 px-4 pb-3 text-sm text-opti-fir/60 sm:border-l sm:py-3">
                <span className="mr-1 font-semibold text-opti-fir/70 sm:hidden">
                  Snippet:
                </span>
                {row.snippet}
              </div>
              <div className="border-t border-opti-fir/10 bg-opti-lime/[0.06] px-4 pb-3 pt-2 text-sm text-opti-fir/80 sm:border-l sm:py-3">
                <span className="mr-1 font-semibold text-opti-fir sm:hidden">
                  Edge:
                </span>
                {row.edge}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AudiencesSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Targeting"
        title="Audiences & targeting"
        blurb="Decide who sees an experiment with no-code conditions, custom JavaScript, or real-time ODP segments — the same audiences you use in Feature Experimentation."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Bullets items={WX_AUDIENCE_BULLETS} />
        <CodeBlock code={WX_AUDIENCE_CODE} filename="audience.js" />
      </div>
    </div>
  );
}

function ResultsSlide() {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Measurement"
        title="One Stats Engine, shared results"
        blurb="Web and Feature Experimentation report through the same sequential Stats Engine — always-valid results you can read the moment data flows, with false-discovery-rate control."
      />
      <ResultsChart />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

function ResourcesSlide({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Resources"
        title="Supporting material"
        blurb="The Web Experimentation docs behind this track — the snippet, the Visual Editor, edge delivery on Cloudflare, and how it maps from Adobe Target."
      />

      <Link
        href={`${slidesConfig.deckPath}/adobe-comparison`}
        className="group mb-8 flex flex-col gap-4 rounded-2xl border-2 border-opti-fir bg-opti-lime/15 p-5 transition hover:bg-opti-lime/25 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <span className="rounded bg-opti-fir px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-opti-lime">
            Migrating from Adobe?
          </span>
          <div className="mt-2 text-lg font-bold">
            Adobe Target → Optimizely: concept translation map
          </div>
          <p className="mt-1 max-w-2xl text-sm text-opti-fir/70">
            Every Adobe Target concept mapped to Optimizely — activities,
            audiences, delivery, edge, stats — across five sections.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-opti-fir px-5 py-3 text-sm font-semibold text-opti-cream transition group-hover:brightness-110 sm:self-auto">
          Open comparison
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 transition group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {WX_DOC_GROUPS.map((g) => (
          <div
            key={g.group}
            className="rounded-2xl border border-opti-fir/15 bg-white p-4"
          >
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-opti-fir/40">
              {g.group}
            </div>
            <ul className="space-y-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-2 rounded-lg px-2 py-2 transition hover:bg-opti-fir/[0.04]"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-opti-fir group-hover:underline">
                        {l.label}
                      </span>
                      <span className="block text-xs text-opti-fir/50">
                        {l.sub}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 text-opti-fir/30 transition group-hover:text-opti-fir">
                      <ArrowIcon />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={slidesConfig.homeHref}
          className="rounded-full bg-opti-lime px-6 py-3 text-sm font-semibold text-opti-fir transition hover:brightness-95"
        >
          Back to the app
        </Link>
        <button
          onClick={onRestart}
          className="rounded-full border border-opti-fir/20 px-6 py-3 text-sm font-semibold transition hover:bg-opti-fir/5"
        >
          Restart track
        </button>
      </div>
    </div>
  );
}

export function WxSlide({
  kind,
  onRestart,
}: {
  kind: WxSlideKind;
  onRestart: () => void;
}) {
  switch (kind) {
    case "overview":
      return <OverviewSlide />;
    case "snippet":
      return <SnippetSlide />;
    case "visual":
      return <VisualSlide />;
    case "edge":
      return <EdgeSlide />;
    case "compare":
      return <CompareSlide />;
    case "audiences":
      return <AudiencesSlide />;
    case "results":
      return <ResultsSlide />;
    case "resources":
      return <ResourcesSlide onRestart={onRestart} />;
  }
}
