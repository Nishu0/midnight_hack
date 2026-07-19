// deploy/join + recordBatch for the public batch price oracle, and a reader that
// turns the on-chain ring buffer into a price series + vwap for the chart widget.

import { map, type Observable } from "rxjs";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { contracts } from "@midnight-ntwrk/midnight-js";
import { Oracle } from "@nightpool/contract";
import { config } from "@/config";
import { type OracleProviders, ORACLE_PRIVATE_STATE_ID } from "./providers";

const compiled = CompiledContract.make("oracle", Oracle.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(config.zkOraclePath),
);

export type OraclePoint = { batchId: bigint; tick: number; volume: bigint };
export type OracleSeries = {
  points: OraclePoint[];
  vwapTick: number | null;
  cumVolume: bigint;
  latestBatchId: bigint;
};

const readSeries = (l: Oracle.Ledger): OracleSeries => {
  const points: OraclePoint[] = [];
  for (let i = 0; i < 8; i++) {
    const k = BigInt(i);
    if (l.ring.member(k)) {
      const p = l.ring.lookup(k);
      points.push({ batchId: p.batchId, tick: Number(p.tick), volume: p.volume });
    }
  }
  points.sort((a, b) => Number(a.batchId - b.batchId));
  const vwapTick = l.cumVolume > 0n ? Number(l.cumTickVolume) / Number(l.cumVolume) : null;
  return { points, vwapTick, cumVolume: l.cumVolume, latestBatchId: l.latestBatchId };
};

type Deployed =
  | contracts.DeployedContract<Oracle.Contract>
  | contracts.FoundContract<Oracle.Contract>;

export class OracleAPI {
  private constructor(
    public readonly address: string,
    private readonly deployed: Deployed,
    private readonly providers: OracleProviders,
  ) {}

  static async deploy(providers: OracleProviders): Promise<OracleAPI> {
    const d = await contracts.deployContract(providers, {
      compiledContract: compiled,
      privateStateId: ORACLE_PRIVATE_STATE_ID,
      initialPrivateState: {},
    });
    return new OracleAPI(d.deployTxData.public.contractAddress, d, providers);
  }

  static async join(providers: OracleProviders, address: string): Promise<OracleAPI> {
    const d = await contracts.findDeployedContract(providers, {
      contractAddress: address,
      compiledContract: compiled,
      privateStateId: ORACLE_PRIVATE_STATE_ID,
      initialPrivateState: {},
    });
    return new OracleAPI(address, d, providers);
  }

  async latestBatchId(): Promise<bigint> {
    const st = await this.providers.publicDataProvider.queryContractState(this.address);
    return st ? Oracle.ledger(st.data).latestBatchId : 0n;
  }

  async recordBatch(batchId: bigint, tick: bigint, volume: bigint): Promise<void> {
    await this.deployed.callTx.recordBatch(batchId, tick, volume);
  }

  series$(): Observable<OracleSeries> {
    return this.providers.publicDataProvider
      .contractStateObservable(this.address, { type: "latest" })
      .pipe(map((s) => readSeries(Oracle.ledger(s.data))));
  }
}
