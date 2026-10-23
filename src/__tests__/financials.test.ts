import { describe, it, expect } from "vitest";
import { generateDailyRule } from "../lib/decisions";
import { store, AppState } from "../lib/store";

describe("Financial Decision Engine", () => {
  const mockState = (overrides: Partial<AppState>): AppState => ({
    transactions: [],
    commitments: [],
    pendingJobs: [],
    settings: { deviceId: "test", cloudSyncEnabled: false, businessName: "Test Lab" },
    ...overrides,
  });

  it("should signal RED when balance is less than upcoming commitments", () => {
    const state = mockState({
      transactions: [{ id: "1", kind: "income", amount: 100, category: "S", day: "2026-10-23", createdAt: "", synced: false, confidence: 1, source: "manual" }],
      commitments: [{ id: "c1", label: "Renta", amount: 500, dueWeekday: 1, recurring: true }],
    });
    const rule = generateDailyRule(state);
    expect(rule.color).toBe("red");
    expect(rule.action).toContain("Prioridad Máxima");
  });

  it("should signal GREEN when balance comfortably covers commitments", () => {
    const state = mockState({
      transactions: [{ id: "1", kind: "income", amount: 2000, category: "S", day: "2026-10-23", createdAt: "", synced: false, confidence: 1, source: "manual" }],
      commitments: [{ id: "c1", label: "Luz", amount: 100, dueWeekday: 1, recurring: true }],
    });
    const rule = generateDailyRule(state);
    expect(rule.color).toBe("green");
  });

  it("should signal YELLOW when balance is positive but low compared to potential income", () => {
    const state = mockState({
      transactions: [{ id: "1", kind: "income", amount: 200, category: "S", day: "2026-10-23", createdAt: "", synced: false, confidence: 1, source: "manual" }],
      pendingJobs: [{ id: "j1", label: "Motor", amount: 1000, client: "Juan" }],
    });
    const rule = generateDailyRule(state);
    expect(rule.color).toBe("yellow");
    expect(rule.action).toContain("recordatorios de pago");
  });

  it("should prioritize the highest debt in red status", () => {
    const state = mockState({
      transactions: [{ id: "1", kind: "income", amount: 100, category: "S", day: "2026-10-23", createdAt: "", synced: false, confidence: 1, source: "manual" }],
      commitments: [
        { id: "c1", label: "Luz", amount: 50, dueWeekday: 1, recurring: true },
        { id: "c2", label: "Sueldos", amount: 1000, dueWeekday: 1, recurring: true },
      ],
    });
    const rule = generateDailyRule(state);
    expect(rule.color).toBe("red");
    expect(rule.reason).toContain("Sueldos");
  });
});
