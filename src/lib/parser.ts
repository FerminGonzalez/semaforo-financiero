// Parser local de "jerga de taller" -> movimientos.
// Corre 100% en el dispositivo (sin red) a proposito: el taller de Marcos tiene
// senal intermitente y el requisito de la pista 03 es baja friccion/offline.
//
// No pretende ser un contador. Pretende tomar una frase como
//   "le cobre 800 a Juan por el cambio de aceite y gaste 300 en refacciones"
// y devolver dos movimientos listos para confirmar (no para escribir).

import { CATEGORIES, type ParsedEntry, type TxKind } from "./types";

const strip = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const WORD_UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900
};

/** Convierte "mil doscientos" -> 1200, "ochocientos" -> 800. Devuelve null si no aplica. */
export function wordsToNumber(text: string): number | null {
  const tokens = strip(text).replace(/\s+/g, " ").trim().split(" ");
  let total = 0;
  let current = 0;
  let matched = false;
  for (const t of tokens) {
    if (t === "mil") {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
      matched = true;
      continue;
    }
    if (t === "millon" || t === "millones") {
      current = (current || 1) * 1_000_000;
      total += current;
      current = 0;
      matched = true;
      continue;
    }
    const v = WORD_UNITS[t];
    if (v === undefined) {
      if (matched) break;
      continue;
    }
    // "doscientos cincuenta": 200 + 50. "veinticinco": ya es atomo.
    if (v >= 100 && current < 100) current += v;
    else if (v < 100 && current % 100 === 0) current += v;
    else if (v < 100) current += v;
    else current += v;
    matched = true;
  }
  total += current;
  return matched && total > 0 ? total : null;
}

/** Resuelve "1,200" / "1.200" / "800.50" / "$350" -> number. */
export function parseAmountToken(raw: string): number {
  let s = raw.replace(/\s|\$|mxn|pesos|peso|varos|bolas|lana/gi, "").trim();
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && !hasDot) {
    const parts = s.split(",");
    // 1,200 => miles ; 800,50 => decimal
    if (parts.length === 2 && parts[1].length === 3) s = parts.join("");
    else s = parts.join(".");
  } else if (hasDot && !hasComma) {
    // es-MX usa punto decimal; pero "1.200" escrito como miles se tolera
    if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", "");
  } else if (hasComma && hasDot) {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const INCOME_SIGNALS = [
  "me pago", "me pagaron", "pagaron", "cobre", "cobro", "cobranza", "recibi",
  "ingreso", "ingrese", "entro", "entre", "vendi", "venta", "anticipo", "abono",
  "depositaron", "facture", "le cobre", "quedo de pagar"
];
const EXPENSE_SIGNALS = [
  "gaste", "gasto", "gastamos", "compre", "compra", "pague", "pago a", "inverti",
  "refaccion", "refacciones", "repuesto", "repuestos", "herramienta", "llanta",
  "aceite", "filtro", "balata", "renta", "luz", "agua", "gas", "gasolina",
  "nomina", "proveedor", "flete", "deuda", "abone", "saque", "personal"
];

const CATEGORY_HINTS: Array<{ test: RegExp; kind: TxKind; category: string }> = [
  { test: /\b(aceite|filtro|balata|bujia|llanta|refaccion|refacciones|repuesto|repuestos|banda|amortiguador)\b/, kind: "expense", category: "Refacciones" },
  { test: /\b(herramienta|llave|compresor|gato|taladro|desarmador)\b/, kind: "expense", category: "Herramienta" },
  { test: /\b(renta|local|arrendamiento)\b/, kind: "expense", category: "Renta" },
  { test: /\b(luz|agua|internet|cfe|telefono|gas)\b/, kind: "expense", category: "Servicios (luz/agua)" },
  { test: /\b(gasolina|diesel|combustible|flete|pasaje|transporte)\b/, kind: "expense", category: "Gasolina/transporte" },
  { test: /\b(nomina|empleado|ayudante|sueldo|chalán|chalan)\b/, kind: "expense", category: "Nomina" },
  { test: /\b(proveedor|casa de refacciones|mayorista)\b/, kind: "expense", category: "Proveedor" },
  { test: /\b(despensa|casa|personal|super|escuela|remedio|doctor)\b/, kind: "expense", category: "Gasto personal" },
  { test: /\b(cambio de aceite|afinacion|servicio|reparacion|reparacion|mano de obra)\b/, kind: "income", category: "Servicio" },
  { test: /\b(anticipo|adelanto)\b/, kind: "income", category: "Anticipo" },
  { test: /\b(venta|vendi)\b/, kind: "income", category: "Venta de refaccion" }
];

// Ojo: no partir en la coma/punto de "1,200" ni "1.200" (sin espacio despues).
const CLAUSE_SPLIT = /\s+(?:y|e|tambien|ademas|luego|despues|pero|mientras|aparte)\s+|[;\n]|[.,](?=\s)/gi;

export interface ParseOptions {
  /** Fecha local a la que pertenece el dictado (YYYY-MM-DD). */
  day?: string;
}

function detectKind(clause: string): { kind: TxKind; explicit: boolean } {
  const c = strip(clause);
  const income = INCOME_SIGNALS.some((s) => c.includes(s));
  const expense = EXPENSE_SIGNALS.some((s) => c.includes(s));
  if (income && !expense) return { kind: "income", explicit: true };
  if (expense && !income) return { kind: "expense", explicit: true };
  if (income && expense) {
    // "le cobre ... y gaste ..." ya se partio; si llegamos aqui, gana el verbo
    // mas cercano al inicio de la clausula.
    const iIdx = Math.min(...INCOME_SIGNALS.filter((s) => c.includes(s)).map((s) => c.indexOf(s)));
    const eIdx = Math.min(...EXPENSE_SIGNALS.filter((s) => c.includes(s)).map((s) => c.indexOf(s)));
    return { kind: iIdx <= eIdx ? "income" : "expense", explicit: true };
  }
  return { kind: "expense", explicit: false };
}

function detectCounterparty(originalClause: string): string | undefined {
  const NAME = "([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)";
  const m =
    originalClause.match(new RegExp(`(?:\\ba\\b|\\bde\\b|\\bdel\\b|\\bpara\\b|\\bcon\\b)\\s+(?:don\\s+|do[nñ]a\\s+)?${NAME}`)) ??
    originalClause.match(new RegExp(`(?:\\bdon\\b|\\bdo[nñ]a)\\s+${NAME}`));
  if (!m) return undefined;
  const name = m[1].trim();
  // Evita capturar inicios de frase comunes que no son personas.
  if (/^(el|la|los|las|un|una|mi|su|aceite|refaccion|cambio|renta)$/i.test(name)) return undefined;
  return name;
}

function detectCategory(clause: string, kind: TxKind): string | undefined {
  const c = strip(clause);
  for (const h of CATEGORY_HINTS) {
    if (h.test.test(c) && h.kind === kind) return h.category;
  }
  for (const h of CATEGORY_HINTS) {
    if (h.test.test(c)) return h.category;
  }
  return undefined;
}

function findAmount(clause: string): { amount: number; hadSymbol: boolean } | null {
  const symbolMatch = clause.match(/\$\s*([\d.,]+)/);
  if (symbolMatch) {
    const n = parseAmountToken(symbolMatch[1]);
    if (Number.isFinite(n) && n > 0) return { amount: n, hadSymbol: true };
  }
  const digitMatch = clause.match(/(\d[\d.,]*)/);
  if (digitMatch) {
    const n = parseAmountToken(digitMatch[1]);
    if (Number.isFinite(n) && n > 0) return { amount: n, hadSymbol: false };
  }
  const wordMatch = clause.match(
    /\b((?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieci\w+|veinti\w+|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|millon|millones)(?:\s+(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil))*)\b/i
  );
  if (wordMatch) {
    const n = wordsToNumber(wordMatch[1]);
    if (n && n > 0) return { amount: n, hadSymbol: false };
  }
  return null;
}

/** Divide un dictado en entradas confirmables. Texto vacio o sin monto => []. */
export function parseDictado(input: string, _opts: ParseOptions = {}): ParsedEntry[] {
  const text = (input || "").trim();
  if (!text) return [];

  const clauses = text
    .split(CLAUSE_SPLIT)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const entries: ParsedEntry[] = [];
  for (const clause of clauses) {
    const found = findAmount(clause);
    if (!found) continue;

    const { kind, explicit } = detectKind(clause);
    const category = detectCategory(clause, kind) ?? (kind === "income" ? "Otro ingreso" : "Otro gasto");
    const counterparty = detectCounterparty(clause);

    const warnings: string[] = [];
    let confidence = 0.45;
    if (explicit) confidence += 0.3;
    else warnings.push("No estoy segura si fue ingreso o gasto. Confirma con un toque.");
    if (found.hadSymbol) confidence += 0.1;
    if (detectCategory(clause, kind)) confidence += 0.1;
    if (counterparty) confidence += 0.05;
    // Monto sospechosamente bajo (probable numero de ticket, no dinero).
    if (found.amount < 5) {
      confidence -= 0.25;
      warnings.push("El monto es muy bajo. Revisa si es dinero o un numero de ticket.");
    }

    const knownCategories = CATEGORIES[kind];
    entries.push({
      kind,
      amount: found.amount,
      category: knownCategories.includes(category) ? category : knownCategories[knownCategories.length - 1],
      counterparty,
      confidence: Math.max(0.1, Math.min(1, Number(confidence.toFixed(2)))),
      source: clause,
      warnings
    });
  }
  return entries;
}

/** Frases de ejemplo para el modo demo / sin microfono (taller con mala senal). */
export const DEMO_PHRASES = [
  "Le cobré $800 a Juan por el cambio de aceite y gasté $300 en refacciones",
  "Me pagó 1,200 don Pedro por la afinación, pero compré 450 de balatas",
  "Compré $600 de herramienta y cobré 350 de una afinación",
];
