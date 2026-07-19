const short = (a?: string) => (a ? `${a.slice(0, 10)}…${a.slice(-5)}` : "");

type Props = {
  status: string;
  address?: string;
  network: string;
  onConnect: () => void;
  onHelp: () => void;
};

export function WalletBar({
  status,
  address,
  network,
  onConnect,
  onHelp,
}: Props) {
  const connected = status === "connected";
  return (
    <header className="bar">
      <div className="brand">
        <span className="dot" />
        Noctis
        <span className="tag">sealed-bid batch DEX</span>
      </div>
      <div className="bar-right">
        {connected && <span className="net">{network}</span>}
        {connected ? (
          <span className="addr mono">{short(address)}</span>
        ) : (
          <button
            className="btn primary"
            onClick={onConnect}
            disabled={status === "connecting"}
          >
            {status === "connecting" ? "connecting…" : "connect Lace"}
          </button>
        )}
        <button
          className="btn help-btn"
          onClick={onHelp}
          title="how it works"
          aria-label="how it works"
        >
          ?
        </button>
      </div>
    </header>
  );
}
