// client for the pool registry backend. every call fails soft — if the backend
// is down the app still works via localStorage, it just won't sync across devices.

import { config } from "@/config";

const base = config.backendUrl;

export type PoolRecord = {
  id: string;
  network: string;
  address: string;
  deployer?: string;
  name?: string;
  base?: string;
  quote?: string;
  label?: string;
  createdAt: string;
};

export type PoolMeta = {
  deployer?: string;
  name?: string;
  base?: string;
  quote?: string;
  label?: string;
};

export const registry = {
  async list(network: string): Promise<PoolRecord[]> {
    try {
      const r = await fetch(`${base}/api/pools?network=${encodeURIComponent(network)}`);
      if (!r.ok) return [];
      return (await r.json()) as PoolRecord[];
    } catch {
      return [];
    }
  },

  async latest(network: string): Promise<PoolRecord | null> {
    try {
      const r = await fetch(`${base}/api/pools/latest?network=${encodeURIComponent(network)}`);
      if (!r.ok) return null;
      return (await r.json()) as PoolRecord | null;
    } catch {
      return null;
    }
  },

  async save(network: string, address: string, meta: PoolMeta = {}): Promise<void> {
    try {
      await fetch(`${base}/api/pools`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ network, address, ...meta }),
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
