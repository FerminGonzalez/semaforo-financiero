import { describe, expect, it } from "vitest";
import { buildInsights, type BuildInsightsInput } from "./insights";
import { todayKey, type Commitment, type PendingJob, type Tx } from "./types";

const t = (id: string, offset: number, kind: Tx["kind"], amount: number, category = "Servicio"): Tx => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return {
    id,
    kind,
    amount,
    category,
    source: "audio",
    day: todayKey(d),
    createdAt: d.toISOString(),
    synced: false,
    confidence: 0.9
  };
};

const base: BuildInsightsInput = {
  transactions: [
    t("a", 0, "income", 800),
    t("b", 0, "expense", 300, "Refacciones"),
    t("c", -1, "income", 1200)
  ],
  commitments: [],
  pendingJobs: []
};

describe("buildInsights", () => {
  it("suma el dia y calcula efectivo disponible", () => {
    const r = buildInsights(base);
    expect(r.day.income).toBe(800);
    expect(r.day.expense).toBe(300);
    expect(r.cashAvailable).toBe(1700);
  });

  it("marca rojo cuando el efectivo no cubre los compromisos de la semana", () => {
    const c: Commitment = { id: "c1", label: "Renta", amount: 5000, dueWeekday: (new Date().getDay() + 2) % 7, recurring: true };
    const r = buildInsights({ ...base, commitments: [c] });
    expect(r.status).toBe("red");
    expect(r.deficit).toBeGreaterThan(0);
    expect(r.tomorrowRule).toMatch(/cobra/i);
  });

  it("sugiere cobrar un trabajo pendiente cuando hay deficit", () => {
    const c: Commitment = { id: "c1", label: "Renta", amount: 5000, dueWeekday: (new Date().getDay() + 1) % 7, recurring: true };
    const jobs: PendingJob[] = [{ id: "j1", label: "Reparación de motor", client: "don Pedro", amount: 600 }];
    const r = buildInsights({ ...base, commitments: [c], pendingJobs: jobs });
    expect(r.status).toBe("red");
    expect(r.suggestedAction).toMatch(/Cobra hoy/i);
  });

  it("mide el quemado de margen por refacciones", () => {
    const r = buildInsights({ ...base, transactions: [t("x", 0, "income", 1000), t("y", 0, "expense", 700, "Refacciones")] });
    expect(r.burnRate).toBeCloseTo(0.7);
  });

  it("genera traduccion de jerga contable", () => {
    const r = buildInsights(base);
    expect(r.jargon.find((j) => j.term === "EBITDA")).toBeDefined();
    expect(r.jargon.find((j) => j.term === "Razón circulante")).toBeDefined();
  });
});
