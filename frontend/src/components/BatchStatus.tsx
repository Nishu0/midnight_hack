import { BATCH_SIZE, tickToPrice } from "@/config";
import type { PoolState } from "@/types";

const phaseStep = { commit: 0, reveal: 1, settled: 2 } as const;

type Props = {
  pool?: PoolState;
  busy?: string;
  onReveal: () => void;
  onForceReveal: () => void;
  onSettle: () => void;
  onStartNextBatch: () => void;
};

export function BatchStatus({ pool, busy, onReveal, onForceReveal, onSettle, onStartNextBatch }: Props) {
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
            ? `commit ${remaining} more order${remaining === 1 ? "" : "s"} to fill the batch, or open reveal now.`
            : "batch full — opening reveal."}
        </p>
      )}
      {pool.phase === "settled" && <p className="hint">batch settled. claim your fills, then start the next batch.</p>}

      <div className="actions">
        {pool.phase === "commit" && (
          <button
            className="btn"
            disabled={pool.committedCount === 0n || !!busy}
            onClick={onForceReveal}
            title="liveness: anyone can open reveal even before the batch is full"
          >
            open reveal now
          </button>
        )}
        {pool.phase === "reveal" && (
          <>
            <button className="btn" disabled={!!busy} onClick={onReveal}>
              reveal my orders
            </button>
            <button className="btn primary" disabled={!!busy} onClick={onSettle}>
              settle batch
            </button>
          </>
        )}
        {pool.phase === "settled" && (
          <button className="btn primary" disabled={!!busy} onClick={onStartNextBatch}>
            start next batch
          </button>
        )}
      </div>
    </section>
  );
}
