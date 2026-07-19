// deploy/join + deposit/withdraw for the shielded note vault. new-note salts are
// generated here and persisted in the local note store, so the client always knows
// its unspent notes (the on-chain contract only sees commitments/nullifiers).

import { map, type Observable } from "rxjs";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { contracts } from "@midnight-ntwrk/midnight-js";
import { Vault, createVaultPrivateState, stageVaultOp, vaultWitnesses } from "@nightpool/contract";
import type { VaultPrivateState } from "@nightpool/contract";
import { config } from "@/config";
import { loadSecretKey, randomBytes } from "./secret";
import { noteStore, type LocalNote } from "./note-store";
import { type VaultProviders, VAULT_PRIVATE_STATE_ID } from "./providers";

const compiled = CompiledContract.make("vault", Vault.Contract).pipe(
  CompiledContract.withWitnesses(vaultWitnesses),
  CompiledContract.withCompiledFileAssets(config.zkVaultPath),
);

type Deployed =
  | contracts.DeployedContract<Vault.Contract>
  | contracts.FoundContract<Vault.Contract>;

export class VaultAPI {
  private readonly secretKey = loadSecretKey();

  private constructor(
    public readonly address: string,
    private readonly deployed: Deployed,
    private readonly providers: VaultProviders,
  ) {}

  static async deploy(providers: VaultProviders): Promise<VaultAPI> {
    const d = await contracts.deployContract(providers, {
      compiledContract: compiled,
      privateStateId: VAULT_PRIVATE_STATE_ID,
      initialPrivateState: createVaultPrivateState(loadSecretKey()),
    });
    return new VaultAPI(d.deployTxData.public.contractAddress, d, providers);
  }

  static async join(providers: VaultProviders, address: string): Promise<VaultAPI> {
    const d = await contracts.findDeployedContract(providers, {
      contractAddress: address,
      compiledContract: compiled,
      privateStateId: VAULT_PRIVATE_STATE_ID,
      initialPrivateState: createVaultPrivateState(loadSecretKey()),
    });
    return new VaultAPI(address, d, providers);
  }

  private async stage(op: Partial<Omit<VaultPrivateState, "secretKey">>): Promise<void> {
    const prev =
      (await this.providers.privateStateProvider.get(VAULT_PRIVATE_STATE_ID)) ??
      createVaultPrivateState(this.secretKey);
    await this.providers.privateStateProvider.set(VAULT_PRIVATE_STATE_ID, stageVaultOp(prev, op));
  }

  // deposit: public amount in, mint a private note (persisted locally)
  async deposit(network: string, addr: string, amount: bigint): Promise<void> {
    const salt = randomBytes(32);
    await this.stage({ newSalt: salt });
    await this.deployed.callTx.deposit(amount);
    noteStore.add(network, addr, amount, salt);
  }

  // withdraw `amount` out of `note`; the remainder becomes a fresh change note
  async withdraw(network: string, addr: string, note: LocalNote, amount: bigint): Promise<void> {
    const changeSalt = randomBytes(32);
    await this.stage({ note: { amount: note.amount, salt: note.salt }, newSalt: changeSalt });
    await this.deployed.callTx.withdraw(amount);
    noteStore.markSpent(network, addr, note.salt);
    const change = note.amount - amount;
    if (change > 0n) noteStore.add(network, addr, change, changeSalt);
  }

  // public aggregate (never per-note)
  totalDeposited$(): Observable<bigint> {
    return this.providers.publicDataProvider
      .contractStateObservable(this.address, { type: "latest" })
      .pipe(map((s) => Vault.ledger(s.data).totalDeposited));
  }
}
