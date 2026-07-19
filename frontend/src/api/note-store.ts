// local shielded-note store. private balance = sum of unspent notes, computed here
// and never put on-chain. keyed by network + wallet address.

import { toHex, fromHex } from "./secret";

export type LocalNote = { amount: bigint; salt: Uint8Array; spent: boolean; createdAt: number };
type Stored = { amount: string; salt: string; spent: boolean; createdAt: number };

const key = (network: string, addr: string) => `noctis.notes.${network}.${addr.slice(0, 24)}`;

const read = (network: string, addr: string): Stored[] => {
  try {
    return JSON.parse(localStorage.getItem(key(network, addr)) ?? "[]") as Stored[];
  } catch {
    return [];
  }
};

const write = (network: string, addr: string, notes: Stored[]) =>
  localStorage.setItem(key(network, addr), JSON.stringify(notes));

export const noteStore = {
  list(network: string, addr: string): LocalNote[] {
    return read(network, addr).map((n) => ({
      amount: BigInt(n.amount),
      salt: fromHex(n.salt),
      spent: n.spent,
      createdAt: n.createdAt,
    }));
  },

  unspent(network: string, addr: string): LocalNote[] {
    return this.list(network, addr).filter((n) => !n.spent);
  },

  balance(network: string, addr: string): bigint {
    return this.unspent(network, addr).reduce((sum, n) => sum + n.amount, 0n);
  },

  add(network: string, addr: string, amount: bigint, salt: Uint8Array): void {
    if (amount <= 0n) return;
    const notes = read(network, addr);
    notes.push({ amount: amount.toString(), salt: toHex(salt), spent: false, createdAt: Date.now() });
    write(network, addr, notes);
  },

  markSpent(network: string, addr: string, salt: Uint8Array): void {
    const h = toHex(salt);
    const notes = read(network, addr).map((n) => (n.salt === h ? { ...n, spent: true } : n));
    write(network, addr, notes);
  },
};
