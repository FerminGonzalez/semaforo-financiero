import type { HTMLAttributes, ReactNode } from "react";
import type { Status } from "../lib/insights";
export function Card({
  children,
  className = "",
  tone,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: Status;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${tone ? `card--${tone}` : ""} ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  kind
}: {
  label: string;
  value: string;
  hint?: string;
  kind?: "income" | "expense" | "neutral";
}) {
  return (
    <div className={`stat stat--${kind ?? "neutral"}`}>
      <span className="stat__label">{label}</span>
      <strong className="stat__value">{value}</strong>
      {hint ? <span className="stat__hint">{hint}</span> : null}
    </div>
  );
}

export function Bar({ value, tone }: { value: number; tone: Status }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="bar" role="img" aria-label={`${pct} por ciento`}>
      <span className={`bar__fill bar__fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  ...rest
}: { children: ReactNode; tone?: Status | "neutral" } & HTMLAttributes<HTMLElement>) {
  return (
    <span className={`pill pill--${tone}`} {...rest}>
      {children}
    </span>
  );
}
