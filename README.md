# nightpool

sealed bid batch auction dex on [midnight](https://midnight.network). trades clear
in discrete batches at a single uniform price. orders are committed as hashes,
revealed with a zk proof, and settled together, so there is no ordering inside a
batch and front running and sandwiching are impossible by construction.

## why

public dexs leak every order before it executes. bots front run, sandwich, and
extract mev; traders broadcast their size and intent to the whole chain. batch
auctions kill that: everyone in a batch gets the same clearing price, and nothing
inside the batch is ordered, so there is no position to jump ahead of.

design is ported from penumbra's batch swap model, scoped down to fit compact's
fixed computation circuits: fixed batch size (8) plus fixed price grid (16 ticks)
means bounded loops, low constraint count, fast proofs.

## how it works

each batch runs through four steps:

1. **commit** trader publishes `hash(sk, side, amount, limitTick, salt)`. the real
   order stays in local witness state. nothing about it is on chain yet.
2. **reveal** trader proves in zk that their order matches a live commitment. the
   amount folds into public per tick demand/supply aggregates. an observer sees
   totals per price tick, never who bid what. a nullifier prevents double reveal.
3. **settle** anyone calls `settleBatch()`. a fixed 16 tick scan picks the clearing
   tick that maximizes matched volume `min(demand, supply)`.
4. **claim** trader proves ownership of a filled order and withdraws, via a claim
   nullifier that is unlinkable to the commitment.

### clearing

the price grid is 16 discrete ticks (0.5 to 2.0). a buy at `limitTick` fills at any
clearing tick at or below its limit; a sell fills at any tick at or above its limit.
during reveal each order folds into cumulative `demand[]` / `supply[]` curves;
settle scans all 16 ticks and takes the crossing with the most matched volume. all
integer math (`uint64`), fixed loops, cheap to prove.

if nothing crosses (`clearedVolume == 0`), everyone is refunded in full via the
claim path.

### privacy

* **pre trade** order contents never touch the chain, only a commitment hash.
* **at reveal** amounts fold into aggregate buckets; totals per tick are public,
  attribution to a trader is not.
* **post trade** fills claimed via nullifiers, unlinkable to commitments.

## layout

```
contract/     compact contract + witnesses + compiled artifacts
  src/nightpool.compact
  src/witnesses.ts
  src/index.ts
  src/managed/nightpool/   generated: ts module, zkir, prover/verifier keys
frontend/     react + vite dapp (lace wallet, live batch ui, depth chart)
docker-compose.yml   local proof server + indexer + node
```

## run it

prereqs: node 20+, the [compact toolchain](https://docs.midnight.network), docker,
and the lace (midnight) wallet extension.

```bash
# 1. local chain, proof server, indexer
docker compose up -d

# 2. compile the contract
cd contract && pnpm compact

# 3. frontend
cd ../frontend
cp .env.example .env
pnpm install
pnpm dev            # http://localhost:5174
```

connect lace, deploy a pool (or join one by address), then commit, reveal, settle,
claim. fund the wallet with tdust from the testnet faucet if you are on
preview/preprod instead of the local stack.

## contract circuits

* `commitOrder(commitment)` publish a sealed bid; opens reveal once the batch fills
* `revealOrder()` prove commitment membership, fold amount into the aggregates
* `settleBatch()` 16 tick scan, set clearing tick + matched volume
* `claim()` prove a filled order, record payout against a claim nullifier

## scope

in: single pair, batch size 8, 16 ticks, full commit to claim flow, live ui.

out for now: multi pair, partial fill carryover between batches, real token
bridging, order cancellation. marginal tick pro rata is simplified to full fill
for eligible orders.

## references

* [midnight docs](https://docs.midnight.network) and [academy](https://academy.midnight.network)
* [example bboard](https://github.com/midnightntwrk/example-bboard) and
  [midnight starter template](https://github.com/eddalabs/midnight-starter-template)
* penumbra batch swaps, cowswap, production batch auction designs.
