import { money } from "../lib/types";
import { Card, Bar } from "./ui";

interface AnalyticsProps {
  distribution: { category: string; amount: number; percentage: number }[];
  trend: { day: string; balance: number }[];
  cashAvailable: number;
}

export function Analytics({ distribution, trend, cashAvailable }: AnalyticsProps) {
  return (
    <div className="stack">
      <Card>
        <h2 className="card__title">🔥 Mapa de Calor de Gastos</h2>
        <p className="card__body muted">¿Dónde se está yendo el dinero este mes?</p>
        <div className="analytics__distribution">
          {distribution.map((item) => (
            <div key={item.category} className="dist-row">
              <div className="dist-info">
                <span className="dist-label">{item.category}</span>
                <span className="dist-amount">{money(item.amount)}</span>
              </div>
              <div className="dist-bar-container">
                <Bar
                  value={item.percentage}
                  tone={item.percentage > 0.5 ? "red" : item.percentage > 0.2 ? "amber" : "green"}
                />
                <span className="dist-pct">{Math.round(item.percentage * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="card__title">📈 Proyección de Liquidez (7 días)</h2>
        <p className="card__body muted">Saldo estimado considerando pagos fijos.</p>
        <div className="trend-chart">
          {trend.map((point, i) => (
            <div key={i} className="trend-column">
              <div
                className="trend-bar"
                style={{
                  height: `${Math.max(10, (point.balance / cashAvailable) * 40)}px`,
                  backgroundColor: point.balance < 0 ? "var(--color-red)" : "var(--color-green)"
                }}
              />
              <span className="trend-day">{point.day}</span>
            </div>
          ))}
        </div>
        <div className="trend-footer">
          <span className="muted tiny">Cálculo basado en compromisos recurrentes.</span>
        </div>
      </Card>
    </div>
  );
}
