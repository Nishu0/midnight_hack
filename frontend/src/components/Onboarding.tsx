import { useState } from "react";

type Props = { onClose: () => void };

const STEPS = [
  {
    icon: "🌘",
    badge: "welcome",
    title: "welcome to Noctis",
    body: "a dex where trades clear in sealed batches at one uniform price. here's the four-step flow you'll drive from this screen.",
  },
  {
    icon: "🔒",
    badge: "step 1 · commit",
    title: "commit a sealed order",
    body: "pick buy or sell, an amount, and a limit price tick, then hit commit order. only a hash goes on-chain — nobody can see your size or price. a batch holds 2 orders; commit both (e.g. one buy, one sell) to fill it.",
  },
  {
    icon: "🔎",
    badge: "step 2 · reveal",
    title: "reveal into the aggregate",
    body: "once the batch is full it moves to the reveal phase. hit reveal my orders to prove them in zk. your amounts fold into the public demand / supply curves in the depth chart — totals per tick are visible, who bid what is not.",
  },
  {
    icon: "⚖️",
    badge: "step 3 · settle",
    title: "settle the batch",
    body: "anyone can hit settle batch. the contract scans all 16 price ticks and picks the one clearing price where matched volume is highest. no order is ordered against another, so there's nothing to front-run.",
  },
  {
    icon: "💸",
    badge: "step 4 · claim",
    title: "claim your fill",
    body: "after settlement, open the claim panel and withdraw. your payout is recorded against a nullifier that can't be linked back to your original commitment. if the batch never crossed, everyone is refunded in full.",
  },
];

export function Onboarding({ onClose }: Props) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="tour-scrim" onClick={onClose}>
      <div className="tour" onClick={(e) => e.stopPropagation()}>
        <div className="step-badge">{step.badge}</div>
        <div className="icon">{step.icon}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>

        <div className="dots">
          {STEPS.map((_, k) => (
            <i key={k} className={k === i ? "on" : ""} />
          ))}
        </div>

        <div className="row">
          <button className="skip" onClick={onClose}>
            skip
          </button>
          <div className="nav">
            {i > 0 && (
              <button className="btn" onClick={() => setI(i - 1)}>
                back
              </button>
            )}
            <button className="btn primary" onClick={() => (last ? onClose() : setI(i + 1))}>
              {last ? "start trading" : "next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
