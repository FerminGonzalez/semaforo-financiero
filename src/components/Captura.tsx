import { useMemo, useRef, useState } from "react";
import { DEMO_PHRASES } from "../lib/parser";
import { smartParse } from "../lib/ai-parser";
import { newId, store } from "../lib/store";
import { CATEGORIES, money, todayKey, type ParsedEntry, type Tx, type TxKind } from "../lib/types";
import { useOnline } from "../lib/connectivity";
import { Card } from "./ui";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "es-MX";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

export function Captura({ onDone }: { onDone: () => void }) {
  const online = useOnline();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [drafts, setDrafts] = useState<ParsedEntry[]>([]);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionAvailable = useMemo(() => getRecognition() !== null, []);

  const toggleListen = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript + " ";
      setText((prev) => `${prev} ${transcript}`.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const [interpreting, setInterpreting] = useState(false);

  const interpret = async () => {
    setInterpreting(true);
    try {
      const entries = await smartParse(text);
      setDrafts(entries);
      setSaved(null);
    } catch (e) {
      console.error("AI Parse Error:", e);
    } finally {
      setInterpreting(false);
    }
  };

  const patchDraft = (index: number, patch: Partial<ParsedEntry>) => {
    setDrafts((d) => d.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = () => {
    const day = todayKey();
    const txs: Tx[] = drafts.map((d) => ({
      id: newId(),
      kind: d.kind,
      amount: d.amount,
      category: d.category,
      counterparty: d.counterparty,
      rawText: d.source,
      photoDataUrl: photo,
      source: photo ? "photo" : "audio",
      day,
      createdAt: new Date().toISOString(),
      synced: false,
      confidence: d.confidence
    }));
    store.addTxs(txs);
    setSaved(txs.length);
    setDrafts([]);
    setText("");
    setPhoto(undefined);
  };

  return (
    <div className="stack" data-testid="captura">
      <Card>
        <h2 className="card__title">Captura en 1 minuto</h2>
        <p className="card__body muted">
          Habla como le hablarías a tu ayudante. No llenes formularios.
          {!online ? " Estás sin conexión: todo se guarda en el teléfono." : ""}
        </p>

        <div className="mic-row">
          <button
            className={`mic ${listening ? "mic--on" : ""}`}
            onClick={toggleListen}
            disabled={!recognitionAvailable}
            data-testid="mic-button"
            title={recognitionAvailable ? "Dictar" : "Este navegador no trae micrófono integrado"}
          >
            <span aria-hidden="true">{listening ? "⏹️" : "🎙️"}</span>
            <span>{listening ? "Escuchando…" : recognitionAvailable ? "Dictar" : "Sin micrófono"}</span>
          </button>
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()} data-testid="photo-button">
            📷 Foto del ticket
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
            data-testid="photo-input"
          />
        </div>

        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="Ticket adjunto" />
            <button className="btn btn--tiny" onClick={() => setPhoto(undefined)}>
              Quitar
            </button>
          </div>
        ) : null}

        <label className="field">
          <span>Lo que dijiste (puedes corregirlo)</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej. Le cobré $800 a Juan por el cambio de aceite y gasté $300 en refacciones"
            rows={3}
            data-testid="dictado-input"
          />
        </label>

        <div className="phrases">
          <span className="muted tiny">Dictado rápido (funciona sin señal):</span>
          {DEMO_PHRASES.map((p) => (
            <button key={p} className="chip chip--action" onClick={() => setText(p)} data-testid="phrase-chip">
              {p}
            </button>
          ))}
        </div>

        <button
          className="btn btn--primary btn--wide"
          onClick={interpret}
          disabled={!text.trim() || interpreting}
          data-testid="interpret-button"
        >
          {interpreting ? "Consultando al cerebro IA..." : "Interpretar con el semáforo"}
        </button>
      </Card>

      {drafts.length > 0 ? (
        <Card data-testid="drafts">
          <h2 className="card__title">Revisa y guarda ({drafts.length})</h2>
          <p className="card__body muted">Un toque para corregir si algo no cuadra.</p>
          <ul className="drafts">
            {drafts.map((d, i) => (
              <li key={i} className={`draft draft--${d.kind}`} data-testid="draft-item">
                <div className="draft__head">
                  <div className="seg">
                    <button
                      className={d.kind === "income" ? "seg--on" : ""}
                      onClick={() => patchDraft(i, { kind: "income", category: CATEGORIES.income[0] })}
                    >
                      Entró
                    </button>
                    <button
                      className={d.kind === "expense" ? "seg--on" : ""}
                      onClick={() => patchDraft(i, { kind: "expense", category: CATEGORIES.expense[0] })}
                    >
                      Salió
                    </button>
                  </div>
                  <input
                    className="amount-input"
                    type="number"
                    inputMode="decimal"
                    value={d.amount}
                    onChange={(e) => patchDraft(i, { amount: Number(e.target.value) })}
                    aria-label="Monto"
                  />
                </div>
                <div className="draft__meta">
                  <select value={d.category} onChange={(e) => patchDraft(i, { category: e.target.value })} aria-label="Categoría">
                    {CATEGORIES[d.kind].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {d.counterparty ? <span className="tag">👤 {d.counterparty}</span> : null}
                  <span className="tag">confianza {Math.round(d.confidence * 100)}%</span>
                </div>
                <p className="draft__src muted tiny">“{d.source}”</p>
                {d.warnings.map((w) => (
                  <p key={w} className="draft__warn" data-testid="draft-warning">
                    ⚠️ {w}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <button className="btn btn--primary btn--wide" onClick={save} data-testid="save-button">
            Guardar {drafts.length} movimiento{drafts.length > 1 ? "s" : ""}
          </button>
        </Card>
      ) : null}

      {saved !== null ? (
        <Card tone="green" data-testid="saved-confirmation">
          <p className="card__body">
            ✅ Guardado{saved > 1 ? "s" : ""} {saved} movimiento{saved > 1 ? "s" : ""} {online ? "y enviado" : "en el teléfono (se enviará cuando vuelva la señal)"}.
          </p>
          <button className="btn btn--primary" onClick={onDone} data-testid="back-to-semaforo">
            Ver mi semáforo
          </button>
        </Card>
      ) : null}

      <ManualAdd onSaved={() => setSaved((s) => (s ?? 0) + 1)} />
    </div>
  );
}

function ManualAdd({ onSaved }: { onSaved: () => void }) {
  const [kind, setKind] = useState<TxKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES.expense[0]);

  const save = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    store.addTx({
      id: newId(),
      kind,
      amount: n,
      category,
      source: "manual",
      day: todayKey(),
      createdAt: new Date().toISOString(),
      synced: false,
      confidence: 1
    });
    setAmount("");
    onSaved();
  };

  return (
    <Card className="manual">
      <h2 className="card__title">O si prefieres, a mano</h2>
      <div className="manual__row">
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as TxKind;
            setKind(k);
            setCategory(CATEGORIES[k][0]);
          }}
          aria-label="Tipo"
        >
          <option value="income">Entró</option>
          <option value="expense">Salió</option>
        </select>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          placeholder="Monto"
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Monto"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría">
          {CATEGORIES[kind].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button className="btn" onClick={save} disabled={!amount}>
          Agregar
        </button>
      </div>
      <p className="muted tiny">Ejemplo: {money(0)} de margen — el semáforo se recalcula al instante.</p>
    </Card>
  );
}
