// nightpool private state + witness impls.
// SPDX-License-Identifier: Apache-2.0
// the only bridge between a trader's local state and the circuits: hands over the
// raw order + secret key so the proof can run, without either touching the chain.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Order } from "./managed/nightpool/contract/index.js";

// secretKey binds every commitment/nullifier to this user.
// order is the one being committed/revealed/claimed, null when nothing staged.
export type NightPoolPrivateState = {
  readonly secretKey: Uint8Array;
  readonly order: Order | null;
};

export const createNightPoolPrivateState = (
  secretKey: Uint8Array,
  order: Order | null = null,
): NightPoolPrivateState => ({ secretKey, order });

// stage (or replace) the order held in a private state
export const withOrder = (
  state: NightPoolPrivateState,
  order: Order,
): NightPoolPrivateState => ({ ...state, order });

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
};
