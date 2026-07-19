// drizzle schema. one table: the public pool registry per network.
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pools = pgTable("pools", {
  id: text("id").primaryKey(), // `${network}:${address}`
  network: text("network").notNull(),
  address: text("address").notNull(),
  deployer: text("deployer"),
  name: text("name"),
  base: text("base"), // base token symbol
  quote: text("quote"), // quote token symbol
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;
