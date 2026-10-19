// Tipos del dominio. Se mantienen deliberadamente simples: el usuario objetivo
// (dueno de microempresa informal) no debe ver partida doble, solo señales.

export type TxKind = "income" | "expense";

export type TxSource = "audio" | "photo" | "manual";

/** Un movimiento reconocido a partir de lenguaje natural, foto o carga manual. */
export interface Tx {
  id: string;
  kind: TxKind;
  amount: number;
  category: string;
  counterparty?: string;
  rawText?: string;
  photoDataUrl?: string;
  source: TxSource;
  /** Dia local en formato YYYY-MM-DD. */
  day: string;
  createdAt: string;
  synced: boolean;
  syncedAt?: string;
  /** 0..1: que tan seguro esta el parser local. Bajo => pedir confirmacion. */
  confidence: number;
}

/** Compromiso fijo recurrente (renta, luz, nomina, proveedor). */
export interface Commitment {
  id: string;
  label: string;
  amount: number;
  /** 0 = domingo .. 6 = sabado. */
  dueWeekday: number;
  recurring: boolean;
}

/** Trabajo ya hecho pero aun no cobrado: la palanca real de liquidez de Marcos. */
export interface PendingJob {
  id: string;
  label: string;
  amount: number;
  client?: string;
}

export interface Settings {
  deviceId: string;
  /** Toggle de sincronizacion en la nube. Si no hay red, la app sigue igual. */
  cloudSyncEnabled: boolean;
  lastSyncAt?: string;
  businessName: string;
}

export interface ParsedEntry {
  kind: TxKind;
  amount: number;
  category: string;
  counterparty?: string;
  confidence: number;
  /** Texto original de la clausula que genero la entrada. */
  source: string;
  warnings: string[];
}

export const CATEGORIES: Record<TxKind, string[]> = {
  income: ["Servicio", "Venta de refaccion", "Anticipo", "Cobro de cliente", "Otro ingreso"],
  expense: [
    "Refacciones",
    "Herramienta",
    "Renta",
    "Servicios (luz/agua)",
    "Gasolina/transporte",
    "Nomina",
    "Proveedor",
    "Gasto personal",
    "Otro gasto"
  ]
};

export const money = (n: number): string =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(n) ? n : 0);

export const todayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
