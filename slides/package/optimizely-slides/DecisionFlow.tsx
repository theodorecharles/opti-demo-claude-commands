// Visualizes how decide() walks a flag's ruleset in priority order. The example
// user fails an audience rule, then a percentage rollout, then gets bucketed by
// an A/B test — showing all three ways a user qualifies (or doesn't).

type Rule = {
  order: number;
  type: "Targeted delivery" | "A/B Test";
  gate: string;
  detail: string;
  pass: boolean;
  outcome: string;
};

const RULES: Rule[] = [
  {
    order: 1,
    type: "Targeted delivery",
    gate: "Audience: Gold members",
    detail: "100% included",
    pass: false,
    outcome: "user isn't Gold → audience miss, skip",
  },
  {
    order: 2,
    type: "Targeted delivery",
    gate: "Audience: Everyone",
    detail: "25% rollout",
    pass: false,
    outcome: "bucket 8,123 → outside 25%, skip",
  },
  {
    order: 3,
    type: "A/B Test",
    gate: "Audience: Everyone",
    detail: "50 / 50 split",
    pass: true,
    outcome: "bucket 3,488 → variation \"on\"",
  },
];

const GATES = [
  ["Audience", "who's eligible"],
  ["Percentage", "traffic by bucket"],
  ["A/B test", "split into variations"],
];

export function DecisionFlow() {
  return (
    <div className="rounded-2xl border border-opti-fir/15 bg-white p-4">
      <div className="mb-1 text-sm font-bold">
        How <span className="font-mono">decide()</span> resolves a flag
      </div>
      <p className="mb-3 text-xs text-opti-fir/55">
        Rules are checked top-down. A user qualifies — or not — by audience, by
        percentage, or by an A/B test bucket.
      </p>

      {/* gate legend */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {GATES.map(([g, d]) => (
          <span
            key={g}
            className="rounded-full bg-opti-fir/5 px-2.5 py-1 text-[11px] text-opti-fir/70"
          >
            <span className="font-semibold text-opti-fir">{g}</span> · {d}
          </span>
        ))}
      </div>

      {/* ruleset ladder */}
      <div className="space-y-2">
        {RULES.map((r) => (
          <div
            key={r.order}
            className={`rounded-xl border p-3 ${
              r.pass
                ? "border-opti-fir bg-opti-lime/20"
                : "border-opti-fir/10 bg-opti-fir/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-opti-fir/40">
                  #{r.order}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    r.type === "A/B Test"
                      ? "bg-opti-lime text-opti-fir"
                      : "bg-opti-fir/10 text-opti-fir"
                  }`}
                >
                  {r.type}
                </span>
                <span className="text-xs font-medium">{r.gate}</span>
              </div>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  r.pass
                    ? "bg-opti-fir text-opti-lime"
                    : "bg-opti-fir/10 text-opti-fir/40"
                }`}
              >
                {r.pass ? "✓" : "✕"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-opti-fir/55">
              <span>{r.detail}</span>
              <span className={r.pass ? "font-medium text-opti-fir" : ""}>
                {r.outcome}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* served result */}
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-opti-fir px-3 py-2 text-opti-cream">
        <span className="text-xs font-bold uppercase tracking-wide text-opti-lime">
          Served
        </span>
        <span className="font-mono text-xs">
          enabled: true · variationKey: &quot;on&quot;
        </span>
      </div>
    </div>
  );
}
