# noctis

sealed bid batch auction dex on [midnight](https://midnight.network), with a built
in shielded vault and an on chain batch price oracle. trades clear in private
batches at a single uniform price, so bots cannot front run, sandwich, or read your
hand. order size and price stay sealed until you reveal, funds are escrowed as
private notes, and payouts come back as fresh notes unlinkable to your order.

## why

public dexs leak every order before it executes. bots front run, sandwich, and
extract mev; traders broadcast size and intent to the whole chain. batch auctions
kill that: everyone in a batch trades at one clearing price, and nothing inside the
batch is ordered, so there is no position to jump ahead of. noctis adds real escrow
(shielded notes) and a public price feed produced without ever exposing an order.

## the batch lifecycle

each batch runs commit, reveal, settle, claim, then rolls to the next batch.

1. **fund** deposit into the pool's built in vault. the amount is public going in,
   then becomes a private note (owner key, amount, salt). the chain sees a note
   commitment, never the amount or owner.
2. **commit** place a sealed order. the circuit spends one of your notes as escrow,
   mints a change note for the remainder, and publishes only a commitment hash.
   size and price never touch the chain here.
3. **reveal** prove your order matches a live commitment. its amount folds into the
   public per tick demand and supply curves. an observer sees totals per price
   tick, never who bid what. a nullifier prevents a second reveal.
4. **settle** anyone calls settle. a fixed 16 tick scan picks the clearing tick with
   the most matched volume, breaking ties toward the tightest cross. the clearing
   price and matched volume publish to the oracle.
5. **claim** prove your filled order and withdraw. the payout comes back as a fresh
   note, unlinkable to your commitment. fills are pro rata at the marginal tick so
   volume is conserved; a batch that never crosses refunds everyone in full.
6. **next batch** anyone starts the next batch. batchId bumps, counters and curves
   reset, and old commitments and nullifiers can never replay into it.

## what makes it correct

* **multi batch** everything is namespaced by batchId, so a new batch begins from
  empty curves and stale orders cannot replay.
* **pro rata fills** payout is amount times cleared volume over the eligible side
  total, done with a verified division witness (compact has no integer division, so
  the quotient is supplied off chain and the circuit re verifies q times d is at
  most num and num is below q plus one times d).
* **price legs** the quote leg is base times the tick price over 1e6, also verified.
  tick price is 0.5 to 2.0 in 0.1 steps.
* **escrow** commit spends a real note; claim mints the payout note. funds are
  locked between commit and claim, never a bare bookkeeping entry.
* **liveness** anyone can force reveal open even before a batch is full, so a missing
  committer cannot stall it.
* **cancellation** a sealed order can be cancelled before reveal via a cancel
  nullifier, which frees a slot in the batch.

## privacy

* **pre trade** order contents never touch the chain, only a commitment hash.
* **at reveal** amounts fold into aggregate buckets. totals per tick are public,
  attribution to a trader is not.
* **escrow** notes are commitments and nullifiers. amounts and owners stay private.
* **post trade** claims mint fresh notes through nullifiers, unlinkable to the
  original commitment.

## the oracle

a deliberately public contract paired with each pool. after every settle the app
records batchId, clearing tick, and matched volume into a ring buffer of the last 8
points, plus cumulative sums for a volume weighted average. the widget plots the
clearing price per batch and the vwap. prices produced on chain, per batch, without
a single order ever being public.

## contracts

three compact modules in `contract/src`, compiled with the compact toolchain 0.31.

* `nightpool.compact` the dex plus built in vault. circuits: deposit, commitOrder,
  cancelOrder, forceReveal, revealOrder, settleBatch, claim, startNextBatch.
* `oracle.compact` the public batch price feed. circuit: recordBatch.
* `vault.compact` a standalone shielded note vault (deposit, withdraw, splitNote),
  kept as the global vault variant; the pool uses its own merged notes.

integer division and block time were the two risky unknowns; both are handled. the
merged vault avoids cross contract calls entirely (one deployment per pool).

## layout

```
contract/     compact contracts + witnesses + compiled artifacts
  src/nightpool.compact   dex + shielded vault escrow
  src/oracle.compact      public batch price feed
  src/vault.compact       standalone note vault
  src/witnesses.ts        order + note + division witnesses
  src/managed/            generated ts modules, zkir, prover/verifier keys
backend/      pool registry api (postgres + drizzle)
  src/db/schema.ts        pools table
  src/index.ts            rest api
frontend/     react + vite dapp (lace connector, multi pool, vault, oracle)
docker-compose.yml   proof server + indexer + node + postgres
```

## run it

prereqs: node 20+, pnpm, docker, the compact toolchain, and the lace midnight
wallet extension (chrome web store, "lace beta"). set the lace midnight network to
undeployed for the local stack, or preview/preprod for a public testnet.

```bash
pnpm install

# 1. local stack: proof server, indexer, node, postgres
pnpm stack

# 2. compile the three contracts
pnpm compact

# 3. registry backend (postgres schema + api)
cd backend && cp .env.example .env && pnpm db:push && cd ..
pnpm backend

# 4. frontend
cd frontend && cp .env.example .env && cd ..
pnpm dev            # http://localhost:5174
```

set `VITE_NETWORK_ID` in `frontend/.env` to match the midnight network your lace
wallet is on (undeployed, preview, or preprod). on a public testnet, fund the wallet
with tNIGHT from the faucet and wait for dust to generate before deploying (fees are
paid in dust, which accrues from held NIGHT).

## demo flow

1. connect lace, create a pool (it deploys a paired oracle too).
2. on the pool page, step 0, deposit to mint a private note.
3. commit a buy and a sell that cross (for example buy at tick 10, sell at tick 6).
   each order escrows from your note; the chain shows only hashes.
4. reveal both. the depth chart fills in with public per tick totals.
5. settle. the clearing price appears and lands on the oracle feed.
6. claim. your payout arrives as a fresh note; the private balance updates.
7. start the next batch and repeat.

two browser profiles make two traders and show the money shot: orders sealed, one
uniform clearing price, mev impossible by construction, and a price series produced
without leaking a single order.

## scope

in: single pair per pool, batch size 2 (for fast demos), 16 tick grid, full fund to
claim flow with real note escrow, multi batch, pro rata fills, per pool oracle, live
ui, onboarding.

out for now: two token settlement receiving the quote asset (the quote leg is
computed and shown, payout is minted in the base note), real zswap coin transfer
versus note accounting, a block time reveal deadline (liveness uses a permissionless
force reveal instead), partial fill carryover between batches.

## references

* [midnight docs](https://docs.midnight.network) and [academy](https://academy.midnight.network)
* [lace midnight wallet](https://docs.midnight.network/guides/lace-wallet)
* [example bboard](https://github.com/midnightntwrk/example-bboard) and
  [midnight starter template](https://github.com/eddalabs/midnight-starter-template)
* penumbra batch swaps, cowswap, zcash note model, production designs this borrows from.
