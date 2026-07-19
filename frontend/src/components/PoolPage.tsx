import { useState } from "react";
import { OrderForm } from "@/components/OrderForm";
import { BatchStatus } from "@/components/BatchStatus";
import { DepthChart } from "@/components/DepthChart";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Guide } from "@/components/Guide";
import { OracleWidget } from "@/components/OracleWidget";
import type { PoolMeta } from "@/api/registry";
import type { OracleSeries } from "@/api/oracle-api";
import type { PoolState, DraftOrder } from "@/types";
import type { Order } from "@nightpool/contract";

type Props = {
  meta?: PoolMeta;
  address?: string;
  pool?: PoolState;
  myOrders: Order[];
  busy?: string;
  onBack: () => void;
  onCommit: (d: DraftOrder) => void;
  onCancel: (o: Order) => void;
  onReveal: () => void;
  onForceReveal: () => void;
  onSettle: () => void;
  onStartNextBatch: () => void;
  onClaim: () => void;
  oracleSeries?: OracleSeries;
  poolBalance: bigint;
  onDeposit: (amount: bigint) => void;
};

export function PoolPage(p: Props) {
  const canCommit = p.pool?.phase === "commit" && !p.busy;
  const pair = p.meta?.base && p.meta?.quote ? `${p.meta.base} / ${p.meta.quote}` : "tDUST / mock";
  const [dep, setDep] = useState("500");
  const depAmt = Math.max(0, Math.floor(Number(dep) || 0));

  return (
    <div className="shell">
      <div className="pool-header rise">
        <button className="linklike back" onClick={p.onBack}>
          ← pools
        </button>
        <div className="pool-title">
          <h1>{p.meta?.name || "pool"}</h1>
          <span className="pair-badge mono">{pair}</span>
          {p.pool && <span className="phase-badge">{p.pool.phase}</span>}
        </div>
      </div>

      <main className="grid">
        <div className="col-left">
          <section className="card rise">
            <div className="eyebrow">step 0 · fund</div>
            <h2>pool vault</h2>
            <p className="hint">
              deposit to mint a private note, then orders escrow from it. private balance:{" "}
              <b className="mono" style={{ color: "var(--buy)" }}>{p.poolBalance.toString()}</b>
            </p>
            <div className="join">
              <input value={dep} onChange={(e) => setDep(e.target.value)} inputMode="numeric" />
              <button className="btn" disabled={depAmt <= 0 || !!p.busy} onClick={() => p.onDeposit(BigInt(depAmt))}>
                {p.busy === "depositing to pool" ? "depositing…" : "deposit"}
              </button>
            </div>
          </section>
          <OrderForm disabled={!canCommit} poolBalance={p.poolBalance} onCommit={p.onCommit} />
          <ClaimPanel pool={p.pool} myOrders={p.myOrders} busy={p.busy} onClaim={p.onClaim} onCancel={p.onCancel} />
        </div>
        <div className="col-right">
          <BatchStatus
            pool={p.pool}
            busy={p.busy}
            onReveal={p.onReveal}
            onForceReveal={p.onForceReveal}
            onSettle={p.onSettle}
            onStartNextBatch={p.onStartNextBatch}
          />
          <DepthChart pool={p.pool} />
          <OracleWidget series={p.oracleSeries} />
          <Guide pool={p.pool} />
          <div className="meta">pool · {p.address}</div>
        </div>
      </main>
    </div>
  );
}
