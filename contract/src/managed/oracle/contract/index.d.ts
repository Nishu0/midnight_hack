import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type PricePoint = { batchId: bigint; tick: bigint; volume: bigint };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  recordBatch(context: __compactRuntime.CircuitContext<PS>,
              batchId_0: bigint,
              tick_0: bigint,
              volume_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  recordBatch(context: __compactRuntime.CircuitContext<PS>,
              batchId_0: bigint,
              tick_0: bigint,
              volume_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  recordBatch(context: __compactRuntime.CircuitContext<PS>,
              batchId_0: bigint,
              tick_0: bigint,
              volume_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly latestBatchId: bigint;
  readonly recorded: bigint;
  readonly head: bigint;
  ring: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): PricePoint;
    [Symbol.iterator](): Iterator<[bigint, PricePoint]>
  };
  readonly cumTickVolume: bigint;
  readonly cumVolume: bigint;
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
