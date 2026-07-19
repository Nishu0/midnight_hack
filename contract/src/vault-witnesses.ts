// vault private state + witnesses. the frontend stages exactly what each op needs
// (the note to spend, the new salts, the split amount) before calling, so it knows
// every new note's salt and can persist it in the local note store.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger, Note } from "./managed/vault/contract/index.js";

export type VaultPrivateState = {
  readonly secretKey: Uint8Array;
  readonly note: Note | null; // note being spent (withdraw/split)
  readonly newSalt: Uint8Array | null; // primary new note salt
  readonly changeSalt: Uint8Array | null; // change note salt (split)
  readonly splitAmount: bigint | null; // order-note amount (split)
};

export const createVaultPrivateState = (secretKey: Uint8Array): VaultPrivateState => ({
  secretKey,
  note: null,
  newSalt: null,
  changeSalt: null,
  splitAmount: null,
});

// stage the fields an op needs, returning a new private state
export const stageVaultOp = (
  s: VaultPrivateState,
  op: Partial<Omit<VaultPrivateState, "secretKey">>,
): VaultPrivateState => ({ ...s, ...op });

const need = <T>(v: T | null | undefined, what: string): T => {
  if (v === null || v === undefined) throw new Error(`Vault: ${what} not staged in private state`);
  return v;
};

export const vaultWitnesses = {
  getSecretKey: ({ privateState }: WitnessContext<Ledger, VaultPrivateState>): [VaultPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  getVaultNote: ({ privateState }: WitnessContext<Ledger, VaultPrivateState>): [VaultPrivateState, Note] => [
    privateState,
    need(privateState.note, "note"),
  ],
  getNewSalt: ({ privateState }: WitnessContext<Ledger, VaultPrivateState>): [VaultPrivateState, Uint8Array] => [
    privateState,
    need(privateState.newSalt, "newSalt"),
  ],
  getChangeSalt: ({ privateState }: WitnessContext<Ledger, VaultPrivateState>): [VaultPrivateState, Uint8Array] => [
    privateState,
    need(privateState.changeSalt, "changeSalt"),
  ],
  getSplitAmount: ({ privateState }: WitnessContext<Ledger, VaultPrivateState>): [VaultPrivateState, bigint] => [
    privateState,
    need(privateState.splitAmount, "splitAmount"),
  ],
};
