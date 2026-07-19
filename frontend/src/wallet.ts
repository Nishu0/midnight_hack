// midnight dapp connector (dapp-connector-api 4.x). wallets inject one or more
// InitialAPI objects under window.midnight, keyed by an arbitrary uuid, so we
// enumerate the values instead of hardcoding a key. connect(networkId) returns
// the ConnectedAPI we drive.

import type { InitialAPI, ConnectedAPI, Configuration } from "@midnight-ntwrk/dapp-connector-api";

declare global {
  interface Window {
    midnight?: { [key: string]: InitialAPI };
  }
}

export type ShieldedAddresses = {
  shieldedAddress: string;
  shieldedCoinPublicKey: string;
  shieldedEncryptionPublicKey: string;
};

export type ConnectedWallet = {
  api: ConnectedAPI;
  service: Configuration;
  shielded: ShieldedAddresses;
  networkId: string;
};

export const listWallets = (): InitialAPI[] => {
  if (typeof window === "undefined" || !window.midnight) return [];
  const out: InitialAPI[] = [];
  for (const key in window.midnight) {
    const w = window.midnight[key];
    if (w && w.name && w.apiVersion && typeof w.connect === "function") out.push(w);
  }
  return out;
};

// prefer lace, otherwise the first injected midnight wallet
const pickWallet = (): InitialAPI => {
  const wallets = listWallets();
  if (wallets.length === 0) {
    throw new Error("no Midnight wallet found. install Lace (Midnight), unlock it, and reload.");
  }
  return wallets.find((w) => /lace/i.test(w.name) || /lace/i.test(w.rdns ?? "")) ?? wallets[0];
};

export const connectWallet = async (networkHint: string): Promise<ConnectedWallet> => {
  const initial = pickWallet();
  const api = await initial.connect(networkHint);
  const [service, shielded, status] = await Promise.all([
    api.getConfiguration(),
    api.getShieldedAddresses(),
    api.getConnectionStatus(),
  ]);
  const networkId = status.status === "connected" ? status.networkId : service.networkId;
  return { api, service, shielded, networkId };
};
