import type { PoolState } from "@/types";

const STEPS = [
  { k: "commit", icon: "🔒", do: "set side, amount, price → commit sealed order", get: "only a hash on-chain; your order stays private" },
  { k: "reveal", icon: "🔎", do: "once the batch fills, hit reveal my orders", get: "your size folds into the public depth curve" },
  { k: "settle", icon: "⚖️", do: "hit settle batch", get: "one fair clearing price for everyone" },
  { k: "claim", icon: "💸", do: "hit claim proceeds", get: "your fill, via an unlinkable nullifier" },
];

const phaseIdx = { commit: 0, reveal: 1, settled: 2 } as const;

type Props = { pool?: PoolState };

export function Guide({ pool }: Props) {
  const active = pool ? phaseIdx[pool.phase] : 0;
  return (
    <section className="card guide rise">
      <div className="eyebrow">how this works</div>
      <h2>what to do · what you get</h2>
      <ol className="guide-list">
        {STEPS.map((s, i) => (
          <li key={s.k} className={i === active ? "here" : i < active ? "past" : ""}>
            <span className="g-ic">{s.icon}</span>
            <div className="g-body">
              <div className="g-do">
                <b>{s.k}</b> — {s.do}
              </div>
              <div className="g-get">↳ {s.get}</div>
            </div>
            {i === active && <span className="g-now">you are here</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
