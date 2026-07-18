// deploy/join + call wiring for the nightpool contract. one method per circuit;
// midnight.js handles proof generation (via the proof server) and submission.

import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { contracts } from "@midnight-ntwrk/midnight-js";
import { NightPool, createNightPoolPrivateState, withOrder, witnesses } from "@nightpool/contract";
import type { Order } from "@nightpool/contract";
import { config } from "@/config";
import type { DraftOrder, PoolState, PhaseName } from "@/types";
import type { NightPoolProviders } from "./providers";

export const NIGHTPOOL_PRIVATE_STATE_ID = "nightpoolPrivateState";

const compiled = CompiledContract.make("nightpool", NightPool.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(config.zkConfigPath),
);

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

// a per-user secret key, persisted so commitments/claims stay linkable locally
const loadSecretKey = (): Uint8Array => {
  const stored = localStorage.getItem("nightpool.sk");
  if (stored) return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  const sk = randomBytes(32);
  localStorage.setItem("nightpool.sk", btoa(String.fromCharCode(...sk)));
  return sk;
};

const draftToOrder = (draft: DraftOrder): Order => ({
  side: draft.side === "buy" ? 0n : 1n,
  amount: draft.amount,
  limitTick: BigInt(draft.limitTick),
  salt: randomBytes(32),
});

const phaseName = (p: NightPool.Phase): PhaseName =>
  p === NightPool.Phase.COMMIT ? "commit" : p === NightPool.Phase.REVEAL ? "reveal" : "settled";

const readTickMap = (m: { member: (k: bigint) => boolean; lookup: (k: bigint) => bigint }): bigint[] =>
  Array.from({ length: 16 }, (_, i) => (m.member(BigInt(i)) ? m.lookup(BigInt(i)) : 0n));

export const flattenLedger = (l: NightPool.Ledger): PoolState => ({
  phase: phaseName(l.phase),
  batchId: l.batchId,
  committedCount: l.committedCount,
  revealedCount: l.revealedCount,
  clearingTick: l.clearingTick,
  clearedVolume: l.clearedVolume,
  demand: readTickMap(l.demand),
  supply: readTickMap(l.supply),
});

export class NightPoolAPI {
  private readonly secretKey = loadSecretKey();

  private constructor(
    public readonly address: string,
    private readonly deployed: contracts.DeployedContract<NightPool.Contract> | contracts.FoundContract<NightPool.Contract>,
    private readonly providers: NightPoolProviders,
  ) {}

  static async deploy(providers: NightPoolProviders): Promise<NightPoolAPI> {
    const deployed = await contracts.deployContract(providers, {
      compiledContract: compiled,
      privateStateId: NIGHTPOOL_PRIVATE_STATE_ID,
      initialPrivateState: createNightPoolPrivateState(randomBytes(32)),
      args: [],
    });
    return new NightPoolAPI(deployed.deployTxData.public.contractAddress, deployed, providers);
  }

  static async join(providers: NightPoolProviders, address: string): Promise<NightPoolAPI> {
    const deployed = await contracts.findDeployedContract(providers, {
      contractAddress: address,
      compiledContract: compiled,
      privateStateId: NIGHTPOOL_PRIVATE_STATE_ID,
      initialPrivateState: createNightPoolPrivateState(randomBytes(32)),
    });
    return new NightPoolAPI(address, deployed, providers);
  }

  // stage the order locally so the witness functions can hand it to the proof
  private async stage(order: Order): Promise<void> {
    const prev =
      (await this.providers.privateStateProvider.get(NIGHTPOOL_PRIVATE_STATE_ID)) ??
      createNightPoolPrivateState(this.secretKey);
    await this.providers.privateStateProvider.set(NIGHTPOOL_PRIVATE_STATE_ID, withOrder(prev, order));
  }

  // commit: seal the order to a hash and publish only that
  async commit(draft: DraftOrder): Promise<Order> {
    const order = draftToOrder(draft);
    await this.stage(order);
    const commitment = NightPool.pureCircuits.orderCommitment(order, this.secretKey);
    await this.deployed.callTx.commitOrder(commitment);
    return order;
  }

  // reveal the previously committed order (must still be staged locally)
  async reveal(order: Order): Promise<void> {
    await this.stage(order);
    await this.deployed.callTx.revealOrder();
  }

  async settle(): Promise<void> {
    await this.deployed.callTx.settleBatch();
  }

  async claim(order: Order): Promise<void> {
    await this.stage(order);
    await this.deployed.callTx.claim();
  }

  // live public state, driven by the indexer
  state$() {
    return this.providers.publicDataProvider
      .contractStateObservable(this.address, { type: "latest" })
      .pipe();
  }

  ledgerOf(raw: unknown): PoolState {
    return flattenLedger(NightPool.ledger(raw));
  }
}
