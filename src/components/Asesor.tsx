import { useState } from "react";
import type { Insights } from "../lib/insights";
import { Card, Pill } from "./ui";

export function Asesor({ insights }: { insights: Insights }) {
  const [plain, setPlain] = useState(true);

  return (
    <div className="stack" data-testid="asesor">
      <Card>
        <h2 className="card__title">🧑‍🏫 El mismo dato, dos idiomas</h2>
        <p className="card__body muted">
          Esto es exactamente lo que un contador te entrega. El número es el mismo; la diferencia es si puedes
          decidir con él.
        </p>
        <div className="toggle" role="group" aria-label="Tipo de vista">
          <button
            className={plain ? "toggle__btn toggle__btn--on" : "toggle__btn"}
            onClick={() => setPlain(true)}
            data-testid="view-plain"
          >
            Ver en mi idioma
          </button>
          <button
            className={!plain ? "toggle__btn toggle__btn--on" : "toggle__btn"}
            onClick={() => setPlain(false)}
            data-testid="view-expert"
          >
            Ver como contador
          </button>
        </div>
      </Card>

      <Card className="table-card">
        <table className="jargon" data-testid="jargon-table">
          <thead>
            <tr>
              <th>Término</th>
              <th>Valor</th>
              {plain ? <th>Qué significa para ti</th> : null}
            </tr>
          </thead>
          <tbody>
            {insights.jargon.map((row) => (
              <tr key={row.term} data-testid="jargon-row">
                <td className="jargon__term">{row.term}</td>
                <td className="jargon__value">{row.value}</td>
                {plain ? <td className="jargon__plain">{row.plain}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card tone={insights.status}>
        <h2 className="card__title">Traducción de una sola línea</h2>
        {plain ? (
          <p className="card__body" data-testid="translation-plain">
            {insights.status === "green"
              ? "Vas bien: tu dinero alcanza para lo que tienes que pagar. Puedes surtir con cuidado."
              : insights.status === "amber"
                ? "Vas ajustado: alcanzas, pero sin margen para errores. Cobra lo pendiente antes de comprar."
                : "Estás en riesgo: si no cobras o frenas compras, no llegas al pago que viene."}
          </p>
        ) : (
          <p className="card__body mono" data-testid="translation-expert">
            Capital de trabajo {insights.jargon.find((j) => j.term === "Capital de trabajo")?.value}; razón circulante{" "}
            {insights.jargon.find((j) => j.term === "Razón circulante")?.value}. EBITDA del periodo{" "}
            {insights.jargon.find((j) => j.term === "EBITDA")?.value}.
          </p>
        )}
        <div className="row-gap">
          <Pill tone={insights.status}>Estado: {insights.statusLabel}</Pill>
          <Pill tone={insights.deficit > 0 ? "red" : "green"}>
            {insights.deficit > 0 ? `Faltan ${insights.deficit.toFixed(0)} para tus pagos` : "Pagos cubiertos"}
          </Pill>
        </div>
      </Card>
    </div>
  );
}
