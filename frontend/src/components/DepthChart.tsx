import { TICK_COUNT, tickToPrice } from "@/config";
import type { PoolState } from "@/types";

// public aggregate curves — the only per-order-derived data anyone can see.
// bars are demand (buy) vs supply (sell) per price tick.
type Props = { pool?: PoolState };

export function DepthChart({ pool }: Props) {
  const demand = pool?.demand ?? Array<bigint>(TICK_COUNT).fill(0n);
  const supply = pool?.supply ?? Array<bigint>(TICK_COUNT).fill(0n);
  const max = Number([...demand, ...supply].reduce((a, b) => (a > b ? a : b), 1n));
  const clearing = pool?.phase === "settled" ? Number(pool.clearingTick) : -1;

  return (
    <section className="card rise">
      <div className="eyebrow">public aggregate</div>
      <h2>depth by price tick</h2>
      <p className="hint">totals per tick are public; who bid what is not.</p>
      <div className="chart">
        {Array.from({ length: TICK_COUNT }, (_, t) => {
          const d = Number(demand[t]);
          const s = Number(supply[t]);
          return (
            <div className={`col${t === clearing ? " clearing" : ""}`} key={t} title={`tick ${t} · ${tickToPrice(t).toFixed(3)}`}>
              <div className="bars">
                <span className="buy" style={{ height: `${(d / max) * 100}%` }} />
                <span className="sell" style={{ height: `${(s / max) * 100}%` }} />
              </div>
              <label>{t}</label>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <span className="buy" /> demand <span className="sell" /> supply
        {clearing >= 0 && <em>clearing @ tick {clearing}</em>}
      </div>
    </section>
  );
}
