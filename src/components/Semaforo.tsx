import type { Insights } from "../lib/insights";
import { money } from "../lib/types";
import { Bar, Card, Stat } from "./ui";

const LIGHT: Record<string, { emoji: string; text: string }> = {
  green: { emoji: "🟢", text: "Verde" },
  amber: { emoji: "🟡", text: "Ámbar" },
  red: { emoji: "🔴", text: "Rojo" }
};

export function Semaforo({
  insights,
  onCapture,
  onDiagnostico
}: {
  insights: Insights;
  onCapture: () => void;
  onDiagnostico: () => void;
}) {
  const light = LIGHT[insights.status];
  const coverage =
    insights.upcomingTotal > 0 ? insights.cashAvailable / insights.upcomingTotal : insights.status === "green" ? 1 : 0.4;

  return (
    <div className="stack" data-testid="semaforo">
      <Card tone={insights.status} className="hero">
        <div className="hero__top">
          <div className="light" data-testid="status-light">
            <span className="light__dot" aria-hidden="true">
              {light.emoji}
            </span>
            <div>
              <div className="light__label" data-testid="status-label">
                {insights.statusLabel}
              </div>
              <div className="light__sub">Estado de hoy</div>
            </div>
          </div>
          <div className="hero__cash">
            <span className="hero__cash-label">Libre de verdad</span>
            <strong data-testid="cash-available">{money(insights.cashAvailable)}</strong>
          </div>
        </div>

        <p className="hero__headline" data-testid="headline">
          {insights.headline}
        </p>

        <div className="grid-2">
          <Stat label="Cobrado hoy" value={money(insights.day.income)} kind="income" />
          <Stat label="Gastado hoy" value={money(insights.day.expense)} kind="expense" />
        </div>

        <div className="coverage">
          <div className="coverage__row">
            <span>Tu dinero cubre tus pagos de esta semana</span>
            <strong>{Math.round(coverage * 100)}%</strong>
          </div>
          <Bar value={coverage} tone={insights.status} />
        </div>
      </Card>

      <Card tone={insights.deficit > 0 ? "amber" : "green"} className="alert" data-testid="flow-alert">
        <h2 className="card__title">⚠️ Alerta de flujo (próximos 5 días)</h2>
        <p className="card__body">{insights.flowAlert}</p>
        {insights.upcoming.length > 0 ? (
          <ul className="chips">
            {insights.upcoming.map((c) => (
              <li key={c.id} className="chip">
                {c.label} · {money(c.amount)} · {c.dateLabel}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card tone="green" className="action" data-testid="suggested-action">
        <h2 className="card__title">💡 Acción sugerida de hoy</h2>
        <p className="action__text" data-testid="action-text">
          {insights.suggestedAction}
        </p>
        <p className="card__body muted">{insights.actionBecause}</p>
      </Card>

      <div className="cta-row">
        <button className="btn btn--primary" onClick={onCapture} data-testid="go-capture">
          🎙️ Capturar en 1 minuto
        </button>
        <button className="btn" onClick={onDiagnostico} data-testid="go-diagnostico">
          Ver mi regla para mañana
        </button>
      </div>
    </div>
  );
}
