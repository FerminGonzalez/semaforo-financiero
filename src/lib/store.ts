// Store local-first. Toda la experiencia funciona leyendo/escribiendo aqui;
// la nube es opcional y nunca bloquea la captura (senal intermitente en el taller).

import { useSyncExternalStore } from "react";
import type { Commitment, PendingJob, Settings, Tx, TxKind } from "./types";
import { todayKey } from "./types";

export interface AppState {
  transactions: Tx[];
  commitments: Commitment[];
  pendingJobs: PendingJob[];
  settings: Settings;
}

const KEY = "smf.state.v1";

const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Semilla realista para demostrar el recorrido sin capturar 20 datos a mano. */
export function createInitialState(now: Date = new Date()): AppState {
  const deviceId = uid();
  const mk = (
    offset: number,
    kind: TxKind,
    amount: number,
    category: string,
    counterparty?: string,
    rawText?: string
  ): Tx => ({
    id: uid(),
    kind,
    amount,
    category,
    counterparty,
    rawText,
    source: "audio",
    day: todayKey(addDays(now, offset)),
    createdAt: addDays(now, offset).toISOString(),
    synced: false,
    confidence: 0.9
  });

  const transactions: Tx[] = [
    mk(0, "income", 800, "Servicio", "Juan", "Le cobré $800 a Juan por el cambio de aceite"),
    mk(0, "expense", 300, "Refacciones", undefined, "gasté $300 en refacciones"),
    mk(-1, "income", 1200, "Servicio", "Pedro", "Me pagó 1,200 don Pedro por la afinación"),
    mk(-1, "expense", 450, "Refacciones", undefined, "compré 450 de balatas"),
    mk(-2, "expense", 600, "Herramienta", undefined, "compré $600 de herramienta"),
    mk(-2, "income", 350, "Servicio", undefined, "cobré 350 de una afinación"),
    mk(-3, "expense", 1500, "Renta", undefined, "pagué la renta"),
    mk(-3, "income", 900, "Servicio", undefined, "cobré 900"),
    mk(-4, "income", 1400, "Servicio", undefined, "cobré 1,400"),
    mk(-4, "expense", 380, "Refacciones", undefined, "compré 380 de refacciones"),
    mk(-5, "expense", 240, "Gasolina/transporte", undefined, "gasolina")
  ];

  const weekdayIn = (n: number) => addDays(now, n).getDay();

  const commitments: Commitment[] = [
    { id: uid(), label: "Renta del local", amount: 1800, dueWeekday: weekdayIn(3), recurring: true },
    { id: uid(), label: "Luz y agua", amount: 500, dueWeekday: weekdayIn(5), recurring: true },
    { id: uid(), label: "Proveedor de refacciones", amount: 900, dueWeekday: weekdayIn(8), recurring: true }
  ];

  const pendingJobs: PendingJob[] = [
    { id: uid(), label: "Reparación de motor", client: "don Pedro", amount: 600 },
    { id: uid(), label: "Cambio de clutch", client: "Lupita", amount: 450 }
  ];

  return {
    transactions,
    commitments,
    pendingJobs,
    settings: { deviceId, cloudSyncEnabled: true, businessName: "Taller de Marcos" }
  };
}

function load(): AppState {
  if (typeof localStorage === "undefined") return createInitialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = createInitialState();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.transactions || !parsed.settings) throw new Error("shape");
    return parsed;
  } catch {
    return createInitialState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(next: AppState): void {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* cuota llena: la app sigue en memoria */
  }
  emit();
}

export const store = {
  getState: (): AppState => state,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  addTx(tx: Tx): void {
    persist({ ...state, transactions: [tx, ...state.transactions] });
  },
  addTxs(txs: Tx[]): void {
    if (txs.length === 0) return;
    persist({ ...state, transactions: [...txs, ...state.transactions] });
  },
  updateTx(id: string, patch: Partial<Tx>): void {
    persist({
      ...state,
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t))
    });
  },
  removeTx(id: string): void {
    persist({ ...state, transactions: state.transactions.filter((t) => t.id !== id) });
  },
  addCommitment(c: Commitment): void {
    persist({ ...state, commitments: [...state.commitments, c] });
  },
  removeCommitment(id: string): void {
    persist({ ...state, commitments: state.commitments.filter((c) => c.id !== id) });
  },
  addPendingJob(j: PendingJob): void {
    persist({ ...state, pendingJobs: [...state.pendingJobs, j] });
  },
  removePendingJob(id: string): void {
    persist({ ...state, pendingJobs: state.pendingJobs.filter((j) => j.id !== id) });
  },
  /** Marca movimientos como sincronizados tras subirlos a la nube. */
  markSynced(ids: string[], when: string): void {
    const set = new Set(ids);
    persist({
      ...state,
      transactions: state.transactions.map((t) =>
        set.has(t.id) ? { ...t, synced: true, syncedAt: when } : t
      ),
      settings: { ...state.settings, lastSyncAt: when }
    });
  },
  /** Fusiona movimientos que llegaron de la nube sin duplicar. */
  mergeFromCloud(remote: Tx[]): void {
    const byId = new Map(state.transactions.map((t) => [t.id, t]));
    for (const r of remote) {
      const existing = byId.get(r.id);
      if (!existing) byId.set(r.id, { ...r, synced: true });
    }
    persist({ ...state, transactions: Array.from(byId.values()) });
  },
  setSettings(patch: Partial<Settings>): void {
    persist({ ...state, settings: { ...state.settings, ...patch } });
  },
  reset(now: Date = new Date()): void {
    persist(createInitialState(now));
  },
  replace(next: AppState): void {
    persist(next);
  }
};

export function useStore(): AppState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export const newId = uid;
