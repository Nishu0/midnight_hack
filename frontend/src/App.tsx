import { useState } from "react";
import { config } from "@/config";
import { useNightPool } from "@/hooks/useNightPool";
import { WalletBar } from "@/components/WalletBar";
import { OrderForm } from "@/components/OrderForm";
import { BatchStatus } from "@/components/BatchStatus";
import { DepthChart } from "@/components/DepthChart";
import { ClaimPanel } from "@/components/ClaimPanel";

export default function App() {
  const np = useNightPool();
  const [joinAddr, setJoinAddr] = useState("");

  const connected = np.status === "connected";
  const hasPool = !!np.contractAddress;
  const canCommit = hasPool && np.pool?.phase === "commit" && !np.busy;

  return (
    <div className="app">
      <WalletBar status={np.status} address={np.address} network={np.network ?? config.networkId} onConnect={np.connect} />

      {np.error && <div className="err">{np.error}</div>}

      {!connected && (
        <div className="hero">
          <h1>trade without leaking your hand</h1>
          <p>
            orders clear in batches at one uniform price. no ordering inside a batch, so
            front-running and sandwiching are impossible by construction.
          </p>
        </div>
      )}

      {connected && !hasPool && (
        <section className="card setup">
          <h2>start a pool</h2>
          <p className="hint">
            dust (fees): {np.dust ? np.dust.balance.toString() : "…"}
            {np.dust ? ` / cap ${np.dust.cap.toString()}` : ""}
            {np.dust && np.dust.balance === 0n ? " — waiting for dust to generate from NIGHT" : ""}
          </p>
          <button className="btn primary" disabled={!!np.busy} onClick={np.deploy}>
            {np.busy === "deploying pool" ? "deploying…" : "deploy new pool"}
          </button>
          {np.busy && <p className="hint">{np.busy}… generating a zk proof, this needs the proof server running and can take 30 to 60s.</p>}
          <div className="or">or</div>
          <div className="join">
            <input placeholder="contract address" value={joinAddr} onChange={(e) => setJoinAddr(e.target.value)} />
            <button className="btn" disabled={!joinAddr || !!np.busy} onClick={() => np.join(joinAddr)}>
              join
            </button>
          </div>
        </section>
      )}

      {connected && hasPool && (
        <main className="grid">
          <div className="col-left">
            <OrderForm disabled={!canCommit} onCommit={np.commit} />
            <ClaimPanel pool={np.pool} myOrders={np.myOrders} busy={np.busy} onClaim={np.claimAll} />
          </div>
          <div className="col-right">
            <BatchStatus pool={np.pool} busy={np.busy} onReveal={np.revealAll} onSettle={np.settle} />
            <DepthChart pool={np.pool} />
            <div className="meta">pool · {np.contractAddress}</div>
          </div>
        </main>
      )}
    </div>
  );
}
