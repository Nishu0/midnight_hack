import type { PoolState } from "@/types";
import type { Order } from "@nightpool/contract";
import { tickToPrice } from "@/config";

type Props = {
  pool?: PoolState;
  myOrders: Order[];
  busy?: string;
  onClaim: () => void;
};

export function ClaimPanel({ pool, myOrders, busy, onClaim }: Props) {
  if (!pool) return null;
  const settled = pool.phase === "settled";
  const clearing = Number(pool.clearingTick);

  return (
    <section className="card rise">
      <div className="eyebrow">step 4 · claim</div>
      <h2>claim proceeds</h2>
      <p className="hint">withdraw fills via a nullifier, unlinkable to your commitment.</p>

      <ul className="orders">
        {myOrders.length === 0 && <li className="empty">no orders this batch</li>}
        {myOrders.map((o, i) => {
          const buy = o.side === 0n;
          const eligible = buy ? Number(o.limitTick) >= clearing : Number(o.limitTick) <= clearing;
          return (
            <li key={i}>
              <span className={buy ? "buy" : "sell"}>{buy ? "buy" : "sell"}</span>
              {o.amount.toString()} @ tick {o.limitTick.toString()} ({tickToPrice(Number(o.limitTick)).toFixed(3)})
              {settled && <em>{pool.clearedVolume === 0n ? "refund" : eligible ? "filled" : "unfilled"}</em>}
            </li>
          );
        })}
      </ul>

      <button className="btn primary" disabled={!settled || myOrders.length === 0 || !!busy} onClick={onClaim}>
        claim proceeds
      </button>
    </section>
  );
}
