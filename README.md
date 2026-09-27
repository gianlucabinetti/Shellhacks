# Portfolio X-Ray — AWS + Alpaca

An educational portfolio simulator with real historical market prices,
fictional holdings, and Amazon Nova explanations through AWS Bedrock.
No personal bank account, brokerage portfolio, or crypto wallet is connected.

**Start here:** [Market data and crypto setup](MARKET_DATA_SETUP.md) ·
[AWS setup](AWS_SETUP.md) · [Provider research](docs/DATA_SOURCES.md)

## What works

- **Connected market screen:** search a catalog of crypto, stocks, and ETFs;
  choose 1–12 assets; set weights; analyze a fictional starting amount.
- **Crypto without API keys:** Bitcoin, Ethereum, Solana, Avalanche, Chainlink,
  Dogecoin, Litecoin, Bitcoin Cash, Uniswap, Aave, Polkadot, and XRP.
- **Stocks and ETFs:** VTI, VXUS, SPY, AAPL, MSFT, BND, and SGOV through Alpaca's
  IEX feed. Server-side Alpaca credentials are required for this part.
- **Historical analysis:** 30-day, 90-day, and one-year periods; value chart,
  period return, annualized volatility, and daily-observed drawdown.
- **Honest data labels:** actual market prices, fictional holdings, source/feed,
  date, fetch time, cache status, and calculation assumptions.
- **AWS explanations:** Amazon Nova Lite through Bedrock in us-east-1.
  The UI clearly distinguishes AWS output from an offline template.
- **Expandable catalog:** add provider-supported symbols in
  `backend/market_assets.json`; no frontend code changes are needed.
- **Benchmark comparison:** overlay the S&P 500 (SPY), a 60/40 VTI/BND mix, or
  Bitcoin, compared over the same dates.
- **Diversification X-ray:** correlation heatmap plus a 0–100 score based on
  the diversification ratio ("how many independent bets is this really?").
- **AI portfolio copilot:** a chat grounded in the calculated numbers. On
  Bedrock it can run what-if mixes through a tool that recalculates them with
  real prices; "Load this mix" applies one to the dashboard. With
  `AI_PROVIDER=fallback` it answers common questions deterministically.

New endpoints (new contracts; existing ones are unchanged):

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/market/insights` | `{portfolio: MarketRequest, benchmark: "SPY" \| "60_40" \| "BTC" \| null}` | correlation matrix, diversification, contributions, benchmark series |
| `POST /api/market/chat` | `{portfolio, benchmark, messages: [{role, content}]}` (last message from the user) | `{source, reply, what_ifs, suggestions}` |

Calculations live in `backend/analytics/insights.py`; prompts and the chat
tool loop live in `backend/ai/chat.py`.

The new market screen is the default landing page and calls the backend.
The earlier questionnaire and dashboard remain under **Original demo**, with
their existing mock data. The new screen does not depend on that unfinished
legacy API adapter.

## Quick start

Use Python 3.10+ and Node compatible with the existing Vite 8 project
(Node 22.12+ is a suitable choice). Run backend commands from this directory.

### Backend — Linux / macOS / AWS editor

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
python -m uvicorn backend.main:app --reload --port 8000
```

### Backend — Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

Copy the example only on first setup; preserve an existing `.env`.

### Frontend — second terminal

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite URL. Bitcoin, Ethereum, and Solana are selected initially.
Crypto prices work without Alpaca credentials. To run without AWS while trying
the market screen, set `AI_PROVIDER=fallback` in the backend `.env`.

For remote AWS editor forwarding and CORS, see [AWS_SETUP.md](AWS_SETUP.md).

## Enable stocks and ETFs

In the backend `.env`, set the credentials from an Alpaca paper-only account:

```dotenv
APCA_API_KEY_ID=your_paper_key_id
APCA_API_SECRET_KEY=your_paper_secret
```

Restart the backend and reload the frontend. Then verify access with:

```bash
python -m scripts.check_market_data --stocks
```

The integration only reads market-data endpoints. It does not retrieve account
holdings or submit orders. See [MARKET_DATA_SETUP.md](MARKET_DATA_SETUP.md)
for the complete setup, limits, and catalog instructions.

## AWS configuration

```dotenv
AI_PROVIDER=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

The server uses boto3's credential chain: an authorized workshop IAM role,
an AWS profile, or temporary credentials including a session token.
The root `.env` loads automatically, without overriding process variables.

No OpenAI key or package is used. The workshop code-editor password is not an
AWS API key. Event EC2/SageMaker/S3 access does not itself establish Bedrock
permission; the role must be permitted to invoke the selected model.

```bash
python -m scripts.check_bedrock
```

The checker makes one small real model request and never reports a template
fallback as success. `AI_PROVIDER=fallback` selects offline explanations;
an unset value also defaults to offline. AWS access remains unverified here.

## Data semantics

The app fetches **completed daily historical prices**, not streaming quotes.
Displayed returns describe a hypothetical buy-and-hold portfolio, not someone's
actual account performance. No fees, taxes, rebalancing, or staking income are
modeled. Crypto and equity calendars are handled explicitly; details appear
in the UI and [market setup guide](MARKET_DATA_SETUP.md).

Market-data failures appear as errors rather than silently switching to mock
prices. Model failures may use a template, which the market screen labels.

## Verification

- **90 backend tests passed:** existing routes, Bedrock, portfolio calculations,
  crypto/equity calendars, pagination, cache expiry, missing prices, and API errors.
- **Frontend production build and lint passed.**
- **Live crypto requests verified:** all 12 catalog coins returned prices.
  A 90-day BTC/ETH/SOL portfolio produced a complete series and calculation.
- **Still needs credentials:** live stock/ETF access and live AWS generation.

```bash
python -m pytest
python -m scripts.check_market_data
python -m scripts.check_market_data --stocks
python -m scripts.check_bedrock
```

Unit tests use fixtures and stubs; the three connection checks make live calls.
A passing backend health check alone does not verify any provider.

## API

Interactive docs: [localhost:8000/docs](http://localhost:8000/docs).

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/market/assets` | Catalog and stock-credential configuration status. |
| POST | `/api/market/portfolio` | Real-price, hypothetical portfolio calculation. |
| POST | `/api/market/explain` | Explanation with AWS/template source and calculation ID. |
| GET | `/api/health` | Backend liveness. |
| POST | `/api/risk/assess` | Legacy deterministic risk scoring. |
| GET | `/api/portfolio/{profile}` | Legacy portfolio fixtures or external analytics hook. |
| POST | `/api/ai/explain` | Legacy profile explanation. |
| GET | `/api/dashboard/{profile}` | Legacy portfolio and explanation. |
| GET | `/api/education/tiles` | Educational content. |

Legacy profiles: conservative, moderate, aggressive.

## Legacy demo settings

Keep `VITE_USE_MOCKS=true` and `USE_MOCK_ANALYTICS=true` for **Original demo**.
Neither switch disables the new market screen or changes its Alpaca source.

The original frontend service contracts still need an adapter if the team
wants the questionnaire and old dashboard fully connected. Its
`/api/portfolios/*` and camelCase fields differ from the legacy backend.
The old non-mock path imports `analytics.engine.analyze_portfolio(profile)`,
which is not included. Do not turn that flag off merely to enable Alpaca.

The legacy AI `experience` parameter remains accepted but is not yet threaded
into its prompt. The new market explanation describes the selected asset mix
and calculated figures.

## Code map

- `backend/market_assets.json`: editable asset catalog.
- `backend/services/market_data.py`: Alpaca reads, validation, and bounded cache.
- `backend/services/market_portfolio.py`: actual portfolio calculations.
- `backend/routers/market.py`: connected market and explanation endpoints.
- `frontend/src/pages/MarketPage.tsx`: asset selection, charts, and explanations.
- `backend/ai/provider.py`: Amazon Nova structured generation.
- `scripts/check_market_data.py` and `scripts/check_bedrock.py`: live checks.
- `backend/tests/`: backend/provider/analytics tests.

Plaid and Robinhood remain unconnected. Plaid Sandbox is an optional future
account-linking demo with synthetic holdings; see the provider research.

