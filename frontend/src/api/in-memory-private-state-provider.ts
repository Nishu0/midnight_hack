// browser private state store. the level provider uses classic-level (a native
// node addon) which doesn't run in the browser, so we keep private state in memory.
// state lives for the session, which is all a single-batch demo needs.

import type { SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { ContractAddress } from "@midnight-ntwrk/ledger-v8";
import { types } from "@midnight-ntwrk/midnight-js";

export const inMemoryPrivateStateProvider = <PSI extends types.PrivateStateId, PS>(): types.PrivateStateProvider<
  PSI,
  PS
> => {
  const record = new Map<PSI, PS>();
  const signingKeys = {} as Record<ContractAddress, SigningKey>;

  return {
    setContractAddress(): void {},
    set(key: PSI, state: PS): Promise<void> {
      record.set(key, state);
      return Promise.resolve();
    },
    get(key: PSI): Promise<PS | null> {
      return Promise.resolve(record.get(key) ?? null);
    },
    remove(key: PSI): Promise<void> {
      record.delete(key);
      return Promise.resolve();
    },
    clear(): Promise<void> {
      record.clear();
      return Promise.resolve();
    },
    setSigningKey(address: ContractAddress, key: SigningKey): Promise<void> {
      signingKeys[address] = key;
      return Promise.resolve();
    },
    getSigningKey(address: ContractAddress): Promise<SigningKey | null> {
      return Promise.resolve(signingKeys[address] ?? null);
    },
    removeSigningKey(address: ContractAddress): Promise<void> {
      delete signingKeys[address];
      return Promise.resolve();
    },
    clearSigningKeys(): Promise<void> {
      for (const a of Object.keys(signingKeys)) delete signingKeys[a];
      return Promise.resolve();
    },
    exportPrivateStates(): Promise<types.PrivateStateExport> {
      return Promise.reject(new Error("not supported by the in-memory provider"));
    },
    importPrivateStates(): Promise<types.ImportPrivateStatesResult> {
      return Promise.reject(new Error("not supported by the in-memory provider"));
    },
    exportSigningKeys(): Promise<types.SigningKeyExport> {
      return Promise.reject(new Error("not supported by the in-memory provider"));
    },
    importSigningKeys(): Promise<types.ImportSigningKeysResult> {
      return Promise.reject(new Error("not supported by the in-memory provider"));
    },
  };
};
