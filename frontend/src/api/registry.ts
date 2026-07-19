// client for the pool registry backend. every call fails soft — if the backend
// is down the app still works via localStorage, it just won't sync across devices.

import { config } from "@/config";

const base = config.backendUrl;

export type PoolRecord = {
  id: string;
  network: string;
  address: string;
  deployer?: string;
  label?: string;
  createdAt: string;
};

export const registry = {
  async latest(network: string): Promise<PoolRecord | null> {
    try {
      const r = await fetch(`${base}/api/pools/latest?network=${encodeURIComponent(network)}`);
      if (!r.ok) return null;
      return (await r.json()) as PoolRecord | null;
    } catch {
      return null;
    }
  },

  async save(network: string, address: string, deployer?: string): Promise<void> {
    try {
      await fetch(`${base}/api/pools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ network, address, deployer }),
      });
    } catch {
      /* offline — localStorage still has it */
    }
  },

  async remove(network: string, address: string): Promise<void> {
    try {
      await fetch(`${base}/api/pools`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ network, address }),
      });
    } catch {
      /* offline */
    }
  },
};
