// assembles the midnight.js provider bundle the contract client needs, wiring the
// connected lace wallet to the proof server, indexer and private-state store.

import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { config } from "@/config";
import type { WalletApi, ServiceUriConfig } from "@/wallet";
import { NIGHTPOOL_PRIVATE_STATE_ID } from "./nightpool-api";

// adapt the lace api to midnight.js's wallet + midnight provider surface
const walletProvider = (api: WalletApi, coinPublicKey: string) => ({
  coinPublicKey,
  balanceTx: (tx: unknown) => api.balanceAndProveTransaction(tx),
  submitTx: (tx: unknown) => api.submitTransaction(tx),
});

export const buildProviders = (api: WalletApi, coinPublicKey: string, uris: ServiceUriConfig) => {
  const zk = new FetchZkConfigProvider(`${window.location.origin}${config.zkConfigPath}`, fetch.bind(window));
  const wallet = walletProvider(api, coinPublicKey);
  return {
    privateStateProvider: levelPrivateStateProvider({ privateStateStoreName: "nightpool-private-state" }),
    publicDataProvider: indexerPublicDataProvider(uris.indexerUri, uris.indexerWsUri),
    zkConfigProvider: zk,
    proofProvider: httpClientProofProvider(uris.proverServerUri, zk),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
};

export type NightPoolProviders = ReturnType<typeof buildProviders>;
export { NIGHTPOOL_PRIVATE_STATE_ID };
