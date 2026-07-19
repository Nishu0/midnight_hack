import { useEffect, useState } from "react";
import { config } from "@/config";
import { useNightPool } from "@/hooks/useNightPool";
import { WalletBar } from "@/components/WalletBar";
import { Landing } from "@/components/Landing";
import { Onboarding } from "@/components/Onboarding";
import { OrderForm } from "@/components/OrderForm";
import { BatchStatus } from "@/components/BatchStatus";
import { DepthChart } from "@/components/DepthChart";
import { ClaimPanel } from "@/components/ClaimPanel";

const SEEN_KEY = "nightpool.onboarded";

export default function App() {
  const np = useNightPool();
  const [joinAddr, setJoinAddr] = useState("");
  const [tour, setTour] = useState(false);

  const connected = np.status === "connected";
  const hasPool = !!np.contractAddress;
  const canCommit = hasPool && np.pool?.phase === "commit" && !np.busy;

  // auto-open the tour the first time someone lands in the app
  useEffect(() => {
    if (connected && !localStorage.getItem(SEEN_KEY)) {
      setTour(true);
      localStorage.setItem(SEEN_KEY, "1");
    }
  }, [connected]);

  return (
    <div className="app">
      <WalletBar
        status={np.status}
        address={np.address}
        network={np.network ?? config.networkId}
        onConnect={np.connect}
        onHelp={() => setTour(true)}
      />

      {np.error && <div className="err">{np.error}</div>}

      {!connected && <Landing connecting={np.status === "connecting"} onConnect={np.connect} onTour={() => setTour(true)} />}

      {connected && (
        <div className="shell">
          {!hasPool && (
            <section className="card setup rise">
              <div className="eyebrow">get started</div>
              <h2>start a pool</h2>
              <p className="dust-line">
                dust for fees: <b>{np.dust ? np.dust.balance.toString() : "…"}</b>
                {np.dust ? ` / cap ${np.dust.cap.toString()}` : ""}
                {np.dust && np.dust.balance === 0n ? " · waiting for dust to generate from NIGHT" : ""}
              </p>
              <button className="btn primary xl" disabled={!!np.busy} onClick={np.deploy}>
                {np.busy === "deploying pool" ? "deploying…" : "deploy new pool"}
              </button>
              {np.busy && <p className="hint">{np.busy}… generating a zk proof, this can take 30 to 60s.</p>}
              <div className="or">— or join one —</div>
              <div className="join">
                <input placeholder="contract address" value={joinAddr} onChange={(e) => setJoinAddr(e.target.value)} />
                <button className="btn" disabled={!joinAddr || !!np.busy} onClick={() => np.join(joinAddr)}>
                  join
                </button>
              </div>
            </section>
          )}

          {hasPool && (
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
      )}

      {tour && <Onboarding onClose={() => setTour(false)} />}
    </div>
  );
}
