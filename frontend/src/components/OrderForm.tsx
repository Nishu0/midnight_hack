import { useState } from "react";
import { TICK_COUNT, tickToPrice } from "@/config";
import type { DraftOrder, Side } from "@/types";

type Props = {
  disabled: boolean;
  poolBalance: bigint;
  onCommit: (draft: DraftOrder) => void;
};

const PRESETS = [50, 100, 250, 500];

export function OrderForm({ disabled, poolBalance, onCommit }: Props) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("100");
  const [tick, setTick] = useState(8);

  const price = tickToPrice(tick);
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  const funded = poolBalance >= BigInt(amt);

  const submit = () => {
    if (amt <= 0 || !funded) return;
    onCommit({ side, amount: BigInt(amt), limitTick: tick });
  };

  return (
    <section className="card rise">
      <div className="eyebrow">step 1 · commit</div>
      <h2>place order</h2>
      <p className="hint">sealed as a hash — side, size and price never hit the chain until you reveal.</p>

      <div className="side-toggle">
        <button className={side === "buy" ? "on buy" : ""} onClick={() => setSide("buy")}>
          buy
        </button>
        <button className={side === "sell" ? "on sell" : ""} onClick={() => setSide("sell")}>
          sell
        </button>
      </div>

      <label>
        amount (base units)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
      </label>
      <div className="side-toggle" style={{ marginTop: -6 }}>
        {PRESETS.map((p) => (
          <button key={p} className={amt === p ? "on buy" : ""} onClick={() => setAmount(String(p))}>
            {p}
          </button>
        ))}
      </div>

      <label>
        limit price · tick {tick} = <span className="price-tag">{price.toFixed(3)}</span>{" "}
        <span className="hint" style={{ display: "inline" }}>
          ({side === "buy" ? "max you'll pay" : "min you'll accept"})
        </span>
        <input
          type="range"
          min={0}
          max={TICK_COUNT - 1}
          value={tick}
          onChange={(e) => setTick(Number(e.target.value))}
        />
      </label>

      {!funded && amt > 0 && (
        <p className="hint" style={{ color: "var(--sell)" }}>
          not enough escrow — deposit at least {amt} in step 0 (private balance: {poolBalance.toString()}).
        </p>
      )}
      <button className="btn primary xl" style={{ width: "100%" }} disabled={disabled || amt <= 0 || !funded} onClick={submit}>
        commit sealed order
      </button>
    </section>
  );
}
