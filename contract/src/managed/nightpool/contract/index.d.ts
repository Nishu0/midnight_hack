import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum Phase { COMMIT = 0, REVEAL = 1, SETTLED = 2 }

export type Order = { side: bigint;
                      amount: bigint;
                      limitTick: bigint;
                      salt: Uint8Array
                    };

export type Witnesses<PS> = {
  getOrder(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Order];
  getSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealOrder(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  settleBatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealOrder(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  settleBatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  orderCommitment(o_0: Order, sk_0: Uint8Array): Uint8Array;
  revealNullifier(o_0: Order, sk_0: Uint8Array): Uint8Array;
  claimNullifier(o_0: Order, sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  orderCommitment(context: __compactRuntime.CircuitContext<PS>,
                  o_0: Order,
                  sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  revealNullifier(context: __compactRuntime.CircuitContext<PS>,
                  o_0: Order,
                  sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  claimNullifier(context: __compactRuntime.CircuitContext<PS>,
                 o_0: Order,
                 sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commitOrder(context: __compactRuntime.CircuitContext<PS>,
              commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  revealOrder(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  settleBatch(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  claim(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly phase: Phase;
  readonly batchId: bigint;
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly committedCount: bigint;
  readonly revealedCount: bigint;
  demand: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  supply: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): bigint;
    [Symbol.iterator](): Iterator<[bigint, bigint]>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly clearingTick: bigint;
  readonly clearedVolume: bigint;
  filled: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): bigint;
    [Symbol.iterator](): Iterator<[Uint8Array, bigint]>
  };
  claimed: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
