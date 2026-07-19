import { useState } from "react";
import { BATCH_SIZE, TICK_COUNT } from "@/config";
import type { PoolMeta } from "@/api/registry";

type Props = {
  busy?: string;
  dust?: { balance: bigint; cap: bigint };
  onBack: () => void;
  onDeploy: (meta: PoolMeta) => void;
};

export function CreatePool({ busy, dust, onBack, onDeploy }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [base, setBase] = useState("tDUST");
  const [quote, setQuote] = useState("mUSD");

  const canNext = name.trim().length > 0 && base.trim().length > 0 && quote.trim().length > 0;

  return (
    <div className="shell">
      <button className="linklike back" onClick={onBack}>
        ← back to pools
      </button>

      <section className="card wizard rise">
        <div className="eyebrow">new market</div>
        <h2>create a pool</h2>

        <div className="wiz-steps">
          <span className={step === 0 ? "on" : step > 0 ? "done" : ""}>1 · market</span>
          <span className={step === 1 ? "on" : ""}>2 · review</span>
        </div>

        {step === 0 && (
          <div className="wiz-body">
            <label>
              pool name
              <input placeholder="e.g. Night Blue Chip" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="pair-row">
              <label>
                base token
                <input value={base} onChange={(e) => setBase(e.target.value)} />
              </label>
              <span className="slash">/</span>
              <label>
                quote token
                <input value={quote} onChange={(e) => setQuote(e.target.value)} />
              </label>
            </div>
            <p className="hint">
              token symbols are labels for this demo market. clearing runs on a single pair.
            </p>
            <div className="wiz-nav">
              <span />
              <button className="btn primary" disabled={!canNext} onClick={() => setStep(1)}>
                next
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wiz-body">
            <div className="review">
              <div className="review-row">
                <span>market</span>
                <b>{name}</b>
              </div>
              <div className="review-row">
                <span>pair</span>
                <b className="mono">{base} / {quote}</b>
              </div>
              <div className="review-row">
                <span>batch size</span>
                <b className="mono">{BATCH_SIZE} orders</b>
              </div>
              <div className="review-row">
                <span>price grid</span>
                <b className="mono">{TICK_COUNT} ticks · 0.5 → 2.0</b>
              </div>
              <div className="review-row">
                <span>protocol fee</span>
                <b className="mono">1 unit / filled order</b>
              </div>
              <div className="review-row">
                <span>dust for fees</span>
                <b className="mono">{dust ? dust.balance.toString() : "…"}</b>
              </div>
            </div>
            <p className="hint">batch size, grid and fee are fixed by the contract circuit. deploying costs a little dust.</p>
            <div className="wiz-nav">
              <button className="btn" disabled={!!busy} onClick={() => setStep(0)}>
                back
              </button>
              <button
                className="btn primary"
                disabled={!!busy}
                onClick={() => onDeploy({ name: name.trim(), base: base.trim(), quote: quote.trim() })}
              >
                {busy === "deploying pool" ? "deploying…" : "deploy pool"}
              </button>
            </div>
            {busy && <p className="hint">{busy}… generating a zk proof, this can take 30 to 60s.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
