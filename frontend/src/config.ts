// network + service endpoints. defaults target the local standalone stack from
// docker-compose.yml; override via .env for preview/preprod.

export type NetworkName = "undeployed" | "preview" | "preprod" | "mainnet";

const env = import.meta.env;

export const config = {
  networkId: (env.VITE_NETWORK_ID as NetworkName) ?? "undeployed",
  indexer: env.VITE_INDEXER_URI ?? "http://127.0.0.1:8088/api/v4/graphql",
  indexerWS: env.VITE_INDEXER_WS_URI ?? "ws://127.0.0.1:8088/api/v4/graphql/ws",
  node: env.VITE_NODE_URI ?? "http://127.0.0.1:9944",
  proofServer: env.VITE_PROOF_SERVER_URI ?? "http://127.0.0.1:6300",
  // where copy-keys drops the compiled prover/verifier assets
  zkConfigPath: "/midnight/nightpool",
};

// fixed grid params, mirror the contract
export const TICK_COUNT = 16;
export const BATCH_SIZE = 8;

// map a tick index to a human price. grid is 0.5 -> 2.0 across 16 ticks.
export const tickToPrice = (tick: number): number => 0.5 + (tick * 1.5) / (TICK_COUNT - 1);
