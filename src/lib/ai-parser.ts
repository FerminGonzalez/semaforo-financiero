// Orquestador de Parseo Inteligente.
// Conecta el parser rápido (RegEx) con la potencia de MiniCPM vía Ollama.

import { parseDictado, type ParsedEntry } from "./parser";
import { CATEGORIES, type TxKind } from "./types";

export interface AIParseResult extends ParsedEntry {
  method: "regex" | "ai";
  suggestion?: string;
}

export async function smartParse(input: string): Promise<AIParseResult[]> {
  const fastEntries = parseDictado(input);
  const highConfidenceEntries = fastEntries.filter(e => e.confidence >= 0.7);

  if (highConfidenceEntries.length === fastEntries.length && fastEntries.length > 0) {
    return fastEntries.map(e => ({ ...e, method: "regex" }));
  }

  try {
    const aiEntries = await callMiniCPM(input);
    return aiEntries;
  } catch (error) {
    console.error("Ollama connection failed, falling back to regex:", error);
    return fastEntries.map(e => ({ ...e, method: "regex" }));
  }
}

async function callMiniCPM(input: string): Promise<AIParseResult[]> {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "minicpm",
      prompt: `Actúa como un experto contador de talleres mecánicos.
      Analiza la siguiente frase y extrae los movimientos financieros.
      Frase: "${input}"

      Responde ÚNICAMENTE con un array JSON de objetos con este formato:
      [{"kind": "income"|"expense", "amount": number, "category": "string", "counterparty": "string|null", "confidence": number, "warnings": ["string"]}]

      Categorías permitidas: ${JSON.stringify(CATEGORIES)}.
      Si no hay montos claros, pon amount: 0 y un warning.`,
      stream: false,
      format: "json"
    })
  });

  if (!response.ok) throw new Error("Ollama response not OK");

  const data = await response.json();
  const parsed = JSON.parse(data.response);

  return (Array.isArray(parsed) ? parsed : [parsed]).map(e => ({
    ...e,
    source: input,
    method: "ai",
    suggestion: "Analizado por MiniCPM"
  }));
}
