import { AppState, type TxKind } from "./store";
import { money } from "./types";

export interface DailyRule {
  color: "green" | "yellow" | "red";
  action: string;
  reason: string;
  priority: "low" | "medium" | "high";
}

/**
 * Calcula la "pista de despegue" (Runway) en días.
 * Indica cuánto tiempo puede operar el negocio con el efectivo actual.
 */
export function calculateRunway(state: AppState): number {
  const transactions = state.transactions;
  if (transactions.length === 0) return Infinity;

  const expenses = transactions.filter(t => t.kind === "expense");
  if (expenses.length === 0) return Infinity;

  // Calculamos la quema diaria promedio (Burn Rate)
  const totalExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
  const uniqueDays = new Set(expenses.map(t => t.day)).size || 1;
  const dailyBurn = totalExpense / uniqueDays;

  const balance = transactions.reduce((acc, tx) =>
    tx.kind === "income" ? acc + tx.amount : acc - tx.amount, 0
  );

  if (dailyBurn <= 0) return Infinity;
  return Math.floor(balance / dailyBurn);
}

/**
 * Prioriza las deudas según monto y urgencia.
 */
export function getPrioritizedDebtList(commitments: any[]) {
  return [...commitments].sort((a, b) => b.amount - a.amount);
}

export function generateDailyRule(state: AppState): DailyRule {
  const { transactions, commitments, pendingJobs } = state;

  const balance = transactions.reduce((acc, tx) =>
    tx.kind === "income" ? acc + tx.amount : acc - tx.amount, 0
  );

  const upcomingExpenses = commitments.reduce((acc, c) => acc + c.amount, 0);
  const runway = calculateRunway(state);
  const prioritizedDebts = getPrioritizedDebtList(commitments);

  // --- LÓGICA DE DECISIÓN AVANZADA ---

  // CASO ROJO: Runway crítico (< 3 días) o Saldo < Compromisos
  if (runway < 3 || balance < upcomingExpenses) {
    const urgency = runway < 1 || balance < 0 ? "high" : "medium";

    if (pendingJobs.length > 0) {
      const bestJob = pendingJobs.sort((a, b) => b.amount - a.amount)[0];
      return {
        color: "red",
        priority: urgency,
        reason: `Runway crítico: ${runway} días. Saldo (${money(balance)}) insuficiente para cubrir ${money(upcomingExpenses)}.`,
        action: `Acción Urgente: Cobrar el trabajo de ${bestJob.client || 'clientes'} (${money(bestJob.amount)}) para estabilizar la caja.`
      };
    }
    return {
      color: "red",
      priority: "high",
      reason: `SITUACIÓN CRÍTICA: Runway de ${runway} días. No hay trabajos pendientes por cobrar.`,
      action: "Alerta: Detener todo gasto no esencial inmediatamente."
    };
  }

  // CASO AMARILLO: Runway estable pero con potencial de mejora
  if (runway < 14) {
    return {
      color: "yellow",
      priority: "medium",
      reason: `Runway moderado: ${runway} días. Tienes ${money(balance)} disponibles.`,
      action: "Sugerencia: Empieza a gestionar los cobros pendientes para extender la pista a +30 días."
    };
  }

  // CASO VERDE: Salud financiera óptima
  return {
    color: "green",
    priority: "low",
    reason: `Salud financiera excelente. Runway: ${runway} días.`,
    action: "Decisión: Tienes margen para invertir en herramientas o mejoras del taller."
  };
}
