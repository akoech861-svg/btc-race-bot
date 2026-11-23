// cbBTC dip-entry rider: buys a pullback off the session high in two tranches, then holds the
// paper position to the end of the window.
//
// Why this shape: the replay is long only, one position, and a full-size round trip pays about
// 26 bps in fees, modelled slippage and price impact, while a 1-minute cbBTC bar moves about 8 bps.
// Trading minute to minute therefore loses to the fee drag on everything but the largest swings;
// measured on the kit's dev window and on synthetic days, trend filters and profit targets
// underperform simply holding, and a staged dip entry beats buying the first bar. So the bot
// trades at most twice: half the cash 25 bps under the running high, the rest 50 bps under it (or
// both tranches once two hours have gone by, so a one-way day is not missed), and it never sells,
// leaving the harness to flatten the position at the last close.
//
// Two rules keep the entry honest on thin books and on gapped opens: a tranche is cut so its own
// price impact stays under MAX_IMPACT_BPS, and each order caps its fill 1% past the close it was
// decided on, so a gap is refused rather than filled. A refused order is simply sent again on the
// next bar: the tranche is decided from the account, never from what this bot remembers asking for.

import { runBars, type BarsState } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const BPS = 10_000n;
/** First tranche: half the cash, this far under the highest close so far (25 bps). */
const DIP1_BPS = 25n;
/** Second tranche: the rest, this far under it (50 bps). */
const DIP2_BPS = 50n;
/** Buy regardless once this many scored bars have gone by with no deeper dip (2 hours). */
const FALLBACK_BARS = 120;
/** Cap the fill 1% past the close it was decided on: a gapped open is refused, not filled. */
const MAX_SLIPPAGE_BPS = 100;
/** Cap a tranche's own price impact, in bps, by cutting the notional when the book is thin. */
const MAX_IMPACT_BPS = 80n;
/** The replay's minimum buy notional: 1 USDC. */
const MIN_BUY = 1_000_000n;
/** Below this share of equity in cash there is nothing left worth deploying. */
const DRY_BPS = 1_000n;

let runMax = 0n;

/** The order for `amount`, cut to MAX_IMPACT_BPS against the latest close's depth, or null. */
function tranche(state: BarsState, amount: bigint) {
  const impact = state.impactBps(SYMBOL, amount);
  if (impact !== null && impact > MAX_IMPACT_BPS) amount = (amount * MAX_IMPACT_BPS) / impact;
  if (amount < MIN_BUY) return [];
  return [{ side: 'buy' as const, symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS }];
}

await runBars({
  onBatch(state) {
    if (state.warmingUp) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    if (close > runMax) runMax = close;
    if (state.cash < MIN_BUY) return [];
    const dipped = (bps: bigint) => runMax > 0n && close * BPS <= runMax * (BPS - bps);
    if (!state.positions.has(SYMBOL)) {
      if (dipped(DIP1_BPS) || state.seq >= FALLBACK_BARS) return tranche(state, state.cash / 2n);
      return [];
    }
    if (state.cash * BPS < state.equity * DRY_BPS) return [];
    if (dipped(DIP2_BPS) || state.seq >= FALLBACK_BARS) return tranche(state, state.cash);
    return [];
  },
});
