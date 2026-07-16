"use client";

import { useState } from "react";

const KEYWORDS = new Set([
  "import", "from", "const", "let", "var", "function", "return", "if", "else",
  "new", "await", "async", "export", "default", "public", "class", "void",
  "final", "true", "false", "null", "def", "implementation", "docker", "run",
  "boolean", "String", "Map", "HashMap",
]);

const API = new Set([
  "createInstance", "createUserContext", "createPollingProjectConfigManager",
  "createBatchEventProcessor", "OptimizelyProvider", "OptimizelyFactory",
  "newDefaultInstance", "decide", "decideAll", "getVariables", "getValue",
  "getEnabled", "getVariationKey", "trackEvent", "useDecide",
  "useOptimizelyUserContext", "Optimizely", "OptimizelyUserContext",
  "OptimizelyDecision", "OptimizelyJSON", "onReady", "renderHero", "useCurl",
]);

const TOKEN =
  /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\/\/[^\n]*|#[^\n]*|<!--[\s\S]*?-->)|(-?\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

type Tok = { t: string; c: string };

function tokenize(code: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) out.push({ t: code.slice(last, m.index), c: "plain" });
    if (m[1]) out.push({ t: m[1], c: "string" });
    else if (m[2]) out.push({ t: m[2], c: "comment" });
    else if (m[3]) out.push({ t: m[3], c: "number" });
    else if (m[4]) {
      const c = KEYWORDS.has(m[4]) ? "keyword" : API.has(m[4]) ? "api" : "plain";
      out.push({ t: m[4], c });
    }
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push({ t: code.slice(last), c: "plain" });
  return out;
}

const CLS: Record<string, string> = {
  plain: "text-zinc-200",
  string: "text-emerald-300",
  comment: "text-zinc-500 italic",
  number: "text-orange-300",
  keyword: "text-pink-400",
  api: "text-sky-300",
};

export function CodeBlock({
  code,
  filename,
  reveal,
}: {
  code: string;
  filename?: string;
  // A trailing block rendered commented-out that "uncomments" on hover / click.
  reveal?: { commented: string; revealed: string };
}) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const active = hover || pinned;

  const toks = tokenize(code.trim());
  const odpToks = reveal
    ? tokenize((active ? reveal.revealed : reveal.commented).trim())
    : null;

  // Copying always yields the working (uncommented) version.
  const fullCode = [code.trim(), reveal?.revealed.trim()]
    .filter(Boolean)
    .join("\n\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0c10]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          {filename && (
            <span className="ml-3 font-mono text-xs text-white/40">
              {filename}
            </span>
          )}
        </div>
        <button
          onClick={copy}
          className="rounded-md px-2 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono">
          {toks.map((tk, i) => (
            <span key={i} className={CLS[tk.c]}>
              {tk.t}
            </span>
          ))}
          {odpToks && (
            <>
              {"\n\n"}
              <span
                role="button"
                tabIndex={0}
                aria-pressed={active}
                title={
                  active
                    ? "Real-time ODP segments enabled"
                    : "Hover to enable real-time ODP segments"
                }
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={() => setPinned((p) => !p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPinned((p) => !p);
                  }
                }}
                className={`box-decoration-clone cursor-pointer rounded-sm transition-colors ${
                  active
                    ? "bg-emerald-400/10"
                    : "bg-white/[0.05] hover:bg-white/[0.09]"
                }`}
              >
                {odpToks.map((tk, i) => (
                  <span key={i} className={CLS[tk.c]}>
                    {tk.t}
                  </span>
                ))}
              </span>
            </>
          )}
        </code>
      </pre>
      {reveal && (
        <div className="flex items-center gap-1.5 border-t border-white/10 px-4 py-1.5 text-[11px] text-white/40">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              active ? "bg-emerald-400" : "bg-white/30"
            }`}
          />
          {active
            ? "Real-time ODP segments enabled"
            : "Hover the highlighted block to enable real-time ODP segments"}
        </div>
      )}
    </div>
  );
}
