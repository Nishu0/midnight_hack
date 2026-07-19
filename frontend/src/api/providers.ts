// assembles the midnight.js provider bundle the contract client needs, wiring the
// connected lace wallet to the proof server, indexer and private state store.

import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import type { ProvableCircuitId } from "@midnight-ntwrk/compact-js";
import { types } from "@midnight-ntwrk/midnight-js";
import { NightPool, type NightPoolPrivateState } from "@nightpool/contract";
import { config } from "@/config";
import type { WalletApi, ServiceUriConfig } from "@/wallet";

export const NIGHTPOOL_PRIVATE_STATE_ID = "nightpoolPrivateState";

export type NightPoolCircuits = ProvableCircuitId<NightPool.Contract<NightPoolPrivateState>>;
export type NightPoolProviders = types.MidnightProviders<
  NightPoolCircuits,
  typeof NIGHTPOOL_PRIVATE_STATE_ID,
  NightPoolPrivateState
>;

// bridge the lace dapp api onto the wallet + midnight provider surface. the exact
// balance/prove/submit mapping still needs a live lace extension to verify, so the
// adapter is cast to the provider interfaces here.
const walletBridge = (api: WalletApi, coinPublicKey: string, encryptionPublicKey: string) =>
  ({
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: (tx: unknown) => api.balanceAndProveTransaction(tx),
    submitTx: (tx: unknown) => api.submitTransaction(tx),
  }) as unknown as types.WalletProvider & types.MidnightProvider;

export const buildProviders = (
  api: WalletApi,
  coinPublicKey: string,
  encryptionPublicKey: string,
  uris: ServiceUriConfig,
): NightPoolProviders => {
  const zk = new FetchZkConfigProvider<NightPoolCircuits>(
    `${window.location.origin}${config.zkConfigPath}`,
    fetch.bind(window),
  );
  const bridge = walletBridge(api, coinPublicKey, encryptionPublicKey);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "nightpool-private-state",
      privateStoragePasswordProvider: () => "nightpool-demo-password",
      accountId: coinPublicKey,
    }),
    publicDataProvider: indexerPublicDataProvider(uris.indexerUri, uris.indexerWsUri),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(uris.proverServerUri, zk),
    walletProvider: bridge,
    midnightProvider: bridge,
  };
};
