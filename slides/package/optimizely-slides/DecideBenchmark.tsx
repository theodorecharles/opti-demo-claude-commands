"use client";

// Live benchmark for decide(). Runs for 5 seconds, taking one latency sample
// every 100ms (~50 samples), and averages them at the end. Decisions are
// computed locally against the in-memory datafile (audience eval + MurmurHash
// bucketing + variable resolution — no network), and decision events are
// disabled so hammering the SDK never touches your experiment results.
//
// A single decide() is faster than the browser's performance.now() resolution,
// so each 100ms sample times a short burst of calls and divides — that keeps
// each measurement above timer noise while still reading one decision's latency.
//
// The benchmark needs a live SDK client. If the host app wraps the deck in an
// <OptimizelyProvider>, it reuses that client; otherwise it lazily creates its
// own from slidesConfig.sdkKey. With no provider AND no sdkKey, it shows a hint.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useOptimizelyClient,
  OptimizelyDecideOption,
  createInstance,
  createPollingProjectConfigManager,
} from "@optimizely/react-sdk";
import type {
  OptimizelyUserContext,
  UserAttributes,
} from "@optimizely/optimizely-sdk";
import { slidesConfig } from "./slides.config";

const FLAG = slidesConfig.flagKey;
const BENCH_USER = "benchmark_user";
const BENCH_ATTRS = slidesConfig.benchAttributes;
const WARMUP = 3000;
const DURATION_MS = 5000;
const TICK_MS = 100;
const TOTAL_SAMPLES = DURATION_MS / TICK_MS; // 50
const BURST_TARGET_MS = 1; // each sample times ~1ms of calls, then divides
const NETWORK_MS = 50; // a conservative "fast" network round-trip, for contrast

type Status = "idle" | "running" | "done" | "error";

function mean(a: number[]): number {
  if (!a.length) return NaN;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

// Format a millisecond value — small enough to show sub-microsecond latencies.
function fmtMs(ms: number): string {
  if (!isFinite(ms)) return "—";
  if (ms >= 1) return ms.toFixed(2);
  if (ms >= 0.001) return ms.toFixed(5);
  return ms.toFixed(6);
}

function roundSig(n: number, sig = 2): number {
  if (n <= 0 || !isFinite(n)) return 0;
  const d = Math.floor(Math.log10(Math.abs(n))) + 1;
  const f = Math.pow(10, sig - d);
  return Math.round(n * f) / f;
}

function fmtX(n: number): string {
  const r = roundSig(n, 2);
  return Math.round(r).toLocaleString();
}

export function DecideBenchmark({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const providerClient = useOptimizelyClient();
  // A benchmark-only client, created lazily from slidesConfig.sdkKey when the
  // host app has no OptimizelyProvider. autoUpdate is off — we just need one
  // datafile fetch to decide against.
  const ownClientRef = useRef<ReturnType<typeof createInstance> | null>(null);
  const getClient = useCallback(() => {
    if (providerClient) return providerClient;
    if (ownClientRef.current) return ownClientRef.current;
    if (!slidesConfig.sdkKey || typeof window === "undefined") return null;
    ownClientRef.current = createInstance({
      projectConfigManager: createPollingProjectConfigManager({
        sdkKey: slidesConfig.sdkKey,
        autoUpdate: false,
      }),
    });
    return ownClientRef.current;
  }, [providerClient]);

  const [status, setStatus] = useState<Status>("idle");
  const [samples, setSamples] = useState<number[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const samplesRef = useRef<number[]>([]);
  const userRef = useRef<OptimizelyUserContext | null>(null);
  const burstRef = useRef<number>(500);
  const tickRef = useRef<number | null>(null);
  const runToken = useRef(0);

  const stop = useCallback(() => {
    if (tickRef.current != null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Stop any in-flight run when the modal closes; clean up on unmount. State is
  // reset by remounting (the parent passes a fresh key on each open), so this
  // effect only touches refs — no setState.
  useEffect(() => {
    if (!open) {
      runToken.current++;
      stop();
    }
  }, [open, stop]);
  useEffect(() => stop, [stop]);

  // Close on Escape and swallow deck-navigation keys while open, so arrow keys
  // don't page the slides behind the modal (capture phase pre-empts the deck).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const nav = ["Escape", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", " "];
      if (nav.includes(e.key)) {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const run = useCallback(async () => {
    const token = ++runToken.current;
    setStatus("running");
    setErrMsg(null);
    samplesRef.current = [];
    setSamples([]);
    try {
      const client = getClient();
      if (!client) {
        throw new Error(
          "Add your Feature Experimentation SDK key to slides.config.ts (sdkKey) to run the live benchmark.",
        );
      }
      await client.onReady();
      if (token !== runToken.current) return;

      const user = client.createUserContext(
        BENCH_USER,
        BENCH_ATTRS as UserAttributes,
      );
      if (!user) {
        throw new Error("Could not create a user context — is the SDK ready?");
      }
      userRef.current = user;
      const opts = [OptimizelyDecideOption.DISABLE_DECISION_EVENT];

      // Warm up the JIT + internal caches (untimed).
      for (let i = 0; i < WARMUP; i++) user.decide(FLAG, opts);

      // Calibrate: size each sample's burst to take ~1ms (above timer noise).
      const cal = 4000;
      const c0 = performance.now();
      for (let i = 0; i < cal; i++) user.decide(FLAG, opts);
      const avgEstMs = (performance.now() - c0) / cal;
      burstRef.current = Math.min(
        4000,
        Math.max(50, Math.round(BURST_TARGET_MS / Math.max(avgEstMs, 1e-6))),
      );
      if (token !== runToken.current) return;

      const tick = () => {
        const u = userRef.current;
        if (!u || token !== runToken.current) return stop();
        const burst = burstRef.current;
        const b0 = performance.now();
        for (let i = 0; i < burst; i++) u.decide(FLAG, opts);
        const perMs = (performance.now() - b0) / burst;

        samplesRef.current.push(perMs);
        setSamples(samplesRef.current.slice());

        if (samplesRef.current.length >= TOTAL_SAMPLES) {
          stop();
          setStatus("done");
        }
      };

      stop();
      tickRef.current = window.setInterval(tick, TICK_MS);
      tick(); // take the first sample immediately
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [getClient, stop]);

  // Auto-start as soon as the modal opens. Guarding on status (rather than a
  // one-shot ref) keeps this resilient to React's dev StrictMode double-invoke.
  // Deferred a frame so the modal paints before the warmup briefly blocks.
  useEffect(() => {
    if (!open || status !== "idle") return;
    const id = requestAnimationFrame(() => void run());
    return () => cancelAnimationFrame(id);
  }, [open, status, run]);

  if (!open || typeof document === "undefined") return null;

  const count = samples.length;
  const avgMs = mean(samples);
  const latestMs = samples[count - 1];
  const fastestMs = count ? Math.min(...samples) : NaN;
  const maxMs = count ? Math.max(...samples) : 1;
  const elapsedS = Math.min(DURATION_MS, count * TICK_MS) / 1000;
  const progress = (count / TOTAL_SAMPLES) * 100;
  const factor = avgMs > 0 ? NETWORK_MS / avgMs : 0;
  const localPct = avgMs
    ? Math.max(0.4, Math.min(100, (avgMs / NETWORK_MS) * 100))
    : 0;
  const started = status === "running" || status === "done";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-opti-fir/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Benchmark decide()"
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-opti-fir/15 bg-opti-cream p-6 text-opti-fir shadow-[0_16px_50px_-12px_rgba(8,37,26,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded bg-opti-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-opti-fir">
              Live benchmark
            </span>
            <h2 className="mt-2 text-xl font-bold">
              How fast is <span className="font-mono">decide()</span>?
            </h2>
            <p className="mt-1 text-sm text-opti-fir/60">
              Samples a real <span className="font-mono">decide()</span>{" "}
              latency every {TICK_MS}ms for {DURATION_MS / 1000}s, then averages.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-2 text-opti-fir/50 transition hover:bg-opti-fir/5 hover:text-opti-fir"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {status === "error" ? (
          <div className="mt-5 rounded-xl border border-opti-fir/15 bg-white px-4 py-3 text-sm text-opti-fir/70">
            {errMsg}
          </div>
        ) : (
          <>
            {/* run button */}
            <button
              onClick={run}
              disabled={status === "running"}
              className="mt-5 w-full rounded-full bg-opti-lime px-5 py-3 text-sm font-semibold text-opti-fir transition hover:brightness-95 disabled:opacity-60"
            >
              {status === "running"
                ? `Measuring… ${elapsedS.toFixed(1)}s`
                : status === "done"
                  ? "Run again"
                  : `Run ${DURATION_MS / 1000}-second benchmark`}
            </button>

            {/* live panel */}
            <div className="mt-5 rounded-2xl border border-opti-fir/10 bg-white p-5">
              {/* progress */}
              <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-opti-fir/10">
                <div
                  className="h-full rounded-full bg-opti-lime transition-[width] duration-100 ease-linear"
                  style={{ width: `${started ? progress : 0}%` }}
                />
              </div>

              {/* hero average */}
              <div className="text-center">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-opti-fir/40">
                  Average decision
                </div>
                <div
                  className={`mt-1 text-4xl font-bold tabular-nums ${
                    started ? "" : "text-opti-fir/25"
                  }`}
                >
                  {started ? fmtMs(avgMs) : "—"}{" "}
                  <span className="text-xl font-semibold text-opti-fir/50">ms</span>
                </div>

                {status === "done" && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-opti-fir px-4 py-1.5 text-sm font-bold text-opti-lime">
                    ≈ {fmtX(factor)}× faster than a {NETWORK_MS} ms network call
                  </div>
                )}

                <div className="mt-2 text-xs text-opti-fir/45">
                  {started
                    ? `Sample ${count}/${TOTAL_SAMPLES}` +
                      (isFinite(latestMs) ? ` · latest ${fmtMs(latestMs)} ms` : "") +
                      ` · ${elapsedS.toFixed(1)}s`
                    : `${TOTAL_SAMPLES} samples over ${DURATION_MS / 1000} seconds`}
                </div>
              </div>

              {/* live sparkline */}
              <div className="mt-4 flex h-12 items-end gap-[3px]">
                {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => {
                  const v = samples[i];
                  const filled = v != null;
                  const h = filled ? Math.max(12, (v / maxMs) * 100) : 8;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-[height] duration-100 ${
                        filled ? "bg-opti-lime" : "bg-opti-fir/10"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* comparison + footer, once complete */}
            {status === "done" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-opti-fir/10 bg-white p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-opti-fir/40">
                    vs. a network round-trip
                  </div>
                  <div className="space-y-2">
                    <Bar
                      label={`One network call (~${NETWORK_MS} ms)`}
                      pct={100}
                      time={`${NETWORK_MS} ms`}
                      tone="muted"
                    />
                    <Bar
                      label="One local decide()"
                      pct={localPct}
                      time={`${fmtMs(avgMs)} ms`}
                      tone="lime"
                    />
                  </div>
                  <p className="mt-3 text-sm text-opti-fir/70">
                    Averaged over{" "}
                    <span className="font-bold text-opti-fir">{count}</span>{" "}
                    samples, each decision resolves{" "}
                    <span className="font-bold text-opti-fir">
                      ≈ {fmtX(factor)}×
                    </span>{" "}
                    faster than a single {NETWORK_MS} ms network call.
                  </p>
                </div>

                <div className="text-xs text-opti-fir/45">
                  {count} samples · fastest {fmtMs(fastestMs)} ms · flag{" "}
                  <span className="font-mono">{FLAG}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Bar({
  label,
  pct,
  time,
  tone,
}: {
  label: string;
  pct: number;
  time: string;
  tone: "muted" | "lime";
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-opti-fir/70">{label}</span>
        <span className="font-mono font-semibold text-opti-fir">{time}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-opti-fir/10">
        <div
          className={`h-full rounded-full ${
            tone === "lime" ? "bg-opti-lime" : "bg-opti-fir/40"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
