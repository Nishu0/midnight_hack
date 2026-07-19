// nightpool registry api. tracks which pool contract is live per network so any
// browser rejoins the same pool. public data only — no order contents.

import express from "express";
import cors from "cors";
import { ensureSchema } from "./db/index.js";
import { listPools, latestPool, savePool, removePool } from "./store.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nightpool-backend" });
});

// list pools, optionally filtered by ?network=
app.get("/api/pools", async (req, res) => {
  const network = typeof req.query.network === "string" ? req.query.network : undefined;
  res.json(await listPools(network));
});

// latest pool for a network
app.get("/api/pools/latest", async (req, res) => {
  const network = typeof req.query.network === "string" ? req.query.network : "";
  if (!network) return res.status(400).json({ error: "network query param required" });
  res.json(await latestPool(network));
});

// register a deployed/joined pool
app.post("/api/pools", async (req, res) => {
  const { network, address, deployer, name, base, quote, label } = req.body ?? {};
  if (!network || !address) return res.status(400).json({ error: "network and address required" });
  const record = await savePool({ network, address, deployer, name, base, quote, label });
  res.status(201).json(record);
});

// forget a pool
app.delete("/api/pools", async (req, res) => {
  const { network, address } = req.body ?? {};
  if (!network || !address) return res.status(400).json({ error: "network and address required" });
  await removePool(network, address);
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 8787);

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`nightpool backend listening on http://localhost:${port}`);
    });
  })
  .catch((e) => {
    console.error("failed to connect to postgres — is DATABASE_URL set and the db up?", e);
    process.exit(1);
  });
