import { BATCH_SIZE, tickToPrice } from "@/config";
import type { PoolState } from "@/types";

const phaseStep = { commit: 0, reveal: 1, settled: 2 } as const;

type Props = {
  pool?: PoolState;
  busy?: string;
  onReveal: () => void;
  onSettle: () => void;
};

export function BatchStatus({ pool, busy, onReveal, onSettle }: Props) {
  if (!pool) return null;
  const step = phaseStep[pool.phase];
  const remaining = Number(BigInt(BATCH_SIZE) - pool.committedCount);

  return (
    <section className="card rise">
      <div className="eyebrow">steps 2 &amp; 3 · reveal + settle</div>
      <h2>
        batch #{pool.batchId.toString()}
        {busy && <span className="busy">{busy}…</span>}
      </h2>

      <ol className="phases">
        {(["commit", "reveal", "settled"] as const).map((p, i) => (
          <li key={p} className={i === step ? "active" : i < step ? "done" : ""}>
            {p}
          </li>
        ))}
      </ol>

      <div className="stats">
        <div>
          <span>
            {pool.committedCount.toString()}/{BATCH_SIZE}
          </span>
          committed
        </div>
        <div>
          <span>{pool.revealedCount.toString()}</span>
          revealed
        </div>
        <div>
          <span>{pool.phase === "settled" ? tickToPrice(Number(pool.clearingTick)).toFixed(3) : "—"}</span>
          clearing price
        </div>
        <div>
          <span>{pool.clearedVolume.toString()}</span>
          matched volume
        </div>
      </div>

      {pool.phase === "commit" && (
        <p className="hint">
          {remaining > 0
            ? `commit ${remaining} more order${remaining === 1 ? "" : "s"} to fill the batch and open reveal.`
            : "batch full — opening reveal."}
        </p>
      )}

      <div className="actions">
        <button className="btn" disabled={pool.phase !== "reveal" || !!busy} onClick={onReveal}>
          reveal my orders
        </button>
        <button className="btn" disabled={pool.phase !== "reveal" || !!busy} onClick={onSettle}>
          settle batch
        </button>
      </div>
    </section>
  );
}
