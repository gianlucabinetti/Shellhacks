# Alpaca market data and crypto portfolios

The app opens on **Market portfolios**, a working frontend/backend flow using
Alpaca prices. It does not connect to personal accounts or wallets and has no
account, order, or trading integration.

## Try crypto without keys

1. Install the backend dependencies and start it on port 8000 (see README).
2. Run `python -m scripts.check_market_data` for a live crypto connection check.
3. In a second terminal, run `cd frontend`, `npm ci`, and `npm run dev`.
4. Open Vite's URL. The initial example uses BTC/USD, ETH/USD, and SOL/USD.
5. Select more assets, set positive weights totaling 100%, choose a period, and
   press **Analyze portfolio**.
6. Press **Explain my example** for a Bedrock explanation, or a clearly labeled
   template when AWS is unavailable or `AI_PROVIDER=fallback`.

The crypto REST requests deliberately omit credentials. Bitcoin, Ethereum,
Solana, Avalanche, Chainlink, Dogecoin, Litecoin, Bitcoin Cash, Uniswap, Aave,
Polkadot, and XRP daily-price requests were verified against Alpaca during
implementation. Availability and history can still change.

The app uses completed daily historical observations. It does not stream
real-time quotes. It displays the price date, feed, fetch time, and cache status.

## Enable stocks, ETFs, and mixed portfolios

Obtain market-data API keys from an Alpaca paper-only account and add them to
the root backend `.env`:

```dotenv
APCA_API_KEY_ID=your_paper_account_key_id
APCA_API_SECRET_KEY=your_paper_account_secret
```

Restart the backend and reload the frontend so the asset catalog refreshes.
Then run:

```bash
python -m scripts.check_market_data --stocks
```

VTI, VXUS, SPY, AAPL, MSFT, BND, and SGOV are included as stock/ETF examples.
The stock/bond and mixed preset buttons are enabled when both credentials are
configured. The checker determines whether the credentials actually have access.

These are data-access credentials, not a request to link a personal portfolio.
Never put them in `VITE_*` variables. Stock requests use IEX, which represents one
exchange, with Alpaca's corporate-action adjustments. Crypto-only requests
continue to work without stock credentials.

Live stock access was not verified because no Alpaca credentials were provided.
Its request format, credentials handling, and failure paths are covered by tests.

## Add more supported assets

Edit `backend/market_assets.json`, then restart the backend and reload the app.
A crypto entry has this shape:

```json
{
  "symbol": "BTC/USD",
  "name": "Bitcoin",
  "asset_class": "crypto",
  "category": "Digital currency"
}
```

Use an actual Alpaca-supported USD pair. Other asset classes are `stock` and
`bond`; categories are display text, not risk ratings. Adding a catalog entry
does not guarantee the provider has history for it. Unsupported or insufficient
data produces an explicit error, never invented prices.

The catalog feeds the search, selectors, analytics, and AI input. No frontend
code change is needed for another entry. Portfolios support 1–12 assets; the
catalog can contain more. Do not duplicate symbols.

## Calculations and data handling

- The starting money and quantities are hypothetical.
- Buy and hold: initial quantities are set from the starting weights and
  starting prices. No rebalancing, fees, taxes, or staking yield is modeled.
- Only completed daily observations are requested; the current UTC date is
  excluded. Crypto uses Alpaca US daily data.
- Every calendar day is valued. Equity closes carry forward over non-reporting
  dates for at most four days; longer gaps produce an error. Crypto gaps always
  produce an error. Carrying an equity close does not invent a new observed price.
- Total return is ending value divided by starting value minus one.
- Volatility is sample standard deviation of daily calendar returns times
  `sqrt(365)`. This includes unchanged equity valuations on non-reporting dates.
- Drawdown is the worst daily-observed decline from the previous peak.
- Annualized return is withheld for shorter periods; the UI emphasizes the
  actual period return. Different available histories may shorten the range.
- Prices are cached in memory for five minutes, with up to 64 history requests
  retained. The fetch timestamp remains unchanged on cache hits.
- Pagination is consumed and validated. Missing prices, stale data, rate limits,
  denied access, malformed responses, and outages are shown as errors. This
  market screen never silently substitutes mock prices.

The AI receives the computed figures, initial asset-class weights including
crypto, selected symbols, dates, and calculation notes. The response includes a
`source` field so the UI can distinguish `bedrock` from `fallback`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/market/assets` | Searchable asset catalog and stock credential configuration status. |
| POST | `/api/market/portfolio` | Calculate a hypothetical portfolio from real Alpaca daily prices. |
| POST | `/api/market/explain` | Explain the same calculated portfolio and identify the explanation source. |

Both POST routes accept:

```json
{
  "holdings": [
    {"symbol": "BTC/USD", "weight": 0.5},
    {"symbol": "ETH/USD", "weight": 0.3},
    {"symbol": "SOL/USD", "weight": 0.2}
  ],
  "initial_investment": 10000,
  "days": 90
}
```

Periods: 30, 90, or 365 days. Weights must be positive and sum to one.
The result identifies real prices, fictional holdings, observation dates, and
the calculation method. The data ID ensures an explanation matches the displayed
calculation even if a refresh changes the data.

## Original demo and AWS

The original questionnaire is now the **Risk quiz** screen. It is scored by the
backend (`POST /api/risk/assess`) and hands its result to the market screen as
real funds. The frontend no longer has a mock mode (`VITE_USE_MOCKS` was
removed).

`USE_MOCK_ANALYTICS` also controls only the legacy portfolio routes. Leave it
true unless the team's separate `analytics.engine` exists. The new market
routes use their own implemented analytics service.

Set `AI_PROVIDER=bedrock` to use Amazon Nova. Run
`python -m scripts.check_bedrock` to verify AWS permissions separately.
The preview used the template explanation because AWS credentials were not
available.

## Provider references

- [Alpaca crypto historical client: authentication is optional](https://alpaca.markets/sdks/python/api_reference/data/crypto/historical.html)
- [Crypto bars REST endpoint](https://docs.alpaca.markets/us/reference/cryptobars-1)
- [Stock bars, adjustments, and pagination](https://docs.alpaca.markets/us/reference/stockbars)
- [Paper-only account setup](https://docs.alpaca.markets/us/docs/paper-trading)
