// assembles the midnight.js provider bundle, bridging the connected lace wallet
// (dapp-connector 4.x, which speaks serialized-hex transactions) to midnight.js's
// WalletProvider/MidnightProvider (which speak ledger transaction objects).

import * as ledger from "@midnight-ntwrk/ledger-v8";
import { fromHex, toHex } from "@midnight-ntwrk/compact-runtime";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import type { ProvableCircuitId } from "@midnight-ntwrk/compact-js";
import { types, networkId as networkIdApi } from "@midnight-ntwrk/midnight-js";
import type { ConnectedAPI, Configuration } from "@midnight-ntwrk/dapp-connector-api";
import { NightPool, type NightPoolPrivateState } from "@nightpool/contract";
import { config } from "@/config";
import { inMemoryPrivateStateProvider } from "./in-memory-private-state-provider";

export const NIGHTPOOL_PRIVATE_STATE_ID = "nightpoolPrivateState";

export type NightPoolCircuits = ProvableCircuitId<NightPool.Contract<NightPoolPrivateState>>;
export type NightPoolProviders = types.MidnightProviders<
  NightPoolCircuits,
  typeof NIGHTPOOL_PRIVATE_STATE_ID,
  NightPoolPrivateState
>;

const walletBridge = (api: ConnectedAPI, coinPk: string, encPk: string) => {
  const wallet: types.WalletProvider = {
    getCoinPublicKey: () => coinPk as unknown as ledger.CoinPublicKey,
    getEncryptionPublicKey: () => encPk as unknown as ledger.EncPublicKey,
    // hand the unsealed tx to lace to balance + pay fees, get it back sealed
    async balanceTx(tx, _ttl): Promise<ledger.FinalizedTransaction> {
      const serialized = toHex(tx.serialize());
      // lace appends {sender} as a trailing arg, so pass an options object here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const received = await (api as any).balanceUnsealedTransaction(serialized, {});
      return ledger.Transaction.deserialize<ledger.SignatureEnabled, ledger.Proof, ledger.Binding>(
        "signature",
        "proof",
        "binding",
        fromHex(received.tx),
      );
    },
  };

  const midnight: types.MidnightProvider = {
    submitTx: async (tx: ledger.FinalizedTransaction): Promise<ledger.TransactionId> => {
      await api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  return { wallet, midnight };
};

export const buildProviders = (
  api: ConnectedAPI,
  service: Configuration,
  coinPk: string,
  encPk: string,
  network: string,
): NightPoolProviders => {
  // keep ledger serialization on the same network the wallet is connected to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkIdApi.setNetworkId(network as any);

  const zk = new FetchZkConfigProvider<NightPoolCircuits>(
    `${window.location.origin}${config.zkConfigPath}`,
    fetch.bind(window),
  );
  const proofUri = service.proverServerUri ?? config.proofServer;
  const { wallet, midnight } = walletBridge(api, coinPk, encPk);

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider: indexerPublicDataProvider(service.indexerUri, service.indexerWsUri),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(proofUri, zk),
    walletProvider: wallet,
    midnightProvider: midnight,
  };
};
