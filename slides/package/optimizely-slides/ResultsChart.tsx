// A faux experiment-results chart: conversion rate over time for two
// variations, with the treatment pulling ahead and winning.

import { slidesConfig } from "./slides.config";

// Label the winning line after a challenger variation from config.
const WINNER =
  slidesConfig.heroVariations[1]?.key ??
  slidesConfig.heroVariations[0]?.key ??
  "treatment";

const CONTROL = [3.0, 3.1, 2.9, 3.2, 3.1, 3.0, 3.2, 3.1, 3.3, 3.2, 3.1, 3.2, 3.3, 3.2];
const VARIATION = [3.0, 3.1, 3.2, 3.3, 3.5, 3.4, 3.6, 3.7, 3.6, 3.8, 3.9, 3.85, 4.0, 4.05];

const W = 1100;
const H = 200;
const PAD = { l: 44, r: 18, t: 14, b: 26 };
const Y_MIN = 2.6;
const Y_MAX = 4.3;
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

const x = (i: number, n: number) => PAD.l + (i / (n - 1)) * plotW;
const y = (v: number) => PAD.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

const points = (data: number[]) =>
  data.map((v, i) => `${x(i, data.length)},${y(v)}`).join(" ");

const areaPath = (data: number[]) => {
  const top = data.map((v, i) => `${x(i, data.length)},${y(v)}`).join(" L ");
  return `M ${PAD.l},${PAD.t + plotH} L ${top} L ${x(data.length - 1, data.length)},${PAD.t + plotH} Z`;
};

const yTicks = [3.0, 3.5, 4.0];

export function ResultsChart() {
  return (
    <div className="rounded-2xl border border-opti-fir/15 bg-opti-fir p-4 text-opti-cream">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold">
            Experiment results — purchase_completed
          </div>
          <div className="text-xs text-opti-cream/50">
            Conversion rate over 14 days
          </div>
        </div>
        <span className="rounded-full bg-opti-lime px-3 py-1 text-xs font-bold text-opti-fir">
          Winner +26% · 97% significance
        </span>
      </div>

      {/* legend */}
      <div className="mb-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-opti-cream/40" /> Control
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-opti-lime" /> Variation ·{" "}
          {WINNER}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Conversion rate over time">
        {/* gridlines + y labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 8}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-opti-cream/40"
              fontSize="11"
            >
              {t.toFixed(1)}%
            </text>
          </g>
        ))}
        {/* x labels */}
        {[0, 4, 8, 13].map((i) => (
          <text
            key={i}
            x={x(i, CONTROL.length)}
            y={H - 8}
            textAnchor="middle"
            className="fill-opti-cream/40"
            fontSize="11"
          >
            Day {i + 1}
          </text>
        ))}

        {/* variation area + lines */}
        <path d={areaPath(VARIATION)} fill="#abff44" fillOpacity="0.12" />
        <polyline
          points={points(CONTROL)}
          fill="none"
          stroke="#eff6e9"
          strokeOpacity="0.45"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={points(VARIATION)}
          fill="none"
          stroke="#abff44"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* end dots */}
        <circle cx={x(CONTROL.length - 1, CONTROL.length)} cy={y(CONTROL[CONTROL.length - 1])} r="4" fill="#eff6e9" fillOpacity="0.6" />
        <circle cx={x(VARIATION.length - 1, VARIATION.length)} cy={y(VARIATION[VARIATION.length - 1])} r="5" fill="#abff44" />
      </svg>
    </div>
  );
}
