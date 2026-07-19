type Props = {
  connecting: boolean;
  onConnect: () => void;
  onTour: () => void;
};

const STEPS = [
  { n: "01", h: "commit", p: "publish only a hash of your order. side, size and price stay in your wallet." },
  { n: "02", h: "reveal", p: "prove your order in zk. it folds into public per-tick totals, not per-trader rows." },
  { n: "03", h: "settle", p: "one uniform clearing price for the whole batch. no ordering, no front-running." },
  { n: "04", h: "claim", p: "withdraw your fill through a nullifier that can't be linked to your commitment." },
];

const FEATURES = [
  { ic: "🛡️", h: "mev-proof by design", p: "no ordering inside a batch means there is no position to front-run or sandwich." },
  { ic: "🌘", h: "sealed until settled", p: "orders are hashes on-chain. size and intent never leak before execution." },
  { ic: "⚡", h: "one clearing price", p: "everyone in the batch trades at the same price where demand crosses supply." },
];

export function Landing({ connecting, onConnect, onTour }: Props) {
  return (
    <div className="landing">
      <div className="orb a" />
      <div className="orb b" />

      <section className="hero">
        <span className="kicker rise rise-1">
          <span className="ping" /> sealed-bid batch auction dex · built on midnight
        </span>
        <h1 className="rise rise-2">
          trade in the dark.<br />
          <span className="grad">settle in the light.</span>
        </h1>
        <p className="lede rise rise-3">
          NightPool clears trades in private batches at a single uniform price. your order is a
          sealed hash until the batch settles, so bots can't front-run, sandwich, or read your hand.
        </p>
        <div className="cta rise rise-4">
          <button className="btn primary xl" onClick={onConnect} disabled={connecting}>
            {connecting ? "connecting…" : "connect wallet"}
          </button>
          <button className="btn ghost xl" onClick={onTour}>
            how it works
          </button>
        </div>
      </section>

      <section className="steps">
        {STEPS.map((s, i) => (
          <div className={`step rise rise-${(i % 4) + 1}`} key={s.n}>
            <div className="n">{s.n}</div>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </div>
        ))}
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div className="feature" key={f.h}>
            <div className="ic">{f.ic}</div>
            <h3>{f.h}</h3>
            <p>{f.p}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
