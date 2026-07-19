import { useEffect, useState } from "react";
import { config } from "@/config";
import { useNightPool } from "@/hooks/useNightPool";
import { WalletBar } from "@/components/WalletBar";
import { Landing } from "@/components/Landing";
import { Onboarding } from "@/components/Onboarding";
import { PoolsList } from "@/components/PoolsList";
import { CreatePool } from "@/components/CreatePool";
import { PoolPage } from "@/components/PoolPage";

const SEEN_KEY = "nightpool.onboarded";

export default function App() {
  const np = useNightPool();
  const [view, setView] = useState<"pools" | "create">("pools");
  const [tour, setTour] = useState(false);

  const connected = np.status === "connected";
  const inPool = !!np.contractAddress;

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

      {connected && inPool && (
        <PoolPage
          meta={np.poolMeta}
          address={np.contractAddress}
          pool={np.pool}
          myOrders={np.myOrders}
          busy={np.busy}
          onBack={np.closePool}
          onCommit={np.commit}
          onReveal={np.revealAll}
          onSettle={np.settle}
          onClaim={np.claimAll}
        />
      )}

      {connected && !inPool && view === "pools" && (
        <PoolsList
          pools={np.pools}
          busy={np.busy}
          onCreate={() => setView("create")}
          onOpen={(rec) => np.openPool(rec)}
          onOpenAddress={(address) => np.openPool({ address })}
          onRefresh={np.refreshPools}
        />
      )}

      {connected && !inPool && view === "create" && (
        <CreatePool busy={np.busy} dust={np.dust} onBack={() => setView("pools")} onDeploy={np.createPool} />
      )}

      {tour && <Onboarding onClose={() => setTour(false)} />}
    </div>
  );
}
