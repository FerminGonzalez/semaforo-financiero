import type { Insights } from "../lib/insights";
import { newId, store, type AppState } from "../lib/store";
import { money, todayKey } from "../lib/types";
import { Card, Pill, Stat } from "./ui";

export function Diagnostico({ state, insights }: { state: AppState; insights: Insights }) {
  const todayTx = state.transactions.filter((t) => t.day === todayKey());
  const burnPct = insights.burnRate === null ? null : Math.round(insights.burnRate * 100);

  const cobrar = (id: string) => {
    const job = state.pendingJobs.find((j) => j.id === id);
    if (!job) return;
    store.addTx({
      id: newId(),
      kind: "income",
      amount: job.amount,
      category: "Cobro de cliente",
      counterparty: job.client,
      rawText: `Cobro: ${job.label}`,
      source: "manual",
      day: todayKey(),
      createdAt: new Date().toISOString(),
      synced: false,
      confidence: 1
    });
    store.removePendingJob(id);
  };

  return (
    <div className="stack" data-testid="diagnostico">
      <Card tone={insights.status} className="rule" data-testid="tomorrow-rule">
        <h2 className="card__title">📌 Mi regla para mañana</h2>
        <p className="rule__text">{insights.tomorrowRule}</p>
        <p className="muted tiny">Léela en 10 segundos y ajústate al día siguiente. Nada de balances.</p>
      </Card>

      <div className="grid-2">
        <Card>
          <Stat label="Dinero que te deben" value={money(insights.receivable)} hint="Trabajos ya hechos" kind="income" />
        </Card>
        <Card>
          <Stat
            label="Se te va en refacciones"
            value={burnPct === null ? "—" : `${burnPct}%`}
            hint={burnPct === null ? "Registra un cobro para medirlo" : "de tu cobro de hoy"}
            kind={burnPct !== null && burnPct > 60 ? "expense" : "neutral"}
          />
        </Card>
      </div>

      {burnPct !== null && burnPct > 60 ? (
        <Card tone="amber">
          <p className="card__body">
            Hoy {burnPct}% de lo que cobraste se fue en compras. Vendiste, pero la ganancia se quedó en el estante.
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="card__title">🔧 Trabajos por cobrar</h2>
        {state.pendingJobs.length === 0 ? (
          <p className="muted">Nada pendiente. Todo cobrado.</p>
        ) : (
          <ul className="list">
            {state.pendingJobs.map((j) => (
              <li key={j.id} className="list__row">
                <div>
                  <strong>{j.label}</strong>
                  <span className="muted tiny">{j.client ? ` · ${j.client}` : ""}</span>
                </div>
                <div className="list__right">
                  <span className="amount">{money(j.amount)}</span>
                  <button className="btn btn--tiny btn--primary" onClick={() => cobrar(j.id)} data-testid="collect-job">
                    Cobrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="card__title">📅 Pagos fijos</h2>
        <ul className="list">
          {state.commitments.map((c) => (
            <li key={c.id} className="list__row">
              <div>
                <strong>{c.label}</strong>
                <span className="muted tiny"> · cada semana</span>
              </div>
              <div className="list__right">
                <span className="amount">{money(c.amount)}</span>
                <button className="btn btn--tiny" onClick={() => store.removeCommitment(c.id)} aria-label={`Quitar ${c.label}`}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
        <AddCommitment />
      </Card>

      <Card>
        <h2 className="card__title">🧾 Lo que registraste hoy</h2>
        {todayTx.length === 0 ? (
          <p className="muted">Todavía nada hoy. Captura en un minuto.</p>
        ) : (
          <ul className="list">
            {todayTx.map((t) => (
              <li key={t.id} className="list__row">
                <div>
                  <Pill tone={t.kind === "income" ? "green" : "red"}>{t.kind === "income" ? "Entró" : "Salió"}</Pill>
                  <span className="muted tiny"> {t.category}</span>
                  {t.counterparty ? <span className="muted tiny"> · {t.counterparty}</span> : null}
                </div>
                <div className="list__right">
                  <span className={`amount amount--${t.kind}`}>{t.kind === "income" ? "+" : "−"}{money(t.amount)}</span>
                  <button className="btn btn--tiny" onClick={() => store.removeTx(t.id)} aria-label="Borrar movimiento">
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AddCommitment() {
  return (
    <form
      className="commit-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget as HTMLFormElement;
        const data = new FormData(f);
        const label = String(data.get("label") || "").trim();
        const amount = Number(data.get("amount"));
        const dueWeekday = Number(data.get("weekday"));
        if (!label || !Number.isFinite(amount) || amount <= 0) return;
        store.addCommitment({ id: newId(), label, amount, dueWeekday, recurring: true });
        f.reset();
      }}
    >
      <input name="label" placeholder="Nuevo pago fijo (ej. gasolina)" required />
      <input name="amount" type="number" inputMode="decimal" placeholder="Monto" required />
      <select name="weekday" defaultValue="5" aria-label="Día de la semana">
        {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
          <option key={d} value={i}>
            {d}
          </option>
        ))}
      </select>
      <button className="btn" type="submit">
        Agregar
      </button>
    </form>
  );
}
