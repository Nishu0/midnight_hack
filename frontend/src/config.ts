// most service endpoints now come from the wallet (getConfiguration). we only keep
// the network hint passed to connect(), the local zk asset path, and a proof server
// fallback for wallets that don't report one.

export type NetworkName = "undeployed" | "testnet" | "preview" | "preprod" | "mainnet";

const env = import.meta.env;

export const config = {
  // network id hinted to the wallet on connect; must match the midnight network your
  // wallet is on or lace rejects with a mismatch. midnight networks are undeployed
  // (local docker), preview, preprod. defaults to preview.
  networkId: (env.VITE_NETWORK_ID as NetworkName) ?? "preview",
  proofServer: env.VITE_PROOF_SERVER_URI ?? "http://127.0.0.1:6300",
  // where copy-keys drops the compiled prover/verifier assets
  zkConfigPath: "/midnight/nightpool",
  // registry backend (stores public pool addresses per network)
  backendUrl: env.VITE_BACKEND_URL ?? "http://localhost:8787",
};

// fixed grid params, mirror the contract
export const TICK_COUNT = 16;
export const BATCH_SIZE = 2;

// map a tick index to a human price. grid is 0.5 -> 2.0 across 16 ticks.
export const tickToPrice = (tick: number): number => 0.5 + (tick * 1.5) / (TICK_COUNT - 1);
