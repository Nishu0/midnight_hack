// top-level app state: wallet connection, deployed contract handle, live pool
// state, and the four batch actions. one hook so App stays declarative.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subscription } from "rxjs";
import type { Order } from "@nightpool/contract";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { connectWallet } from "@/wallet";
import { buildProviders } from "@/api/providers";
import { NightPoolAPI } from "@/api/nightpool-api";
import { registry } from "@/api/registry";
import { config } from "@/config";
import type { DraftOrder, PoolState } from "@/types";

type Status = "disconnected" | "connecting" | "connected" | "error";

// remember the deployed pool per network so a refresh rejoins it instead of
// asking to deploy again
const poolKey = (net: string) => `nightpool.pool.${net}`;

export function useNightPool() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [contractAddress, setContractAddress] = useState<string>();
  const [pool, setPool] = useState<PoolState>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [dust, setDust] = useState<{ balance: bigint; cap: bigint }>();

  const apiRef = useRef<NightPoolAPI | null>(null);
  const walletRef = useRef<ConnectedAPI | null>(null);
  const networkRef = useRef<string>("");
  const addressRef = useRef<string>("");
  const subRef = useRef<Subscription | null>(null);
  // remember our own committed orders so we can reveal/claim them later
  const myOrders = useRef<Order[]>([]);

  const providersRef = useRef<ReturnType<typeof buildProviders> | null>(null);

  const subscribe = useCallback((api: NightPoolAPI) => {
    subRef.current?.unsubscribe();
    subRef.current = api.state$().subscribe({
      next: (p) => setPool(p),
      error: (e: Error) => setError(e.message),
    });
  }, []);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(undefined);
    try {
      const { api, service, shielded, networkId } = await connectWallet(config.networkId);
      walletRef.current = api;
      networkRef.current = networkId;
      addressRef.current = shielded.shieldedAddress;
      setAddress(shielded.shieldedAddress);
      setNetwork(networkId);
      const providers = buildProviders(
        api,
        service,
        shielded.shieldedCoinPublicKey,
        shielded.shieldedEncryptionPublicKey,
        networkId,
      );
      providersRef.current = providers;
      setStatus("connected");

      // rejoin a previously deployed pool: prefer the backend registry (syncs
      // across devices), fall back to localStorage if the backend is offline
      const remote = await registry.latest(networkId);
      const saved = remote?.address ?? localStorage.getItem(poolKey(networkId));
      if (saved) {
        try {
          const pool = await NightPoolAPI.join(providers, saved);
          apiRef.current = pool;
          localStorage.setItem(poolKey(networkId), pool.address);
          setContractAddress(pool.address);
          subscribe(pool);
        } catch {
          localStorage.removeItem(poolKey(networkId)); // stale address, fall back to setup
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [subscribe]);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(undefined);
    console.info(`[nightpool] ${label}…`);
    try {
      await fn();
      console.info(`[nightpool] ${label} ✓`);
    } catch (e) {
      const err = e as Error & { cause?: unknown };
      console.error(`[nightpool] ${label} failed`);
      console.error("  message:", err?.message);
      console.error("  stack:", err?.stack);
      console.error("  cause:", err?.cause);
      try {
        console.error("  json:", JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})));
      } catch {
        /* ignore */
      }
      // midnight.js wraps failures in an effect Cause: real text is at cause.failure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failure = (err?.cause as any)?.failure;
      let msg =
        err?.message ||
        failure?.message ||
        (err?.cause instanceof Error ? err.cause.message : undefined) ||
        String(e) ||
        "unknown error (see console)";
      if (failure?._tag === "Wallet.InsufficientFunds" || /insufficient funds|balance dust/i.test(msg)) {
        msg = "insufficient dust for fees. fund this wallet with tNIGHT from the Midnight faucet and wait for dust to generate, then retry.";
      }
      setError(msg);
    } finally {
      setBusy(undefined);
    }
  }, []);

  const deploy = useCallback(
    () =>
      run("deploying pool", async () => {
        const api = await NightPoolAPI.deploy(providersRef.current!);
        apiRef.current = api;
        localStorage.setItem(poolKey(networkRef.current), api.address);
        void registry.save(networkRef.current, api.address, addressRef.current);
        setContractAddress(api.address);
        subscribe(api);
      }),
    [run, subscribe],
  );

  const join = useCallback(
    (addr: string) =>
      run("joining pool", async () => {
        const api = await NightPoolAPI.join(providersRef.current!, addr);
        apiRef.current = api;
        localStorage.setItem(poolKey(networkRef.current), api.address);
        void registry.save(networkRef.current, api.address, addressRef.current);
        setContractAddress(api.address);
        subscribe(api);
      }),
    [run, subscribe],
  );

  // forget the saved pool and return to the setup screen
  const leave = useCallback(() => {
    const addr = apiRef.current?.address;
    localStorage.removeItem(poolKey(networkRef.current));
    if (addr) void registry.remove(networkRef.current, addr);
    subRef.current?.unsubscribe();
    apiRef.current = null;
    myOrders.current = [];
    setContractAddress(undefined);
    setPool(undefined);
  }, []);

  const commit = useCallback(
    (draft: DraftOrder) =>
      run("committing order", async () => {
        const order = await apiRef.current!.commit(draft);
        myOrders.current = [...myOrders.current, order];
      }),
    [run],
  );

  const revealAll = useCallback(
    () =>
      run("revealing orders", async () => {
        for (const order of myOrders.current) {
          await apiRef.current!.reveal(order);
        }
      }),
    [run],
  );

  const settle = useCallback(() => run("settling batch", () => apiRef.current!.settle()), [run]);

  const claimAll = useCallback(
    () =>
      run("claiming fills", async () => {
        for (const order of myOrders.current) {
          await apiRef.current!.claim(order);
        }
      }),
    [run],
  );

  useEffect(() => () => subRef.current?.unsubscribe(), []);

  // poll dust balance while connected so the user can watch it accrue from NIGHT
  useEffect(() => {
    if (status !== "connected") return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await walletRef.current?.getDustBalance();
        if (alive && d) setDust(d);
      } catch {
        /* ignore transient wallet errors */
      }
    };
    void tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [status]);

  return {
    status,
    address,
    network,
    dust,
    contractAddress,
    pool,
    error,
    busy,
    myOrders: myOrders.current,
    connect,
    deploy,
    join,
    leave,
    commit,
    revealAll,
    settle,
    claimAll,
  };
}
