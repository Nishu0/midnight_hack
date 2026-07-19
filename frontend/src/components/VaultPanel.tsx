import { useState } from "react";
import type { LocalNote } from "@/api/note-store";

const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;

type Props = {
  vaultAddress?: string;
  vaultBalance: bigint;
  notes: LocalNote[];
  busy?: string;
  onBack: () => void;
  onDeploy: () => void;
  onDeposit: (amount: bigint) => void;
  onWithdraw: (note: LocalNote, amount: bigint) => void;
};

export function VaultPanel(p: Props) {
  const [amount, setAmount] = useState("100");
  const amt = Math.max(0, Math.floor(Number(amount) || 0));

  return (
    <div className="shell">
      <button className="linklike back" onClick={p.onBack}>
        ← pools
      </button>

      {!p.vaultAddress ? (
        <section className="card setup rise">
          <div className="eyebrow">shielded balance</div>
          <h2>vault</h2>
          <p className="hint">
            deposit a token and it becomes a private note. the chain sees only commitments and
            nullifiers, never amounts or owners.
          </p>
          <button className="btn primary xl" disabled={!!p.busy} onClick={p.onDeploy}>
            {p.busy === "deploying vault" ? "deploying…" : "deploy vault"}
          </button>
        </section>
      ) : (
        <div className="grid">
          <div className="col-left">
            <section className="card rise">
              <div className="eyebrow">private balance</div>
              <h2 className="vault-balance mono">{p.vaultBalance.toString()}</h2>
              <p className="hint">sum of your unspent notes · computed locally, never on-chain</p>

              <label>
                amount
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
              </label>
              <button
                className="btn primary xl"
                style={{ width: "100%" }}
                disabled={amt <= 0 || !!p.busy}
                onClick={() => p.onDeposit(BigInt(amt))}
              >
                {p.busy === "depositing to vault" ? "depositing…" : "deposit"}
              </button>
              <div className="meta">vault · {short(p.vaultAddress)}</div>
            </section>
          </div>

          <div className="col-right">
            <section className="card rise">
              <div className="eyebrow">your notes</div>
              <h2>unspent notes</h2>
              <p className="hint">each note is a private commitment. withdraw spends it and mints change.</p>
              <ul className="orders">
                {p.notes.length === 0 && <li className="empty">no notes yet — deposit to create one</li>}
                {p.notes.map((n, i) => (
                  <li key={i}>
                    <span className="buy">note</span>
                    <span className="mono">{n.amount.toString()}</span>
                    <button className="linklike" disabled={!!p.busy} onClick={() => p.onWithdraw(n, n.amount)}>
                      withdraw all
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
