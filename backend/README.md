# @nightpool/backend

tiny registry api. tracks which pool contract is live per network so any browser
rejoins the same pool instead of redeploying. postgres + drizzle.

privacy: only public data is stored here — network + contract address (+ optional
deployer address / label). order contents (side, amount, price, salt) never leave
the browser. that's the point of the sealed-bid design.

## run

```bash
# 1. start postgres (from repo root, part of the stack)
docker compose up -d postgres

# 2. from backend/
cp .env.example .env
pnpm db:push        # create the schema (or pnpm db:generate && pnpm db:migrate)
pnpm dev            # http://localhost:8787
```

the server also runs a `create table if not exists` on startup, so `pnpm dev`
works even without running migrations first.

## api

* `GET  /health`
* `GET  /api/pools?network=preprod` — all pools for a network, newest first
* `GET  /api/pools/latest?network=preprod` — most recent pool
* `POST /api/pools` `{ network, address, deployer?, label? }` — register
* `DELETE /api/pools` `{ network, address }` — forget

## drizzle

* schema: `src/db/schema.ts`
* `pnpm db:generate` writes SQL migrations to `drizzle/`
* `pnpm db:migrate` applies them; `pnpm db:push` syncs schema directly (dev)
* `pnpm db:studio` opens drizzle studio
