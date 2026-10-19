// Sincronizacion opcional con Supabase. Nunca es requisito para capturar:
// si no hay red, la app sigue trabajando contra localStorage.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "./store";
import type { Tx } from "./types";
import { todayKey } from "./types";

const URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const cloudConfigured = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  if (!client) {
    client = createClient(URL, KEY, {
      auth: { persistSession: false },
      global: { headers: { "x-application-name": "semaforo-financiero" } }
    });
  }
  return client;
}

const TABLE = "smf_transactions";
const ROW_LIMIT = 300;

/** Evita que una red lenta cuelgue la sync: rechaza a los 8s. */
async function guard<T>(p: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

interface Row {
  id: string;
  device_id: string;
  kind: string;
  amount: number;
  category: string | null;
  counterparty: string | null;
  raw_text: string | null;
  occurred_on: string;
  created_at: string;
}

const toRow = (t: Tx, deviceId: string): Row => ({
  id: t.id,
  device_id: deviceId,
  kind: t.kind,
  amount: t.amount,
  category: t.category,
  counterparty: t.counterparty ?? null,
  raw_text: t.rawText ?? null,
  occurred_on: t.day,
  created_at: t.createdAt
});

const fromRow = (r: Row): Tx => ({
  id: r.id,
  kind: r.kind === "income" ? "income" : "expense",
  amount: Number(r.amount),
  category: r.category ?? "Otro",
  counterparty: r.counterparty ?? undefined,
  rawText: r.raw_text ?? undefined,
  source: "audio",
  day: r.occurred_on ?? todayKey(),
  createdAt: r.created_at,
  synced: true,
  confidence: 0.9
});

export interface PushResult {
  ok: boolean;
  pushed: string[];
  error?: string;
}

/** Sube solo los movimientos aun no sincronizados. Silencioso si no hay red. */
export async function pushUnsynced(state: AppState): Promise<PushResult> {
  const sb = getClient();
  if (!sb) return { ok: false, pushed: [], error: "cloud-not-configured" };
  const pending = state.transactions.filter((t) => !t.synced);
  if (pending.length === 0) return { ok: true, pushed: [] };
  try {
    const { error } = await guard(sb.from(TABLE).upsert(pending.map((t) => toRow(t, state.settings.deviceId))));
    if (error) return { ok: false, pushed: [], error: error.message };
    return { ok: true, pushed: pending.map((t) => t.id) };
  } catch (e) {
    return { ok: false, pushed: [], error: e instanceof Error ? e.message : "network" };
  }
}

/** Baja los movimientos de este dispositivo para que otros equipos los vean. */
export async function pullTransactions(state: AppState): Promise<{ ok: boolean; rows: Tx[]; error?: string }> {
  const sb = getClient();
  if (!sb) return { ok: false, rows: [], error: "cloud-not-configured" };
  try {
    const { data, error } = await guard(
      sb
        .from(TABLE)
        .select("*")
        .eq("device_id", state.settings.deviceId)
        .order("created_at", { ascending: false })
        .limit(ROW_LIMIT)
    );
    if (error) return { ok: false, rows: [], error: error.message };
    return { ok: true, rows: (data as Row[]).map(fromRow) };
  } catch (e) {
    return { ok: false, rows: [], error: e instanceof Error ? e.message : "network" };
  }
}

export interface SyncOutcome {
  ok: boolean;
  pushed: number;
  pulled: number;
  at: string;
  error?: string;
}

/** Ciclo completo: subir pendientes, luego bajar lo que falte localmente. */
export async function syncNow(state: AppState): Promise<SyncOutcome> {
  const at = new Date().toISOString();
  const push = await pushUnsynced(state);
  if (!push.ok) return { ok: false, pushed: 0, pulled: 0, at, error: push.error };
  const pull = await pullTransactions(state);
  if (!pull.ok) return { ok: false, pushed: push.pushed.length, pulled: 0, at, error: pull.error };
  const known = new Set(state.transactions.map((t) => t.id));
  const fresh = pull.rows.filter((r) => !known.has(r.id));
  return { ok: true, pushed: push.pushed.length, pulled: fresh.length, at };
}
