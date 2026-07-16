import { type ReactNode } from "react";

// Shared slide primitives used by both the Feature Experimentation and Web
// Experimentation tracks.

export function SlideHeader({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <div className="mb-6">
      <span className="inline-block rounded bg-opti-lime px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-opti-fir">
        {eyebrow}
      </span>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-opti-fir/60">{blurb}</p>
    </div>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((b, idx) => (
        <li
          key={idx}
          className="flex gap-3 text-sm leading-relaxed text-opti-fir/80"
        >
          <span className="mt-[6px] h-2.5 w-2.5 shrink-0 rounded-full bg-opti-lime ring-2 ring-opti-fir/15" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
