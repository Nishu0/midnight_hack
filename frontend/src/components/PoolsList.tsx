import { useState } from "react";
import type { PoolRecord } from "@/api/registry";

const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
const when = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
};

type Props = {
  pools: PoolRecord[];
  busy?: string;
  onCreate: () => void;
  onVault: () => void;
  onOpen: (rec: PoolRecord) => void;
  onOpenAddress: (address: string) => void;
  onRefresh: () => void;
};

export function PoolsList({ pools, busy, onCreate, onVault, onOpen, onOpenAddress, onRefresh }: Props) {
  const [addr, setAddr] = useState("");

  return (
    <div className="shell">
      <div className="pools-head rise">
        <div>
          <div className="eyebrow">markets</div>
          <h1 className="pools-title">pools</h1>
          <p className="hint">sealed-bid batch auction markets. open one to trade, or spin up your own.</p>
        </div>
        <div className="pools-actions">
          <button className="btn" onClick={onVault} disabled={!!busy}>
            🔒 vault
          </button>
          <button className="btn" onClick={onRefresh} disabled={!!busy}>
            refresh
          </button>
          <button className="btn primary" onClick={onCreate} disabled={!!busy}>
            + create pool
          </button>
        </div>
      </div>

      <div className="pool-grid">
        {pools.length === 0 && (
          <div className="card empty-pools rise">
            <div className="ic">🌘</div>
            <h3>no pools yet</h3>
            <p className="hint">be the first — create a pool and share its address.</p>
            <button className="btn primary" onClick={onCreate} disabled={!!busy}>
              + create the first pool
            </button>
          </div>
        )}

        {pools.map((p, i) => (
          <button
            key={p.id}
            className={`pool-card rise rise-${(i % 4) + 1}`}
            onClick={() => onOpen(p)}
            disabled={!!busy}
          >
            <div className="pool-card-top">
              <span className="pair">{p.base && p.quote ? `${p.base} / ${p.quote}` : "tDUST / mock"}</span>
              <span className="chev">→</span>
            </div>
            <h3>{p.name || "unnamed pool"}</h3>
            <div className="pool-card-meta">
              <span className="mono">{short(p.address)}</span>
              <span>{when(p.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="card open-by-addr rise">
        <div className="eyebrow">have an address?</div>
        <h3>open a pool directly</h3>
        <div className="join">
          <input placeholder="contract address" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <button className="btn" disabled={!addr || !!busy} onClick={() => onOpenAddress(addr.trim())}>
            open
          </button>
        </div>
      </div>
    </div>
  );
}
