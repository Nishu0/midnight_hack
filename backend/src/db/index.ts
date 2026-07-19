// postgres connection + drizzle instance. ensureSchema creates the table on
// startup so the api works without a manual migration step in dev.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/nightpool";

export const client = postgres(url);
export const db = drizzle(client, { schema });

export async function ensureSchema(): Promise<void> {
  await client`
    create table if not exists pools (
      id text primary key,
      network text not null,
      address text not null,
      deployer text,
      name text,
      base text,
      quote text,
      label text,
      created_at timestamptz not null default now()
    )
  `;
  // add columns if the table predates them
  await client`alter table pools add column if not exists name text`;
  await client`alter table pools add column if not exists base text`;
  await client`alter table pools add column if not exists quote text`;
  await client`alter table pools add column if not exists oracle text`;
}
