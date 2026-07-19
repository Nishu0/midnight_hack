// registry queries. public data only (network + contract address), never orders.
import { desc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { pools, type Pool } from "./db/schema.js";

export type PoolRecord = Pool;

export async function listPools(network?: string): Promise<PoolRecord[]> {
  if (network) {
    return db.select().from(pools).where(eq(pools.network, network)).orderBy(desc(pools.createdAt));
  }
  return db.select().from(pools).orderBy(desc(pools.createdAt));
}

export async function latestPool(network: string): Promise<PoolRecord | null> {
  const [row] = await db
    .select()
    .from(pools)
    .where(eq(pools.network, network))
    .orderBy(desc(pools.createdAt))
    .limit(1);
  return row ?? null;
}

export async function savePool(input: {
  network: string;
  address: string;
  deployer?: string;
  label?: string;
}): Promise<PoolRecord> {
  const id = `${input.network}:${input.address}`;
  const [row] = await db
    .insert(pools)
    .values({ id, network: input.network, address: input.address, deployer: input.deployer, label: input.label })
    .onConflictDoUpdate({
      target: pools.id,
      set: { deployer: input.deployer ?? null, label: input.label ?? null },
    })
    .returning();
  return row;
}

export async function removePool(network: string, address: string): Promise<void> {
  await db.delete(pools).where(eq(pools.id, `${network}:${address}`));
}
