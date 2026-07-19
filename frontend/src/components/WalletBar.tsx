const short = (a?: string) => (a ? `${a.slice(0, 8)}…${a.slice(-6)}` : "");

type Props = {
  status: string;
  address?: string;
  network: string;
  onConnect: () => void;
};

export function WalletBar({ status, address, network, onConnect }: Props) {
  return (
    <header className="bar">
      <div className="brand">
        <span className="dot" />
        NightPool
        <span className="tag">sealed-bid batch DEX</span>
      </div>
      <div className="bar-right">
        <span className="net">{network}</span>
        {status === "connected" ? (
          <span className="addr">{short(address)}</span>
        ) : (
          <button className="btn" onClick={onConnect} disabled={status === "connecting"}>
            {status === "connecting" ? "connecting…" : "connect Lace"}
          </button>
        )}
      </div>
    </header>
  );
}
