import { useState } from "react";
import { TICK_COUNT, tickToPrice } from "@/config";
import type { DraftOrder, Side } from "@/types";

type Props = {
  disabled: boolean;
  onCommit: (draft: DraftOrder) => void;
};

export function OrderForm({ disabled, onCommit }: Props) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("100");
  const [tick, setTick] = useState(8);

  const submit = () => {
    const amt = BigInt(Math.max(0, Math.floor(Number(amount) || 0)));
    if (amt <= 0n) return;
    onCommit({ side, amount: amt, limitTick: tick });
  };

  return (
    <section className="card">
      <h2>place order</h2>
      <p className="hint">sealed as a hash — contents never hit the chain until you reveal.</p>

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

      <label>
        limit price · tick {tick} = {tickToPrice(tick).toFixed(3)}
        <input
          type="range"
          min={0}
          max={TICK_COUNT - 1}
          value={tick}
          onChange={(e) => setTick(Number(e.target.value))}
        />
      </label>

      <button className="btn primary" disabled={disabled} onClick={submit}>
        commit order
      </button>
    </section>
  );
}
