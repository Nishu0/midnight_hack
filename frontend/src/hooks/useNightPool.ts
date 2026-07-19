// top-level app state: wallet connection, deployed contract handle, live pool
// state, and the four batch actions. one hook so App stays declarative.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subscription } from "rxjs";
import type { Order } from "@nightpool/contract";
import { connectWallet } from "@/wallet";
import { buildProviders } from "@/api/providers";
import { NightPoolAPI } from "@/api/nightpool-api";
import { config } from "@/config";
import type { DraftOrder, PoolState } from "@/types";

type Status = "disconnected" | "connecting" | "connected" | "error";

export function useNightPool() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [address, setAddress] = useState<string>();
  const [network, setNetwork] = useState<string>();
  const [contractAddress, setContractAddress] = useState<string>();
  const [pool, setPool] = useState<PoolState>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  const apiRef = useRef<NightPoolAPI | null>(null);
  const subRef = useRef<Subscription | null>(null);
  // remember our own committed orders so we can reveal/claim them later
  const myOrders = useRef<Order[]>([]);

  const providersRef = useRef<ReturnType<typeof buildProviders> | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(undefined);
    try {
      const { api, service, shielded, networkId } = await connectWallet(config.networkId);
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
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

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
      console.error(`[nightpool] ${label} failed`);
      console.error("  message:", err?.message);
      console.error("  stack:", err?.stack);
      console.error("  cause:", err?.cause);
      try {
        console.error("  json:", JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})));
      } catch {
        /* ignore */
      }
      const msg =
        err?.message ||
        (err?.cause instanceof Error ? err.cause.message : undefined) ||
        String(e) ||
        "unknown error (see console)";
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
        setContractAddress(api.address);
        subscribe(api);
      }),
    [run, subscribe],
  );

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

  return {
    status,
    address,
    network,
    contractAddress,
    pool,
    error,
    busy,
    myOrders: myOrders.current,
    connect,
    deploy,
    join,
    commit,
    revealAll,
    settle,
    claimAll,
  };
}
