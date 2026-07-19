// deploy/join + call wiring for the noctis contract. one method per circuit;
// midnight.js handles proof generation (via the proof server) and submission.
// commitments are namespaced by the current on-chain batchId.

import { map, type Observable } from "rxjs";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { contracts } from "@midnight-ntwrk/midnight-js";
import { NightPool, createNightPoolPrivateState, stageOp, witnesses } from "@nightpool/contract";
import type { Order } from "@nightpool/contract";
import { config } from "@/config";
import { randomBytes, loadSecretKey } from "./secret";
import { noteStore } from "./note-store";
import type { DraftOrder, PoolState, PhaseName } from "@/types";
import { type NightPoolProviders, NIGHTPOOL_PRIVATE_STATE_ID } from "./providers";

const compiled = CompiledContract.make("nightpool", NightPool.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(config.zkConfigPath),
);

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

  // note scope = this pool's contract address (each pool has its own vault notes)
  private get scope(): string {
    return this.address;
  }

  private async stage(op: Parameters<typeof stageOp>[1]): Promise<void> {
    const prev =
      (await this.providers.privateStateProvider.get(NIGHTPOOL_PRIVATE_STATE_ID)) ??
      createNightPoolPrivateState(this.secretKey);
    await this.providers.privateStateProvider.set(NIGHTPOOL_PRIVATE_STATE_ID, stageOp(prev, op));
  }

  // deposit funds into the pool's built-in shielded vault as a private note
  async deposit(network: string, amount: bigint): Promise<void> {
    const salt = randomBytes(32);
    await this.stage({ newSalt: salt });
    await this.deployed.callTx.deposit(amount);
    noteStore.add(network, this.scope, amount, salt);
  }

  // commit: escrow the order by spending a funding note (>= amount), mint change
  async commit(network: string, draft: DraftOrder): Promise<Order> {
    const funding = noteStore.unspent(network, this.scope).find((n) => n.amount >= draft.amount);
    if (!funding) throw new Error("no vault note large enough — deposit into the pool first");

    const order = draftToOrder(draft);
    const changeSalt = randomBytes(32);
    await this.stage({ order, note: { amount: funding.amount, salt: funding.salt }, newSalt: changeSalt });
    await this.deployed.callTx.commitOrder();

    noteStore.markSpent(network, this.scope, funding.salt);
    const change = funding.amount - draft.amount;
    if (change > 0n) noteStore.add(network, this.scope, change, changeSalt);
    return order;
  }

  async cancel(order: Order): Promise<void> {
    await this.stage({ order });
    await this.deployed.callTx.cancelOrder();
  }

  async reveal(order: Order): Promise<void> {
    await this.stage({ order });
    await this.deployed.callTx.revealOrder();
  }

  async forceReveal(): Promise<void> {
    await this.deployed.callTx.forceReveal();
  }

  async settle(): Promise<void> {
    await this.deployed.callTx.settleBatch();
  }

  // claim: release escrow as a fresh unlinkable note (persisted locally)
  async claim(network: string, order: Order): Promise<void> {
    const payoutSalt = randomBytes(32);
    await this.stage({ order, newSalt: payoutSalt });
    await this.deployed.callTx.claim();

    // mirror the contract's payout so the local note store stays in sync
    const s = await this.snapshot();
    const clearing = s.clearingTick;
    const eligible = order.side === 0n ? order.limitTick >= clearing : order.limitTick <= clearing;
    const noCross = s.clearedVolume === 0n;
    const filled = eligible && !noCross;
    const payout = filled ? order.amount - 1n : order.amount; // protocolFee = 1
    if (payout > 0n) noteStore.add(network, this.scope, payout, payoutSalt);
  }

  async startNextBatch(): Promise<void> {
    await this.deployed.callTx.startNextBatch();
  }

  // one-shot read of current state (used right after settle to record to the oracle)
  async snapshot(): Promise<PoolState> {
    const st = await this.providers.publicDataProvider.queryContractState(this.address);
    if (!st) throw new Error("pool state unavailable");
    return flattenLedger(NightPool.ledger(st.data));
  }

  state$(): Observable<PoolState> {
    return this.providers.publicDataProvider
      .contractStateObservable(this.address, { type: "latest" })
      .pipe(map((s) => flattenLedger(NightPool.ledger(s.data))));
  }
}
