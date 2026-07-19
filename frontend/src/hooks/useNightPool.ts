// app state: wallet session + a registry of pools + the currently open pool and
// its four batch actions. one hook so the views stay declarative.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subscription } from "rxjs";
import type { Order } from "@nightpool/contract";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { connectWallet } from "@/wallet";
import { buildProviders } from "@/api/providers";
import { NightPoolAPI } from "@/api/nightpool-api";
import { registry, type PoolRecord, type PoolMeta } from "@/api/registry";
import { config } from "@/config";
import type { DraftOrder, PoolState } from "@/types";

type Status = "disconnected" | "connecting" | "connected" | "error";

export function useNightPool() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [pools, setPools] = useState<PoolRecord[]>([]);
  const [contractAddress, setContractAddress] = useState<string>();
  const [poolMeta, setPoolMeta] = useState<PoolMeta>();
  const [pool, setPool] = useState<PoolState>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [dust, setDust] = useState<{ balance: bigint; cap: bigint }>();
  const [orders, setOrders] = useState<Order[]>([]);

  const apiRef = useRef<NightPoolAPI | null>(null);
  const walletRef = useRef<ConnectedAPI | null>(null);
  const providersRef = useRef<ReturnType<typeof buildProviders> | null>(null);
  const networkRef = useRef<string>("");
  const addressRef = useRef<string>("");
  const subRef = useRef<Subscription | null>(null);

  const subscribe = useCallback((api: NightPoolAPI) => {
    subRef.current?.unsubscribe();
    subRef.current = api.state$().subscribe({
      next: (p) => setPool(p),
      error: (e: Error) => setError(e.message),
    });
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(undefined);
    console.info(`[nightpool] ${label}…`);
    try {
      await fn();
      console.info(`[nightpool] ${label} ✓`);
    } catch (e) {
      const err = e as Error & { cause?: unknown };
      console.error(`[nightpool] ${label} failed`, err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const failure = (err?.cause as any)?.failure;
      let msg =
        err?.message || failure?.message || (err?.cause instanceof Error ? err.cause.message : undefined) || String(e);
      if (failure?._tag === "Wallet.InsufficientFunds" || /insufficient funds|balance dust/i.test(msg)) {
        msg = "insufficient dust for fees. fund this wallet with tNIGHT from the Midnight faucet and wait for dust to generate, then retry.";
      }
      setError(msg);
    } finally {
      setBusy(undefined);
    }
  }, []);

  const refreshPools = useCallback(async () => {
    if (!networkRef.current) return;
    setPools(await registry.list(networkRef.current));
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
      providersRef.current = buildProviders(
        api,
        service,
        shielded.shieldedCoinPublicKey,
        shielded.shieldedEncryptionPublicKey,
        networkId,
      );
      setStatus("connected");
      setPools(await registry.list(networkId));
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

  const openPool = useCallback(
    (rec: { address: string } & PoolMeta) =>
      run("opening pool", async () => {
        const api = await NightPoolAPI.join(providersRef.current!, rec.address);
        apiRef.current = api;
        setOrders([]);
        setContractAddress(api.address);
        setPoolMeta(rec);
        subscribe(api);
      }),
    [run, subscribe],
  );

  const createPool = useCallback(
    (meta: PoolMeta) =>
      run("deploying pool", async () => {
        const api = await NightPoolAPI.deploy(providersRef.current!);
        apiRef.current = api;
        void registry.save(networkRef.current, api.address, { ...meta, deployer: addressRef.current });
        await refreshPools();
        setOrders([]);
        setContractAddress(api.address);
        setPoolMeta(meta);
        subscribe(api);
      }),
    [run, subscribe, refreshPools],
  );

  // go back to the pools list without forgetting the pool
  const closePool = useCallback(() => {
    subRef.current?.unsubscribe();
    apiRef.current = null;
    setContractAddress(undefined);
    setPoolMeta(undefined);
    setPool(undefined);
    setOrders([]);
    void refreshPools();
  }, [refreshPools]);

  const commit = useCallback(
    (draft: DraftOrder) =>
      run("committing order", async () => {
        const order = await apiRef.current!.commit(draft);
        setOrders((prev) => [...prev, order]);
      }),
    [run],
  );

  const revealAll = useCallback(
    () =>
      run("revealing orders", async () => {
        for (const order of orders) await apiRef.current!.reveal(order);
      }),
    [run, orders],
  );

  const cancel = useCallback(
    (order: Order) =>
      run("cancelling order", async () => {
        await apiRef.current!.cancel(order);
        setOrders((prev) => prev.filter((o) => o !== order));
      }),
    [run],
  );

  const forceReveal = useCallback(() => run("opening reveal", () => apiRef.current!.forceReveal()), [run]);

  const settle = useCallback(() => run("settling batch", () => apiRef.current!.settle()), [run]);

  const startNextBatch = useCallback(
    () => run("starting next batch", () => apiRef.current!.startNextBatch()),
    [run],
  );

  const claimAll = useCallback(
    () =>
      run("claiming fills", async () => {
        for (const order of orders) await apiRef.current!.claim(order);
      }),
    [run, orders],
  );

  useEffect(() => () => subRef.current?.unsubscribe(), []);

  // poll dust while connected so the user can watch it accrue
  useEffect(() => {
    if (status !== "connected") return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await walletRef.current?.getDustBalance();
        if (alive && d) setDust(d);
      } catch {
        /* ignore */
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
    pools,
    contractAddress,
    poolMeta,
    pool,
    error,
    busy,
    dust,
    myOrders: orders,
    connect,
    refreshPools,
    createPool,
    openPool,
    closePool,
    commit,
    cancel,
    revealAll,
    forceReveal,
    settle,
    startNextBatch,
    claimAll,
  };
}
