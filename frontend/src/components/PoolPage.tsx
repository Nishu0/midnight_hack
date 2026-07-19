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
};

export function PoolPage(p: Props) {
  const canCommit = p.pool?.phase === "commit" && !p.busy;
  const pair = p.meta?.base && p.meta?.quote ? `${p.meta.base} / ${p.meta.quote}` : "tDUST / mock";

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
          <OrderForm disabled={!canCommit} onCommit={p.onCommit} />
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
