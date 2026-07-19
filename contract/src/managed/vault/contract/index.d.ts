import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Note = { amount: bigint; salt: Uint8Array };

export type Witnesses<PS> = {
  getSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getVaultNote(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Note];
  getNewSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getChangeSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getSplitAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  splitNote(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  deposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  splitNote(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  noteCommitment(sk_0: Uint8Array, amount_0: bigint, salt_0: Uint8Array): Uint8Array;
  noteNullifier(sk_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  noteCommitment(context: __compactRuntime.CircuitContext<PS>,
                 sk_0: Uint8Array,
                 amount_0: bigint,
                 salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  noteNullifier(context: __compactRuntime.CircuitContext<PS>,
                sk_0: Uint8Array,
                salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deposit(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  splitNote(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  noteCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  noteNullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  readonly totalDeposited: bigint;
  readonly noteCount: bigint;
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
