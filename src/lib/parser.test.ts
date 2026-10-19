import { describe, expect, it } from "vitest";
import { parseAmountToken, parseDictado, wordsToNumber } from "./parser";

describe("wordsToNumber", () => {
  it("convierte numeros por extenso", () => {
    expect(wordsToNumber("ochocientos")).toBe(800);
    expect(wordsToNumber("mil doscientos")).toBe(1200);
    expect(wordsToNumber("dos mil")).toBe(2000);
    expect(wordsToNumber("mil doscientos cincuenta")).toBe(1250);
    expect(wordsToNumber("quinientos")).toBe(500);
  });
});

describe("parseAmountToken", () => {
  it("soporta separadores es-MX", () => {
    expect(parseAmountToken("1,200")).toBe(1200);
    expect(parseAmountToken("800.50")).toBe(800.5);
    expect(parseAmountToken("800,50")).toBe(800.5);
    expect(parseAmountToken("350")).toBe(350);
  });
});

describe("parseDictado", () => {
  it("parte una frase en ingreso y gasto", () => {
    const r = parseDictado("Le cobré $800 a Juan por el cambio de aceite y gasté $300 en refacciones");
    expect(r).toHaveLength(2);
    const ingreso = r.find((e) => e.kind === "income");
    const gasto = r.find((e) => e.kind === "expense");
    expect(ingreso?.amount).toBe(800);
    expect(ingreso?.counterparty).toBe("Juan");
    expect(ingreso?.category).toBe("Servicio");
    expect(gasto?.amount).toBe(300);
    expect(gasto?.category).toBe("Refacciones");
  });

  it("reconoce don/doña como cliente", () => {
    const r = parseDictado("Me pagó 1,200 don Pedro por la afinación, pero compré 450 de balatas");
    expect(r).toHaveLength(2);
    expect(r[0].kind).toBe("income");
    expect(r[0].counterparty).toBe("Pedro");
    expect(r[1].amount).toBe(450);
  });

  it("soporta montos por extenso", () => {
    const r = parseDictado("cobré dos mil pesos");
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(2000);
    expect(r[0].kind).toBe("income");
  });

  it("marca baja confianza cuando no hay verbo claro", () => {
    const r = parseDictado("300 de lo de ayer");
    expect(r).toHaveLength(1);
    expect(r[0].confidence).toBeLessThan(0.8);
    expect(r[0].warnings.length).toBeGreaterThan(0);
  });

  it("ignora texto vacío", () => {
    expect(parseDictado("")).toEqual([]);
    expect(parseDictado("hola")).toEqual([]);
  });

  it("no parte el monto 1,200 por la coma", () => {
    const r = parseDictado("me pagó 1,200 pesos");
    expect(r).toHaveLength(1);
    expect(r[0].amount).toBe(1200);
  });
});
