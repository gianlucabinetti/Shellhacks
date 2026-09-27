# Portfolio X-Ray — AWS + Alpaca

Backtest any mix of real stocks, ETFs, and crypto on **real Alpaca market
data**, x-ray how diversified it really is, and ask an **AI copilot** (Amazon
Nova on AWS Bedrock) to explain it or test what-ifs.

**Real vs practice:** every price, chart, and return on the Markets screen
comes from live Alpaca feeds. The portfolio itself is a practice backtest:
no real money is invested, no trades are placed, and no bank, brokerage, or
wallet is connected.

**Start here:** [Market data and crypto setup](MARKET_DATA_SETUP.md) ·
[AWS setup](AWS_SETUP.md) · [Provider research](docs/DATA_SOURCES.md)

## What works

- **Live market ticker:** real Alpaca prices for BTC, ETH, SOL, XRP, DOGE,
  SPY, AAPL, MSFT, and VTI with day change and 30-day sparklines, refreshed
  every 30 seconds. Crypto trades 24/7; stocks are labelled *Closed* outside
  market hours instead of pretending to be live.
- **Market screen:** search a catalog of crypto, stocks, and ETFs; choose
  1–12 assets; set weights with sliders; backtest a practice amount.
- **Crypto without API keys:** Bitcoin, Ethereum, Solana, Avalanche, Chainlink,
  Dogecoin, Litecoin, Bitcoin Cash, Uniswap, Aave, Polkadot, and XRP.
- **Stocks and ETFs:** VTI, VXUS, SPY, AAPL, MSFT, BND, and SGOV through Alpaca's
  IEX feed. Server-side Alpaca credentials are required for this part.
- **Backtest results:** 1M, 3M, and 1Y look-backs; "if you had invested $X on
  date Y it would be worth…", period return, annualized volatility, and worst
  drop from a previous high.
- **Replay:** a time-lapse that draws the portfolio (and benchmark) day by day
  with a rolling value counter.
- **Honest data labels:** real prices with source/feed, fetch time, and
  calculation assumptions; practice money is labelled as such.
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
- **Build it with AI:** describe a goal in plain words ("I'm 22, want growth
  but can't handle big drops"). On Bedrock the AI backtests 2–3 candidate
  mixes on real prices, picks the best fit, explains each holding, and loads
  it into the dashboard, showing every candidate it tested. Offline, a keyword
  model picks a template mix and backtests it the same way. Always labelled
  an educational example, not a recommendation.
- **Share + QR code:** the address bar always encodes the analyzed portfolio
  (`?mix=BTC-USD:50,ETH-USD:30&amt=10000&d=90&vs=SPY`), and **Share** shows a
  QR code, copy link, and the phone's native share sheet. Opening a link
  re-runs that exact mix on live prices. See [Demo on phones](#demo-on-phones).
- **Future range:** a fan chart of where today's amount could go in 1–10
  years, using the mix's real volatility and an average return the user
  picks (0%, 4%, or 7%). Shows typical, 1-in-20 bad and good outcomes, and the
  chance of ending below the start. Clearly labelled *not a forecast*.
- **Modern, motion-driven UI:** Geist type, glass surfaces, spring animations
  (`motion`), rolling numbers (`@number-flow/react`), and scroll reveals. All
  motion respects the operating system's reduced-motion setting.

New endpoints (new contracts; existing ones are unchanged):

| Endpoint | Body | Returns |
|---|---|---|
| `GET /api/market/ticker` | — | latest price, day change, market-open flag, and 30-day closes per symbol (cached 20 s) |
| `POST /api/market/insights` | `{portfolio: MarketRequest, benchmark: "SPY" \| "60_40" \| "BTC" \| null}` | correlation matrix, diversification, contributions, benchmark series |
| `POST /api/market/chat` | `{portfolio, benchmark, messages: [{role, content}]}` (last message from the user) | `{source, reply, what_ifs, suggestions}` |
| `POST /api/market/build` | `{goal, initial_investment, days}` | `{source, name, summary, holdings: [{symbol, weight, reason}], result, tested}` |
| `POST /api/market/projection` | `{portfolio, years: 1\|3\|5\|10, annual_return: -0.2…0.2}` | monthly `p5/p25/p50/p75/p95` bands, `probability_below_start`, volatility used, notes |

Calculations live in `backend/analytics/insights.py` and
`backend/analytics/projection.py`; prompts and tool loops live in
`backend/ai/chat.py` and `backend/ai/builder.py`; the ticker lives in
`backend/services/market_live.py`.

The app has two screens: **Markets** (the default) and **Risk quiz**. The quiz
is scored by the backend's deterministic scorer (`POST /api/risk/assess`), so
the result depends on the answers: loss tolerance combines the "largest loss",
"20% drop", and "steady vs swings" answers (the first counts double). Its
stock/bond/cash split becomes real funds (stocks 70% VTI / 30% VXUS, bonds
BND, cash SGOV) and **See it on real market prices** loads that mix into the
Markets dashboard with a 1-year backtest. The older Learn page and mock
dashboard were removed.

## Quick start

Use Python 3.10+ and Node 20.19+ or 22.12+ (required by Vite 8). Run backend
commands from this directory.

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

Copy the example only on first setup; preserve an existing `.env`. The example
starts with `AI_PROVIDER=fallback` and no Alpaca keys, so crypto and offline AI
work immediately; see [Enable stocks and ETFs](#enable-stocks-and-etfs) and
[AWS configuration](#aws-configuration) to turn on the rest.

### Frontend — second terminal

```bash
cd frontend
npm ci
npm run dev
```

`npm run dev` and `npm run demo` also work from the repo root, which forwards
them to `frontend/`.

Open the Vite URL. Bitcoin, Ethereum, and Solana are selected initially.
Crypto prices work without Alpaca credentials. To run without AWS while trying
the market screen, set `AI_PROVIDER=fallback` in the backend `.env`.

For remote AWS editor forwarding and CORS, see [AWS_SETUP.md](AWS_SETUP.md).

### Demo on phones

A QR code made on `http://localhost:5173` can't work on a phone: `localhost`
means "this device", so the phone looks for the app on itself. The app needs a
public address.

**One command, any network (recommended).** Install
[`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
once (Windows: `winget install --id Cloudflare.cloudflared`, macOS:
`brew install cloudflared`), then from the repo root or `frontend/`:

```bash
npm run demo
```

It starts the backend if it isn't running, builds the frontend, serves the
build on port 4173, opens a Cloudflare quick tunnel, waits until the public
`https://….trycloudflare.com` address answers, and opens it in your browser.
Press **Share** there and the QR code works on any phone, on Wi-Fi or cellular.
No need to run `npm run dev` for the demo.

- **Keep the window open** during the demo. Ctrl+C stops sharing.
- **The address changes every run**, so share QR codes after starting it.
- **Anyone with the link can use the app** while it runs, including AI
  features billed to your AWS account. Stop it after the demo.
- **Why it's reliable on campus Wi-Fi:** it forces `--protocol http2`, because
  networks such as FIU's block the QUIC (UDP) connection `cloudflared` tries
  first. It serves the production build (a few files) rather than the dev
  server (hundreds of modules), so pages load in about a second through the
  tunnel. It finds `cloudflared` in its install folder, so it works even in a
  terminal opened before installing.
- **If the network blocks Cloudflare entirely**, connect the laptop to a phone
  hotspot and run it again.

**Same Wi-Fi or hotspot, no tunnel:** with the laptop and phone on the same
home Wi-Fi or hotspot, run `npm run dev:lan` in `frontend/`, open the
**Network** address Vite prints (for example `http://192.168.1.5:5173`), and
share from there. Only devices on that network can open it, so it won't work
for judges' phones. Windows may ask to allow Node.js through the firewall;
allow it on private networks only. Campus Wi-Fi blocks this mode.

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

The server uses boto3's credential chain. Any of these works:

- **Bedrock API key:** create a long-term key in the Bedrock console
  (API keys) and set `AWS_BEARER_TOKEN_BEDROCK=` in `.env`. This is the
  simplest option on a laptop.
- An authorized workshop IAM role (nothing to set).
- An AWS CLI profile (`AWS_PROFILE`), or temporary credentials including a
  session token.

The root `.env` loads automatically, without overriding process variables.
Never put AWS values in `VITE_*` variables; they would ship to the browser.

No OpenAI key or package is used. The workshop code-editor password is not an
AWS API key. Event EC2/SageMaker/S3 access does not itself establish Bedrock
permission; the role must be permitted to invoke the selected model.

```bash
python -m scripts.check_bedrock
```

The checker makes one small real model request and never reports a template
fallback as success. `AI_PROVIDER=fallback` selects offline explanations;
an unset value also defaults to offline.

## Data semantics

The app fetches **completed daily historical prices**, not streaming quotes.
Displayed returns describe a hypothetical buy-and-hold portfolio, not someone's
actual account performance. No fees, taxes, rebalancing, or staking income are
modeled. Crypto and equity calendars are handled explicitly; details appear
in the UI and [market setup guide](MARKET_DATA_SETUP.md).

Market-data failures appear as errors rather than silently switching to mock
prices. Model failures may use a template, which the market screen labels.

## Verification

- **154 backend tests passed:** routes, Bedrock tool loops (stubbed),
  portfolio, insight, sector-exposure, and projection calculations, crypto/equity calendars,
  pagination, cache expiry, missing prices, and API errors.
- **Frontend type check, production build, and lint passed.**
- **Live checks passed (Sept 27, 2026):** all 12 catalog coins returned
  prices; Alpaca stocks (VTI, BND) through the IEX feed with paper keys; and
  Amazon Nova Lite on Bedrock in us-east-1.
- **Phone demo verified:** `npm run demo` went live on FIU campus Wi-Fi; the
  public link, opened from the laptop at phone width, loaded in about half a
  second, all market API calls succeeded, and the Share QR encoded the public
  address.

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
| GET | `/api/market/ticker` | Live prices, day change, and 30-day sparklines. |
| POST | `/api/market/insights` | Correlations, diversification score, contributions, benchmark. |
| POST | `/api/market/chat` | AI copilot reply with what-if backtests. |
| POST | `/api/market/build` | "Build it with AI" portfolio from a plain-language goal. |
| POST | `/api/market/projection` | Future range percentile bands. |
| GET | `/api/health` | Backend liveness. |
| POST | `/api/risk/assess` | Deterministic risk scoring used by the Risk quiz. |
| GET | `/api/portfolio/{profile}` | Legacy portfolio fixtures or external analytics hook. |
| POST | `/api/ai/explain` | Legacy profile explanation. |
| GET | `/api/dashboard/{profile}` | Legacy portfolio and explanation. |
| GET | `/api/education/tiles` | Educational content. |

Legacy profiles: conservative, moderate, aggressive.

## Legacy backend settings

The frontend no longer uses mock data or `VITE_USE_MOCKS`. The legacy backend
routes (`/api/portfolio`, `/api/dashboard`, `/api/ai/explain`) are unchanged
for teammates; keep `USE_MOCK_ANALYTICS=true` for them, since their non-mock
path imports `analytics.engine.analyze_portfolio(profile)`, which is not
included. The legacy AI `experience` parameter is accepted but not yet threaded
into its prompt.

## Code map

Backend:

- `backend/market_assets.json`: editable asset catalog.
- `backend/services/market_data.py`: Alpaca reads, validation, and bounded cache.
- `backend/services/market_portfolio.py`: actual portfolio calculations.
- `backend/services/market_live.py`: live ticker.
- `backend/services/market_insights.py`: benchmarks, what-if backtests, projection wiring.
- `backend/analytics/insights.py`, `projection.py`: correlation, diversification, contributions, future range math.
- `backend/ai/chat.py`, `builder.py`: copilot and "Build it with AI" prompts and Bedrock tool loops.
- `backend/ai/provider.py`: Amazon Nova structured generation.
- `backend/routers/market.py`: all market, insight, chat, build, and projection endpoints.
- `backend/tests/`: backend/provider/analytics tests.
- `scripts/check_market_data.py` and `scripts/check_bedrock.py`: live checks.

Frontend:

- `frontend/src/pages/MarketPage.tsx`: asset selection, dashboard, and charts.
- `frontend/src/components/market/`: ticker, benchmark replay, X-ray, copilot, Build it with AI, share dialog, future range.
- `frontend/src/pages/QuizPage.tsx`, `ResultPage.tsx`, `services/riskQuiz.ts`: the risk quiz and its backend scoring.
- `frontend/src/utils/share.ts`: portfolio share links.
- `frontend/scripts/demo.mjs`: `npm run demo` (build, serve, public tunnel).

Plaid and Robinhood remain unconnected. Plaid Sandbox is an optional future
account-linking demo with synthetic holdings; see the provider research.

