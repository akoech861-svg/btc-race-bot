// cbBTC dip-entry rider: waits for a shallow pullback off the session high, buys 100% of the
// paper cash, and holds to the end of the window.
//
// Why this shape: the replay is long only, one position, and a full-size round trip pays about
// 26 bps in fees, modelled slippage and price impact, while a 1-minute cbBTC bar moves about 8 bps.
// Trading minute to minute therefore loses to the fee drag on everything but the largest swings;
// measured on the kit's dev window and on block-bootstrapped and synthetic days, trend filters and
// profit targets underperform simply holding, and holding a dip entry beats buying the first bar.
// So the bot trades once: it enters 25 bps under the running high of the window (a better entry
// than the open on any day that dips), falls back to entering after two hours if no dip comes, and
// never sells, leaving the harness to flatten the position at the last close. One trade keeps the
// fee bill at a single round trip and leaves the entry count as low as the tie-break rewards.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Enter this far under the highest close seen so far (25 bps). */
const DIP_BPS = 25n;
const BPS = 10_000n;
/** Enter unconditionally once this many scored bars have gone by with no dip (2 hours). */
const FALLBACK_BARS = 120;
/** Cap the fill 1% past the close it was decided on, so a gapped open is refused, not filled. */
const MAX_SLIPPAGE_BPS = 100;
/** The replay's minimum buy notional: 1 USDC. */
const MIN_BUY = 1_000_000n;

let runMax = 0n;

await runBars({
  onBatch(state) {
    if (state.warmingUp) return [];
    if (state.positions.has(SYMBOL)) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    if (close > runMax) runMax = close;
    const dipped = runMax > 0n && close * BPS <= runMax * (BPS - DIP_BPS);
    if (!dipped && state.seq < FALLBACK_BARS) return [];
    const cash = state.cash;
    if (cash < MIN_BUY) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
