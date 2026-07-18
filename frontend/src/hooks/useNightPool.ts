// top-level app state: wallet connection, deployed contract handle, live pool
// state, and the four batch actions. one hook so App stays declarative.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Subscription } from "rxjs";
import type { Order } from "@nightpool/contract";
import { connectWallet } from "@/wallet";
import { buildProviders } from "@/api/providers";
import { NightPoolAPI } from "@/api/nightpool-api";
import type { DraftOrder, PoolState } from "@/types";

type Status = "disconnected" | "connecting" | "connected" | "error";

export function useNightPool() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [address, setAddress] = useState<string>();
  const [contractAddress, setContractAddress] = useState<string>();
  const [pool, setPool] = useState<PoolState>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  const apiRef = useRef<NightPoolAPI>();
  const subRef = useRef<Subscription>();
  // remember our own committed orders so we can reveal/claim them later
  const myOrders = useRef<Order[]>([]);

  const providersRef = useRef<ReturnType<typeof buildProviders>>();

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(undefined);
    try {
      const { api, state, uris } = await connectWallet();
      setAddress(state.address);
      providersRef.current = buildProviders(api, state.coinPublicKey, uris);
      setStatus("connected");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, []);

  const subscribe = useCallback((api: NightPoolAPI) => {
    subRef.current?.unsubscribe();
    subRef.current = api.state$().subscribe({
      next: (raw: { data: unknown }) => setPool(api.ledgerOf(raw.data)),
      error: (e: Error) => setError(e.message),
    });
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
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
