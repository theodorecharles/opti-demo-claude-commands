"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OptimizelyLogo } from "./OptimizelyLogo";
import { CodeBlock } from "./CodeBlock";
import { VariationPreview } from "./VariationPreview";
import { DecisionFlow } from "./DecisionFlow";
import { ResultsChart } from "./ResultsChart";
import { DecideBenchmark } from "./DecideBenchmark";
import { SlideHeader, Bullets } from "./SlideKit";
import { WxSlide, WX_SLIDES, type WxSlideKind } from "./WxSlides";
import { slidesConfig } from "./slides.config";
import {
  LANGS,
  STEPS,
  DATAFILE,
  WX_SNIPPET,
  FX_SNIPPET,
  type Lang,
  type StepKey,
} from "./slides-data";

type Slide =
  | { kind: "resources"; title: string }
  | { kind: "datafile"; title: string }
  | { kind: "decide"; title: string }
  | { kind: "track"; steps: [StepKey, StepKey]; title: string; blurb: string }
  | { kind: "code"; step: StepKey; title: string }
  | { kind: "code2"; steps: [StepKey, StepKey]; title: string; blurb: string }
  | { kind: "variables"; step: "variables"; title: string }
  | { kind: "wx"; wx: WxSlideKind; title: string };

type Track = "fx" | "wx";

const FX_SLIDES: Slide[] = [
  {
    kind: "code2",
    steps: ["install", "initialize"],
    title: "Install & initialize",
    blurb:
      "Add the client as a dependency, then create it with your environment's SDK key. It fetches the datafile and polls for changes, so updates land within a couple of minutes — no redeploy.",
  },
  { kind: "datafile", title: DATAFILE.title },
  { kind: "code", step: "userContext", title: STEPS.userContext.title },
  { kind: "decide", title: STEPS.decide.title },
  { kind: "variables", step: "variables", title: STEPS.variables.title },
  {
    kind: "track",
    steps: ["trackBasic", "trackTags"],
    title: "Track events",
    blurb:
      "Tracking ties behavior back to experiments. Send an event for the user's variation; attach tags for richer metrics — revenue (integer cents) and value (float) are reserved.",
  },
  { kind: "resources", title: "Resources" },
];

const WX_DECK: Slide[] = WX_SLIDES.map((s) => ({
  kind: "wx",
  wx: s.kind,
  title: s.title,
}));

const DECKS: Record<Track, { eyebrow: string; slides: Slide[] }> = {
  fx: {
    eyebrow: "Feature Experimentation · how the SDK works",
    slides: FX_SLIDES,
  },
  wx: {
    eyebrow: "Web Experimentation · snippet & edge delivery",
    slides: WX_DECK,
  },
};

export function Deck() {
  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [selected, setSelected] = useState<Track>("fx");
  const [i, setI] = useState(0);
  const [lang, setLang] = useState<Lang>("node");

  useEffect(() => {
    const savedLang = localStorage.getItem("opti_slides_lang") as Lang | null;
    if (savedLang && LANGS.some((l) => l.id === savedLang)) setLang(savedLang);
  }, []);

  const pickLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("opti_slides_lang", l);
    } catch {}
  };

  const slides = track ? DECKS[track].slides : [];

  // On the selector, Next enters the selected track; inside a track it advances.
  const next = useCallback(() => {
    if (!track) {
      setTrack(selected);
      setI(0);
      return;
    }
    setI((v) => Math.min(v + 1, slides.length - 1));
  }, [track, selected, slides.length]);

  // Prev at the first slide of a track drops back to the selector.
  const prev = useCallback(() => {
    if (!track) return;
    if (i === 0) {
      setTrack(null);
      return;
    }
    setI((v) => Math.max(v - 1, 0));
  }, [track, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(slidesConfig.homeHref);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  const slide = track ? slides[Math.min(i, slides.length - 1)] : null;
  const showLang =
    !!slide &&
    (slide.kind === "code" ||
      slide.kind === "code2" ||
      slide.kind === "decide" ||
      slide.kind === "track" ||
      slide.kind === "variables");

  return (
    <div className="flex h-screen flex-col bg-opti-cream text-opti-fir">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-opti-fir/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <OptimizelyLogo className="h-6 w-auto" />
          <span className="hidden text-xs text-opti-fir/40 md:inline">
            {track ? DECKS[track].eyebrow : "Choose a track"}
          </span>
          {track && (
            <button
              onClick={() => setTrack(null)}
              className="rounded-full border border-opti-fir/15 px-2.5 py-1 text-[11px] font-medium text-opti-fir/60 transition hover:border-opti-fir/40 hover:text-opti-fir"
            >
              ⇄ Tracks
            </button>
          )}
        </div>
        {showLang ? (
          <div className="flex gap-1 rounded-full bg-opti-fir/5 p-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => pickLang(l.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  lang === l.id
                    ? "bg-opti-fir text-opti-cream"
                    : "text-opti-fir/60 hover:text-opti-fir"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <Link
          href={slidesConfig.homeHref}
          className="rounded-full p-2 text-opti-fir/50 transition hover:bg-opti-fir/5 hover:text-opti-fir"
          aria-label="Close presentation"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
      </header>

      {/* Slide body */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          {!track && (
            <ArchitectureSelect selected={selected} onSelect={setSelected} />
          )}
          {slide && (
            <>
              {slide.kind === "code" && (
                <CodeSlide step={slide.step} lang={lang} />
              )}
              {slide.kind === "code2" && (
                <Code2Slide
                  steps={slide.steps}
                  title={slide.title}
                  blurb={slide.blurb}
                  lang={lang}
                />
              )}
              {slide.kind === "datafile" && <DatafileSlide />}
              {slide.kind === "decide" && <DecideSlide lang={lang} />}
              {slide.kind === "track" && (
                <TrackSlide
                  steps={slide.steps}
                  title={slide.title}
                  blurb={slide.blurb}
                  lang={lang}
                />
              )}
              {slide.kind === "variables" && <VariablesSlide lang={lang} />}
              {slide.kind === "resources" && (
                <ResourcesSlide onRestart={() => setI(0)} />
              )}
              {slide.kind === "wx" && (
                <WxSlide kind={slide.wx} onRestart={() => setI(0)} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom nav */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-opti-fir/10 px-5 py-3">
        <button
          onClick={prev}
          disabled={!track}
          className="rounded-full border border-opti-fir/20 px-4 py-2 text-sm transition hover:bg-opti-fir/5 disabled:opacity-30"
        >
          ← Prev
        </button>

        <div className="flex items-center gap-2">
          {track ? (
            <>
              {slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setI(idx)}
                  title={s.title}
                  className={`h-2 rounded-full transition-all ${
                    idx === i
                      ? "w-6 bg-opti-fir"
                      : "w-2 bg-opti-fir/20 hover:bg-opti-fir/40"
                  }`}
                />
              ))}
              <span className="ml-3 font-mono text-xs text-opti-fir/40">
                {i + 1} / {slides.length}
              </span>
            </>
          ) : (
            <span className="text-xs text-opti-fir/50">
              Select a track, then press Next →
            </span>
          )}
        </div>

        <button
          onClick={next}
          disabled={!!track && i === slides.length - 1}
          className="rounded-full bg-opti-lime px-4 py-2 text-sm font-semibold text-opti-fir transition hover:brightness-95 disabled:opacity-30"
        >
          Next →
        </button>
      </footer>
    </div>
  );
}

// Turns a given phrase inside a bullet into a link that opens the live decide()
// benchmark. Data stays the single source of truth in slides-data; the
// interactivity is injected here in the view.
function benchmarkBullet(
  text: string,
  phrase: string,
  onBenchmark: () => void,
): ReactNode {
  const at = text.indexOf(phrase);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <button
        type="button"
        onClick={(e) => {
          e.currentTarget.blur();
          onBenchmark();
        }}
        className="group/bench inline font-semibold text-opti-fir underline decoration-opti-lime decoration-2 underline-offset-[3px] transition hover:decoration-opti-fir"
      >
        {phrase}
        <svg
          viewBox="0 0 24 24"
          className="ml-0.5 inline h-3.5 w-3.5 align-[-0.1em] text-opti-fir/50 transition group-hover/bench:text-opti-fir"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M7 17L17 7M9 7h8v8" />
        </svg>
      </button>
      {text.slice(at + phrase.length)}
    </>
  );
}

function TrackCard({
  id,
  selected,
  onSelect,
  title,
  sub,
  bullets,
  code,
  file,
}: {
  id: Track;
  selected: boolean;
  onSelect: (t: Track) => void;
  title: string;
  sub: string;
  bullets: string[];
  code: string;
  file: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
      className={`flex cursor-pointer flex-col rounded-2xl border-2 p-5 transition ${
        selected
          ? "border-opti-fir bg-opti-lime/15 shadow-sm"
          : "border-opti-fir/15 bg-white hover:border-opti-fir/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="text-sm text-opti-fir/50">{sub}</div>
        </div>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            selected
              ? "border-opti-fir bg-opti-fir text-opti-lime"
              : "border-opti-fir/25 text-transparent"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
      </div>
      <ul className="my-4 space-y-1.5 text-sm text-opti-fir/70">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <div className="mt-auto">
        <CodeBlock code={code} filename={file} />
      </div>
    </div>
  );
}

function ArchitectureSelect({
  selected,
  onSelect,
}: {
  selected: Track;
  onSelect: (t: Track) => void;
}) {
  return (
    <div className="opti-fade-in">
      <SlideHeader
        eyebrow="Choose a track"
        title="Two ways to experiment"
        blurb="Optimizely gives you two complementary products. Click a track to select it, then press Next to walk through how it's built."
      />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TrackCard
          id="wx"
          selected={selected === "wx"}
          onSelect={onSelect}
          title="Web Experimentation (WX)"
          sub="Client-side · visual · snippet & edge"
          bullets={[
            "One JavaScript snippet in your page's <head>",
            "Changes authored in a visual editor — little/no code",
            "Applied as DOM mutations, or server-rendered at the CDN edge",
            "Great for marketers iterating on web pages",
          ]}
          code={WX_SNIPPET}
          file="index.html"
        />
        <TrackCard
          id="fx"
          selected={selected === "fx"}
          onSelect={onSelect}
          title="Feature Experimentation (FX)"
          sub="Code-based · omnichannel · SDK-driven"
          bullets={[
            "SDKs for every stack (web, server, mobile, OTT) + REST Agent",
            "Flags & experiments evaluated in code with decide()",
            "Decouples deploy from release: toggle, % rollout, target",
            "Consistent bucketing by user ID across every surface",
          ]}
          code={FX_SNIPPET}
          file="app.js"
        />
      </div>
      <div className="mt-5 rounded-xl border border-opti-fir/10 bg-opti-sage px-4 py-3 text-sm text-opti-fir/70">
        Run <span className="font-semibold text-opti-fir">both together</span> —
        Feature Experimentation in your app code (web, server, mobile) and Web
        Experimentation from a snippet or the CDN edge — sharing the same
        audiences, metrics, and Stats Engine.
      </div>
    </div>
  );
}

function CodeSlide({ step, lang }: { step: StepKey; lang: Lang }) {
  const s = STEPS[step];
  const file = LANGS.find((l) => l.id === lang)!.file;
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Implementation" title={s.title} blurb={s.blurb} />
      {s.bullets ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <Bullets items={s.bullets} />
          <CodeBlock code={s.code[lang]} filename={file} reveal={s.odp?.[lang]} />
        </div>
      ) : (
        <CodeBlock code={s.code[lang]} filename={file} reveal={s.odp?.[lang]} />
      )}
    </div>
  );
}

function Code2Slide({
  steps,
  title,
  blurb,
  lang,
}: {
  steps: [StepKey, StepKey];
  title: string;
  blurb: string;
  lang: Lang;
}) {
  const file = LANGS.find((l) => l.id === lang)!.file;
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Implementation" title={title} blurb={blurb} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {steps.map((step) => (
          <div key={step}>
            <div className="mb-2 text-sm font-semibold text-opti-fir/80">
              {STEPS[step].title}
            </div>
            <CodeBlock code={STEPS[step].code[lang]} filename={file} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DatafileSlide() {
  const [benchOpen, setBenchOpen] = useState(false);
  // Bump the key on each open so the benchmark modal remounts with fresh state.
  const [benchKey, setBenchKey] = useState(0);
  const openBench = () => {
    setBenchKey((k) => k + 1);
    setBenchOpen(true);
  };
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Concept" title={DATAFILE.title} blurb={DATAFILE.blurb} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Bullets
          items={DATAFILE.bullets.map((b) =>
            benchmarkBullet(b, "no per-decision network call", openBench),
          )}
        />
        <CodeBlock code={DATAFILE.code} filename="datafile.json" />
      </div>
      <DecideBenchmark
        key={benchKey}
        open={benchOpen}
        onClose={() => setBenchOpen(false)}
      />
    </div>
  );
}

function DecideSlide({ lang }: { lang: Lang }) {
  const s = STEPS.decide;
  const file = LANGS.find((l) => l.id === lang)!.file;
  const [benchOpen, setBenchOpen] = useState(false);
  const [benchKey, setBenchKey] = useState(0);
  const openBench = () => {
    setBenchKey((k) => k + 1);
    setBenchOpen(true);
  };
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Implementation" title={s.title} blurb={s.blurb} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <CodeBlock code={s.code[lang]} filename={file} />
          {s.bullets && (
            <Bullets
              items={s.bullets.map((b) =>
                benchmarkBullet(b, "no network request, sub-millisecond", openBench),
              )}
            />
          )}
        </div>
        <DecisionFlow />
      </div>
      <DecideBenchmark
        key={benchKey}
        open={benchOpen}
        onClose={() => setBenchOpen(false)}
      />
    </div>
  );
}

function TrackSlide({
  steps,
  title,
  blurb,
  lang,
}: {
  steps: [StepKey, StepKey];
  title: string;
  blurb: string;
  lang: Lang;
}) {
  const file = LANGS.find((l) => l.id === lang)!.file;
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Implementation" title={title} blurb={blurb} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {steps.map((step) => (
          <div key={step}>
            <div className="mb-2 text-sm font-semibold text-opti-fir/80">
              {STEPS[step].title}
            </div>
            <CodeBlock code={STEPS[step].code[lang]} filename={file} />
          </div>
        ))}
      </div>
      <div className="mt-5">
        <ResultsChart />
      </div>
    </div>
  );
}

function VariablesSlide({ lang }: { lang: Lang }) {
  const s = STEPS.variables;
  const file = LANGS.find((l) => l.id === lang)!.file;
  return (
    <div className="opti-fade-in">
      <SlideHeader eyebrow="Implementation" title={s.title} blurb={s.blurb} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CodeBlock code={s.code[lang]} filename={file} />
        <VariationPreview />
      </div>
    </div>
  );
}

// Grouped links out to the Optimizely developer docs. URLs verified to resolve
// on docs.developers.optimizely.com (Feature Experimentation section).
const DOC_GROUPS: {
  group: string;
  links: { label: string; href: string; sub: string }[];
}[] = [
  {
    group: "Get started",
    links: [
      {
        label: "Feature Experimentation — Welcome",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/welcome",
        sub: "Product overview & core concepts",
      },
      {
        label: "Quickstart guides",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/quickstarts",
        sub: "Your first flag in minutes",
      },
      {
        label: "SDK reference guides",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/sdk-reference-guides",
        sub: "Every supported language",
      },
    ],
  },
  {
    group: "SDKs used in this demo",
    links: [
      {
        label: "JavaScript SDK (v6+)",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-sdk",
        sub: "Node.js & browser",
      },
      {
        label: "React SDK",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/javascript-react-sdk",
        sub: "Hooks: useDecide, provider",
      },
      {
        label: "Java SDK",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/java-sdk",
        sub: "JVM services",
      },
      {
        label: "Optimizely Agent (REST)",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/optimizely-agent",
        sub: "SDK behind a REST API",
      },
    ],
  },
  {
    group: "Core APIs & concepts",
    links: [
      {
        label: "Make decisions — decide()",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/decide-methods-for-the-javascript-sdk",
        sub: "Flag evaluation in code",
      },
      {
        label: "Create a user context",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/optimizelyusercontext-for-the-javascript-sdk",
        sub: "User ID + attributes",
      },
      {
        label: "Track events",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/track-events",
        sub: "Conversions & metrics",
      },
      {
        label: "The datafile",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/manage-config-datafile",
        sub: "How decisions stay local",
      },
      {
        label: "Real-time segments (ODP)",
        href: "https://docs.developers.optimizely.com/feature-experimentation/docs/advanced-audience-targeting",
        sub: "fetchQualifiedSegments()",
      },
    ],
  },
];

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
        blurb="Everything you need to keep going — the Optimizely developer docs behind this demo, plus a side-by-side look at how Adobe Target maps to Optimizely Feature Experimentation."
      />

      {/* Adobe → Optimizely comparison CTA */}
      <Link
        href={`${slidesConfig.deckPath}/adobe-comparison`}
        className="group mb-8 flex flex-col gap-4 rounded-2xl border-2 border-opti-fir bg-opti-lime/15 p-5 transition hover:bg-opti-lime/25 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-opti-fir px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-opti-lime">
              Migrating from Adobe?
            </span>
          </div>
          <div className="mt-2 text-lg font-bold">
            Adobe Target → Optimizely: deep feature comparison
          </div>
          <p className="mt-1 max-w-2xl text-sm text-opti-fir/70">
            A concept map that shows what&apos;s what on each platform —
            activities, experiences, audiences, delivery, stats — plus a
            feature-by-feature breakdown.
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

      {/* Documentation links */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {DOC_GROUPS.map((g) => (
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

      {/* Footer actions */}
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
          Restart deck
        </button>
      </div>
    </div>
  );
}
