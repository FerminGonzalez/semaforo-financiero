import { useCallback, useEffect, useMemo, useState } from "react";
import { Asesor } from "./components/Asesor";
import { Captura } from "./components/Captura";
import { Diagnostico } from "./components/Diagnostico";
import { Semaforo } from "./components/Semaforo";
import { Pill } from "./components/ui";
import { cloudConfigured, pullTransactions, pushUnsynced } from "./lib/cloud";
import { useOnline } from "./lib/connectivity";
import { buildInsights } from "./lib/insights";
import { store, useStore } from "./lib/store";
import { money } from "./lib/types";

type Tab = "hoy" | "capturar" | "diagnostico" | "asesor";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "hoy", label: "Hoy", icon: "🚦" },
  { id: "capturar", label: "Capturar", icon: "🎙️" },
  { id: "diagnostico", label: "Mi plan", icon: "📌" },
  { id: "asesor", label: "Asesor", icon: "🧑‍🏫" }
];

export function App() {
  const state = useStore();
  const online = useOnline();
  const [tab, setTab] = useState<Tab>("hoy");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | undefined>(state.settings.lastSyncAt);

  const insights = useMemo(
    () =>
      buildInsights({
        transactions: state.transactions,
        commitments: state.commitments,
        pendingJobs: state.pendingJobs
      }),
    [state.transactions, state.commitments, state.pendingJobs]
  );

  const unsynced = state.transactions.filter((t) => !t.synced).length;

  const runSync = useCallback(async () => {
    const s0 = store.getState();
    if (!cloudConfigured || !s0.settings.cloudSyncEnabled || !navigator.onLine) return;
    setSyncing(true);
    const before = s0.transactions.filter((t) => !t.synced).map((t) => t.id);
    const push = await pushUnsynced(s0);
    if (push.ok) {
      if (before.length > 0) store.markSynced(before, new Date().toISOString());
      const pull = await pullTransactions(store.getState());
      if (pull.ok) store.mergeFromCloud(pull.rows);
      setLastSync(new Date().toLocaleTimeString("es-MX"));
    } else {
      setLastSync(`pendiente (${push.error ?? "sin red"})`);
    }
    setSyncing(false);
  }, []);

  // Sincroniza al volver la red y tras cada captura, sin bloquear la UI.
  useEffect(() => {
    if (!online) return;
    const id = window.setTimeout(runSync, 500);
    return () => window.clearTimeout(id);
  }, [online, unsynced, runSync]);

  return (
    <div className="app">
      <header className="topbar" data-testid="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true">
            🚦
          </span>
          <div>
            <strong>{state.settings.businessName}</strong>
            <span className="muted tiny">Semáforo Financiero de Bolsillo</span>
          </div>
        </div>
        <div className="topbar__status">
          <Pill tone={online ? "green" : "amber"} data-testid="connectivity-pill">
            {online ? "Con señal" : "Sin señal"}
          </Pill>
          <Pill tone={unsynced > 0 ? "amber" : "green"} data-testid="sync-pill">
            {syncing
              ? "Sincronizando…"
              : unsynced > 0
                ? `${unsynced} en el teléfono`
                : lastSync
                  ? `Sincronizado ${lastSync}`
                  : "Todo guardado"}
          </Pill>
        </div>
      </header>

      {!online ? (
        <div className="offline-banner" data-testid="offline-banner">
          Estás sin conexión. Sigue capturando: se guarda en tu teléfono y sube solo cuando vuelva la señal.
        </div>
      ) : null}

      <main className="content">
        {tab === "hoy" ? (
          <Semaforo insights={insights} onCapture={() => setTab("capturar")} onDiagnostico={() => setTab("diagnostico")} />
        ) : null}
        {tab === "capturar" ? <Captura onDone={() => setTab("hoy")} /> : null}
        {tab === "diagnostico" ? <Diagnostico state={state} insights={insights} /> : null}
        {tab === "asesor" ? <Asesor insights={insights} /> : null}
      </main>

      <footer className="footer">
        <span className="muted tiny">
          Efectivo libre: {money(insights.cashAvailable)} · {state.transactions.length} movimientos
        </span>
        <button
          className="btn btn--tiny btn--ghost"
          onClick={() => {
            if (confirm("¿Reiniciar con los datos de demostración de Marcos?")) store.reset();
          }}
          data-testid="reset-demo"
        >
          Reiniciar demo
        </button>
      </footer>

      <nav className="tabbar" aria-label="Secciones" data-testid="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab tab--on" : "tab"}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            data-testid={`tab-${t.id}`}
          >
            <span aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
