// Traduce los movimientos a decisiones. Aqui es donde el "dato que un experto
// entiende y Marcos no" se convierte en semaforo + una regla de decision.

import type { Commitment, PendingJob, Tx } from "./types";
import { money } from "./types";

export type Status = "green" | "amber" | "red";

export interface UpcomingCommitment extends Commitment {
  daysAhead: number;
  dateLabel: string;
}

export interface JargonRow {
  term: string;
  value: string;
  plain: string;
}

export interface Insights {
  day: { income: number; expense: number; net: number; count: number };
  month: { income: number; expense: number; net: number };
  cashAvailable: number;
  receivable: number;
  upcoming: UpcomingCommitment[];
  upcomingTotal: number;
  deficit: number;
  status: Status;
  statusLabel: string;
  burnRate: number | null;
  headline: string;
  flowAlert: string;
  suggestedAction: string;
  actionBecause: string;
  tomorrowRule: string;
  jargon: JargonRow[];
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfMonth = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

export function nextOccurrence(today: Date, weekday: number): { daysAhead: number; date: Date } {
  const diff = (weekday - today.getDay() + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return { daysAhead: diff, date };
}

export interface BuildInsightsInput {
  transactions: Tx[];
  commitments: Commitment[];
  pendingJobs: PendingJob[];
  now?: Date;
  /** Horizonte en dias para el semaforo de flujo. */
  horizonDays?: number;
}

export function buildInsights(input: BuildInsightsInput): Insights {
  const now = input.now ?? new Date();
  const horizon = input.horizonDays ?? 5;
  const todayStr = dayKey(now);
  const monthStart = startOfMonth(now);

  const todayTx = input.transactions.filter((t) => t.day === todayStr);
  const monthTx = input.transactions.filter((t) => t.day >= monthStart && t.day <= todayStr);

  const incomeOf = (list: Tx[]) => list.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expenseOf = (list: Tx[]) => list.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);

  const dayIncome = incomeOf(todayTx);
  const dayExpense = expenseOf(todayTx);
  const monthIncome = incomeOf(monthTx);
  const monthExpense = expenseOf(monthTx);

  const cashAvailable = incomeOf(input.transactions) - expenseOf(input.transactions);
  const receivable = input.pendingJobs.reduce((s, j) => s + j.amount, 0);

  const upcoming: UpcomingCommitment[] = input.commitments
    .map((c) => {
      const { daysAhead, date } = nextOccurrence(now, c.dueWeekday);
      return {
        ...c,
        daysAhead,
        dateLabel: `${WEEKDAYS[c.dueWeekday]} ${date.getDate()}`
      };
    })
    .filter((c) => c.daysAhead <= horizon)
    .sort((a, b) => a.daysAhead - b.daysAhead);

  const upcomingTotal = upcoming.reduce((s, c) => s + c.amount, 0);
  const deficit = upcomingTotal - cashAvailable;

  let status: Status;
  let statusLabel: string;
  if (upcomingTotal === 0) {
    status = dayIncome - dayExpense >= 0 ? "green" : "amber";
    statusLabel = status === "green" ? "Vas bien" : "Cuidado con hoy";
  } else if (cashAvailable >= upcomingTotal) {
    status = "green";
    statusLabel = "Puedes pagar lo que viene";
  } else if (cashAvailable >= upcomingTotal * 0.75) {
    status = "amber";
    statusLabel = "Ajustado";
  } else {
    status = "red";
    statusLabel = "Riesgo de no llegar";
  }

  const burnRate = dayIncome > 0 ? dayExpense / dayIncome : null;

  const headline =
    cashAvailable >= 0
      ? `Te quedan ${money(cashAvailable)} libres de verdad`
      : `Vas ${money(Math.abs(cashAvailable))} abajo`;

  let flowAlert: string;
  if (upcoming.length === 0) {
    flowAlert = `No tienes pagos fijos en los próximos ${horizon} días. Buen momento para adelantar trabajo.`;
  } else {
    const next = upcoming[0];
    flowAlert =
      `Tienes ${money(cashAvailable)} libres, pero debes pagar ${money(next.amount)} de ${next.label} ` +
      `el ${next.dateLabel}.` +
      (upcoming.length > 1
        ? ` Y en total se vienen ${money(upcomingTotal)} en ${upcoming.length} compromisos.`
        : "");
  }

  let suggestedAction: string;
  let actionBecause: string;
  if (deficit > 0 && input.pendingJobs.length > 0) {
    const job = [...input.pendingJobs].sort((a, b) => b.amount - a.amount)[0];
    const who = job.client ? ` de ${job.client}` : "";
    const need = Math.min(job.amount, deficit);
    suggestedAction = `Cobra hoy el anticipo de ${money(need)} de ${job.label}${who}.`;
    actionBecause = `Con eso cubres ${money(need)} de los ${money(deficit)} que te faltan para tus pagos fijos.`;
  } else if (deficit > 0) {
    suggestedAction = `Frena compras de inventario hasta cubrir ${money(deficit)}.`;
    actionBecause = `No tienes trabajos por cobrar registrados, así que el ajuste tiene que salir de frenar la salida de dinero.`;
  } else if (upcomingTotal > 0) {
    const margen = cashAvailable - upcomingTotal;
    suggestedAction = `Puedes reponer refacciones hasta ${money(Math.max(0, Math.floor(margen)))} sin comprometer tus pagos.`;
    actionBecause = `Después de apartar ${money(upcomingTotal)} para tus compromisos fijos, te queda ese margen.`;
  } else {
    suggestedAction = `Registra tus pagos fijos (renta, luz) para que pueda avisarte a tiempo.`;
    actionBecause = `Sin compromisos fijos no puedo medir tu riesgo de quedarte sin liquidez.`;
  }

  let tomorrowRule: string;
  if (status === "red") {
    tomorrowRule = `Mañana NO compres inventario. Primero cobra${input.pendingJobs.length ? ` los ${input.pendingJobs.length} trabajos pendientes (${money(receivable)})` : " lo que tengas pendiente"} y paga ${upcoming[0] ? upcoming[0].label : "tus fijos"}.`;
  } else if (status === "amber") {
    tomorrowRule = `Mañana compra solo lo indispensable. Antes de surtir refacciones, cobra al menos ${money(Math.max(0, Math.ceil(deficit)))}.`;
  } else {
    tomorrowRule = `Mañana sí puedes surtir, pero no pases de ${money(Math.max(0, Math.floor(cashAvailable - upcomingTotal)))} para no tocar el dinero de tus pagos.`;
  }

  const directCost = monthTx
    .filter((t) => t.kind === "expense" && ["Refacciones", "Herramienta", "Proveedor"].includes(t.category))
    .reduce((s, t) => s + t.amount, 0);
  const opex = monthExpense - directCost;
  const grossProfit = monthIncome - directCost;
  const ebitda = grossProfit - opex;
  const currentAssets = cashAvailable + receivable;
  const currentLiabilities = input.commitments.reduce((s, c) => s + c.amount, 0) || upcomingTotal;
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
  const dailyBurn = (() => {
    const days = new Set(monthTx.filter((t) => t.kind === "expense").map((t) => t.day)).size || 1;
    return monthExpense / days;
  })();

  const jargon: JargonRow[] = [
    {
      term: "Utilidad bruta",
      value: money(grossProfit),
      plain: "Lo que te quedó después de pagar solo lo que va en cada trabajo (refacciones, herramienta)."
    },
    {
      term: "EBITDA",
      value: money(ebitda),
      plain: "Tu ganancia real del mes, ya descontando renta, luz, gasolina y sueldos."
    },
    {
      term: "Flujo de efectivo operativo",
      value: money(monthIncome - monthExpense),
      plain: "El dinero que de verdad entró menos el que de verdad salió. Esto es lo que pagas con la mano."
    },
    {
      term: "Activo corriente",
      value: money(currentAssets),
      plain: "Lo que tienes disponible hoy: efectivo en caja más lo que te deben."
    },
    {
      term: "Pasivo corriente",
      value: money(currentLiabilities),
      plain: "Lo que tienes que pagar en el corto plazo: renta, luz, proveedores."
    },
    {
      term: "Capital de trabajo",
      value: money(workingCapital),
      plain: "Lo que sobra de tu dinero disponible después de apartar lo que debes. Si es negativo, estás en riesgo."
    },
    {
      term: "Razón circulante",
      value: currentRatio.toFixed(2),
      plain: "Cuántos pesos tienes por cada peso que debes. Arriba de 1 es sano; abajo de 1 aprieta."
    },
    {
      term: "Quema diaria",
      value: money(dailyBurn),
      plain: "Lo que gastas en promedio cada día que abres el taller."
    }
  ];

  return {
    day: { income: dayIncome, expense: dayExpense, net: dayIncome - dayExpense, count: todayTx.length },
    month: { income: monthIncome, expense: monthExpense, net: monthIncome - monthExpense },
    cashAvailable,
    receivable,
    upcoming,
    upcomingTotal,
    deficit,
    status,
    statusLabel,
    burnRate,
    headline,
    flowAlert,
    suggestedAction,
    actionBecause,
    tomorrowRule,
    jargon
  };
}
