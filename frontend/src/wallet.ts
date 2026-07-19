// lace dapp connector. the extension injects window.midnight.mnLace; enable()
// returns the wallet api we use to balance/sign/submit and to read service uris.

export type MidnightLace = {
  apiVersion: string;
  enable: () => Promise<WalletApi>;
  isEnabled: () => Promise<boolean>;
  serviceUriConfig: () => Promise<ServiceUriConfig>;
};

export type ServiceUriConfig = {
  proverServerUri: string;
  indexerUri: string;
  indexerWsUri: string;
  substrateNodeUri: string;
};

export type WalletState = {
  address: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
};

export type WalletApi = {
  state: () => Promise<WalletState>;
  balanceAndProveTransaction: (tx: unknown) => Promise<unknown>;
  submitTransaction: (tx: unknown) => Promise<string>;
  serviceUriConfig: () => Promise<ServiceUriConfig>;
};

declare global {
  interface Window {
    midnight?: { mnLace?: MidnightLace };
  }
}

export const getLace = (): MidnightLace => {
  const lace = window.midnight?.mnLace;
  if (!lace) {
    throw new Error("Lace (Midnight) wallet not found — install the extension and reload");
  }
  return lace;
};

export const connectWallet = async () => {
  const lace = getLace();
  const api = await lace.enable();
  const [state, uris] = await Promise.all([api.state(), api.serviceUriConfig()]);
  return { api, state, uris };
};
