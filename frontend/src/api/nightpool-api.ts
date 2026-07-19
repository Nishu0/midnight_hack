// deploy/join + call wiring for the noctis contract. one method per circuit;
// midnight.js handles proof generation (via the proof server) and submission.
// commitments are namespaced by the current on-chain batchId.

import { map, type Observable } from "rxjs";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { contracts } from "@midnight-ntwrk/midnight-js";
import { NightPool, createNightPoolPrivateState, withOrder, witnesses } from "@nightpool/contract";
import type { Order } from "@nightpool/contract";
import { config } from "@/config";
import type { DraftOrder, PoolState, PhaseName } from "@/types";
import { type NightPoolProviders, NIGHTPOOL_PRIVATE_STATE_ID } from "./providers";

const compiled = CompiledContract.make("nightpool", NightPool.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(config.zkConfigPath),
);

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

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

// demand/supply are namespaced by tickKey(batchId, tick); recompute the keys to read
const readTickMap = (
  m: { member: (k: Uint8Array) => boolean; lookup: (k: Uint8Array) => bigint },
  bid: bigint,
): bigint[] =>
  Array.from({ length: 16 }, (_, i) => {
    const k = NightPool.pureCircuits.tickKey(bid, BigInt(i));
    return m.member(k) ? m.lookup(k) : 0n;
  });

const flattenLedger = (l: NightPool.Ledger): PoolState => ({
  phase: phaseName(l.phase),
  batchId: l.batchId,
  committedCount: l.committedCount,
  revealedCount: l.revealedCount,
  clearingTick: l.clearingTick,
  clearedVolume: l.clearedVolume,
  totalBuyVolume: l.totalBuyVolume,
  totalSellVolume: l.totalSellVolume,
  feesAccrued: l.feesAccrued,
  demand: readTickMap(l.demand, l.batchId),
  supply: readTickMap(l.supply, l.batchId),
});

type Deployed =
  | contracts.DeployedContract<NightPool.Contract>
  | contracts.FoundContract<NightPool.Contract>;

export class NightPoolAPI {
  private readonly secretKey = loadSecretKey();

  private constructor(
    public readonly address: string,
    private readonly deployed: Deployed,
    private readonly providers: NightPoolProviders,
  ) {}

  static async deploy(providers: NightPoolProviders): Promise<NightPoolAPI> {
    const deployed = await contracts.deployContract(providers, {
      compiledContract: compiled,
      privateStateId: NIGHTPOOL_PRIVATE_STATE_ID,
      initialPrivateState: createNightPoolPrivateState(randomBytes(32)),
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

  // current on-chain batch id, used to namespace commitments
  private async currentBatchId(): Promise<bigint> {
    const st = await this.providers.publicDataProvider.queryContractState(this.address);
    if (!st) throw new Error("pool state unavailable");
    return NightPool.ledger(st.data).batchId;
  }

  private async stage(order: Order): Promise<void> {
    const prev =
      (await this.providers.privateStateProvider.get(NIGHTPOOL_PRIVATE_STATE_ID)) ??
      createNightPoolPrivateState(this.secretKey);
    await this.providers.privateStateProvider.set(NIGHTPOOL_PRIVATE_STATE_ID, withOrder(prev, order));
  }

  async commit(draft: DraftOrder): Promise<Order> {
    const bid = await this.currentBatchId();
    const order = draftToOrder(draft);
    await this.stage(order);
    const commitment = NightPool.pureCircuits.orderCommitment(order, this.secretKey, bid);
    await this.deployed.callTx.commitOrder(commitment);
    return order;
  }

  async cancel(order: Order): Promise<void> {
    await this.stage(order);
    await this.deployed.callTx.cancelOrder();
  }

  async reveal(order: Order): Promise<void> {
    await this.stage(order);
    await this.deployed.callTx.revealOrder();
  }

  async forceReveal(): Promise<void> {
    await this.deployed.callTx.forceReveal();
  }

  async settle(): Promise<void> {
    await this.deployed.callTx.settleBatch();
  }

  async claim(order: Order): Promise<void> {
    await this.stage(order);
    await this.deployed.callTx.claim();
  }

  async startNextBatch(): Promise<void> {
    await this.deployed.callTx.startNextBatch();
  }

  state$(): Observable<PoolState> {
    return this.providers.publicDataProvider
      .contractStateObservable(this.address, { type: "latest" })
      .pipe(map((s) => flattenLedger(NightPool.ledger(s.data))));
  }
}
