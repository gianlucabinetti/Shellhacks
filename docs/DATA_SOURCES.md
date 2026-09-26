# Real data for a demo without personal accounts

Research checked against official documentation on **September 26, 2026**.
This document describes feasibility and proposed work. No Plaid, Robinhood,
Alpaca, or Alpha Vantage integration has been installed or authenticated.

## Recommendation

Use a fictional investor with predefined holdings, fetch real historical
stock/ETF prices from a market-data provider, calculate the portfolio results
in Python, and pass those calculated results to Bedrock.

For this project, **Alpaca market data with a paper-only developer account** is
the best fit among the options researched. Add **Plaid Sandbox** only if the
team wants to demonstrate connecting an investment account. Robinhood does not
fit the requirement to avoid connecting a Robinhood account.

Three labels should stay distinct:

| Data | What the demo can truthfully say |
| --- | --- |
| Fictional holdings / quantities | Example portfolio; not someone's actual investments. |
| Prices fetched from a market-data API | Historical or current market data, with provider, feed, and timestamp. |
| Portfolio returns calculated from those inputs | Hypothetical performance based on market data. |

Fetching real prices does not make a fictional portfolio a real customer
account. A refresh performed now also does not make historical or delayed
prices real-time.

## Plaid: good for a simulated account-linking experience

Plaid's free Sandbox provides test accounts and custom investment holdings
without connecting a personal financial account. You still need a Plaid
developer team, `client_id`, and Sandbox `secret`.
[Sandbox](https://plaid.com/docs/sandbox/) ·
[Developer setup](https://plaid.com/docs/quickstart/)

A proposed Sandbox flow is:

1. Create a Sandbox Item with `/sandbox/public_token/create`, a supported test
   institution, and `initial_products: ["investments"]`. For a visible
   connection flow, use Plaid Link in Sandbox instead.
2. Exchange its public token at `/item/public_token/exchange`.
3. Fetch holdings and securities with `/investments/holdings/get`.
4. Optionally fetch `/investments/transactions/get` for a transaction-history
   demonstration.
5. Map supported securities to the analytics model and label the result
   **Sandbox account — synthetic holdings**.

The bypass endpoint is Sandbox-only. Production investment data comes from a
consenting user's linked account; a free production trial does not remove that
requirement. [Sandbox API](https://plaid.com/docs/api/sandbox/) ·
[Investments integration](https://plaid.com/docs/investments/add-to-app/)

Custom Sandbox investment personas can contain realistic security identifiers,
but they are still test accounts. Plaid Investments is an account aggregation
product, not a general historical stock-price feed for arbitrary symbols.
Investment updates are periodic rather than tick-by-tick.
[Investments overview](https://plaid.com/docs/investments/)

**Fit:** optional account-linking demo. Use a separate market-data source if the
team wants genuine price history.

## Robinhood: official interfaces exist, but require account access

The documented Crypto Trading API requires credentials created from a
Robinhood Crypto account. Requests use an API key and signed headers.
[Crypto API documentation](https://docs.robinhood.com/crypto/trading/)

Robinhood also offers Trading MCP / Agentic Trading. Its documented onboarding
requires a primary investing account in good standing and an Agentic account;
read access can include the customer's other Robinhood accounts and holdings.
[Agentic Trading overview](https://robinhood.com/us/en/support/articles/agentic-trading-overview/)

I did not find a documented, account-free Robinhood investment sandbox suitable
for this app in the official materials reviewed. This is a research limitation,
not a claim that every private or partner offering has been ruled out.

**Fit:** not recommended for this demo. Neither documented path meets the
team's requirement to avoid connecting Robinhood accounts.

## Alpaca: genuine market prices, fictional portfolio

An Alpaca paper-only account can be created with an email address and does not
require funding a live brokerage account or linking an existing broker.
Its documented market-data entitlement is IEX.
[Paper account documentation](https://docs.alpaca.markets/us/docs/paper-trading)

Use the **Market Data API**, with server-side API credentials, while keeping
holdings in the app. There is no need to place even simulated orders.

A proposed historical-data request uses:

- Endpoint: `GET https://data.alpaca.markets/v2/stocks/bars`
- Headers: `APCA-API-KEY-ID` and `APCA-API-SECRET-KEY`
- Parameters: selected `symbols`, `timeframe=1Day`, `feed=iex`,
  `adjustment=all`, and explicit `start` / `end` dates
- Pagination: consume every `next_page_token`; limits apply across symbols

The bars endpoint supports split/dividend adjustments. Explicitly request the
feed the account is entitled to.
[Historical bars reference](https://docs.alpaca.markets/us/reference/stockbars)

IEX is one exchange, not the consolidated US market. Describe it accordingly;
do not present an IEX quote as a full-market quote. Higher coverage and freshest
SIP access have different subscription requirements.
[Market-data plans](https://docs.alpaca.markets/us/docs/about-market-data-api) ·
[Feed comparison](https://docs.alpaca.markets/us/docs/market-data-faq)

**Fit:** recommended for this app's stock/bond-ETF portfolio demo. API credentials
and a successful test for the chosen symbols/history are still needed.

## Alternative: Alpha Vantage

Alpha Vantage provides market-data API keys without a brokerage connection.
Its standard free allowance is currently 25 requests per day; some endpoints,
including Daily Adjusted, are premium. It can be an alternative for a small
cached demonstration, but verify the chosen endpoint's access and available
history before selecting it.
[API documentation](https://www.alphavantage.co/documentation/) ·
[Usage limits](https://www.alphavantage.co/support/)

## Proposed implementation in this repository

This is a plan, not existing runtime behavior.

1. **Choose demo holdings.** Define the three risk profiles using supported
   stock and bond ETFs plus cash. Use the same holdings in frontend charts and
   backend calculations. These symbols are sample inputs, not recommendations.
2. **Fetch and cache prices server-side.** Store timestamps, provider, feed,
   requested dates, and adjustment settings. Cache only data the provider
   permits storing/displaying; keep an allowed dated snapshot for a reliable
   demo if available.
3. **Calculate real metrics from those prices.** Align trading dates, validate
   missing observations, and use a documented return/rebalancing method.
   Annualize consistently with the data frequency and compute drawdown from the
   calculated value series. Keep cash treatment explicit.
4. **Preserve data provenance.** Extend the shared response contract to distinguish
   `holdings_source`, `prices_source`, `prices_as_of`, and
   `performance_method`. These are proposed fields, not implemented ones.
   Keep an illustrative portfolio marked simulated even when its prices are real.
5. **Connect the frontend.** Its current `/api/portfolios/*` routes and camelCase
   types do not match the backend's `/api/portfolio/*` routes and snake_case types.
   Implement a service adapter before disabling frontend mocks.
6. **Feed computed values to Bedrock.** Ask the model to explain those values,
   never to invent prices or calculate unverified return figures.
7. **Make outages visible.** Distinguish fresh data, cached data, fixture data,
   AWS explanation, and deterministic explanation in the UI. Do not silently
   label fixtures as market data.
8. **Test the integration.** Check authentication failure, rate limiting,
   pagination, missing symbols, stale data, corporate actions, and agreement
   between the metrics, charts, and AI input.

The existing `analytics.engine.analyze_portfolio(profile)` import is only an
integration hook. Implement that engine or update the adapter deliberately;
changing `USE_MOCK_ANALYTICS` does not fetch real data by itself.

## What the team needs next

For the recommended approach, obtain API credentials for a dedicated Alpaca
paper-only demo account. A Plaid developer team and Sandbox credentials are
optional if an account-linking demonstration is desired. No team member needs
to connect a personal Robinhood, bank, or investment account.

Keep provider credentials in the backend's ignored `.env` or deployment
environment. The AWS workshop password is unrelated to these data APIs.
The account setup and authenticated API calls have not been tested here.
