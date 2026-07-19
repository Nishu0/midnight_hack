// nightpool private state + witness impls.
// SPDX-License-Identifier: Apache-2.0
// the only bridge between a trader's local state and the circuits: hands over the
// raw order + secret key so the proof can run, without either touching the chain.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Order, Note } from "./managed/nightpool/contract/index.js";

// secretKey binds every commitment/nullifier to this user.
// order is the one being committed/revealed/claimed; note is the funding note spent
// to escrow a commit; newSalt is the salt for the change/payout note being minted.
export type NightPoolPrivateState = {
  readonly secretKey: Uint8Array;
  readonly order: Order | null;
  readonly note: Note | null;
  readonly newSalt: Uint8Array | null;
};

export const createNightPoolPrivateState = (
  secretKey: Uint8Array,
  order: Order | null = null,
): NightPoolPrivateState => ({ secretKey, order, note: null, newSalt: null });

// stage the fields an op needs, returning a new private state
export const stageOp = (
  state: NightPoolPrivateState,
  op: Partial<Omit<NightPoolPrivateState, "secretKey">>,
): NightPoolPrivateState => ({ ...state, ...op });

// stage (or replace) the order held in a private state
export const withOrder = (
  state: NightPoolPrivateState,
  order: Order,
): NightPoolPrivateState => ({ ...state, order });

const need = <T>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) throw new Error(`NightPool: ${what} not staged in private state`);
  return v;
};

export const witnesses = {
  getOrder: ({
    privateState,
  }: WitnessContext<Ledger, NightPoolPrivateState>): [
    NightPoolPrivateState,
    Order,
  ] => {
    if (privateState.order === null) {
      throw new Error("NightPool: no order staged in private state");
    }
    return [privateState, privateState.order];
  },

  getSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, NightPoolPrivateState>): [
    NightPoolPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  // floor(a / b); the circuit re-verifies q*b <= a < (q+1)*b, so this is trusted only
  // to be the correct quotient, never for soundness.
  divFloor: (
    { privateState }: WitnessContext<Ledger, NightPoolPrivateState>,
    a: bigint,
    b: bigint,
  ): [NightPoolPrivateState, bigint] => [privateState, b === 0n ? 0n : a / b],

  getFundingNote: ({ privateState }: WitnessContext<Ledger, NightPoolPrivateState>): [NightPoolPrivateState, Note] => [
    privateState,
    need(privateState.note, "funding note"),
  ],

  getNewSalt: ({ privateState }: WitnessContext<Ledger, NightPoolPrivateState>): [NightPoolPrivateState, Uint8Array] => [
    privateState,
    need(privateState.newSalt, "newSalt"),
  ],
};
