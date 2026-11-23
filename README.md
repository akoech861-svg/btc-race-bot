# btc-race-bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/akoech861-svg/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/akoech861-svg/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A cbBTC/USDC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty: it buys 25 bps under the running high of the window, holds the paper position to the end, and trades once.

## Strategy

The replay is long only, one position, with a 26 bps round trip of fees, modelled slippage and price impact against a 1-minute bar that typically moves 8 bps. Trading minute to minute loses to that fee drag, so the bot makes a single decision:

- track the highest close seen since the window opened;
- buy 100% of the paper cash when the close comes 25 bps under it;
- if no such dip arrives in the first two hours, buy anyway, so a one-way day is not missed;
- never sell: the harness flattens the position at the last close.

A refused entry (a gapped open past the 1% slippage cap) simply retries on the next bar.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1`: newline-delimited JSON on stdin and stdout. Grade it on the kit's dev window with `node cli/makefun.mjs grade-local --kit . --bot <this repository> --driver process` from inside the unpacked kit.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
