import type { NightPool } from "@nightpool/contract";

export type Side = "buy" | "sell";

// what the user types into the order form before it's sealed
export type DraftOrder = {
  side: Side;
  amount: bigint;
  limitTick: number;
};

export const PHASES = ["commit", "reveal", "settled"] as const;
export type PhaseName = (typeof PHASES)[number];

// flattened public state we render from the ledger
export type PoolState = {
  phase: PhaseName;
  batchId: bigint;
  committedCount: bigint;
  revealedCount: bigint;
  clearingTick: bigint;
  clearedVolume: bigint;
  demand: bigint[]; // indexed by tick
  supply: bigint[];
};

export type Ledger = NightPool.Ledger;
