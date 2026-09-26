# API Contracts

**Status:** v0.1 draft, written from the frontend's current code, **not yet agreed** by backend, analytics or AI.
**Source of truth in code:** [`frontend/src/types/api.ts`](../frontend/src/types/api.ts) (types) and [`frontend/src/services/api.ts`](../frontend/src/services/api.ts) (endpoint paths).
**Last updated:** 2026-09-26

Each endpoint is marked with one of two statuses:

- **IMPLEMENTED:** the frontend already calls this endpoint and renders its response. The shape below matches the TypeScript types and mock data exactly. Changing it means changing the frontend.
- **PROPOSED:** the frontend doesn't use this yet. The shape is a proposal and is open for discussion.

---

## 0. Conventions (apply to every endpoint)

| Topic | Rule |
|---|---|
| Base URL | Frontend reads `VITE_API_BASE_URL` (e.g. `http://localhost:8000`) and appends the paths below. |
| Format | JSON request and response bodies. Frontend sends `Content-Type: application/json` on **every** request, including GETs, so CORS must allow that header (it triggers a preflight). |
| Field naming | `camelCase`. Enum **values** are `snake_case` or lowercase strings (see enums). |
| **Percentages** | **Always decimals, never whole numbers.** `0.4` = 40%, `-0.19` = −19%, `0.0942` = 9.42%. Applies to `weight`, `annualizedReturn`, `annualizedVolatility`, `maxDrawdown`, `portfolioImpact`. |
| Scores | `riskScore` is the only non-decimal scale: integer 0–100. |
| Money | Plain JSON numbers (not strings, not cents), in the portfolio's `currency` (ISO 4217, currently always `"USD"`). |
| **Dates** | Calendar dates are **date-only** `"YYYY-MM-DD"` (e.g. `"2026-08-31"`). The frontend appends `T00:00:00Z` when formatting, so **a full datetime here would break display**. Applies to `asOf`, `date`, `periodStart`, `periodEnd`, `maxDrawdownPeriod.*`. |
| Timestamps | Moments in time are full ISO 8601 UTC datetimes: `"2026-09-26T14:03:00Z"`. Applies to `updatedAt`, `generatedAt`. |
| Nullability | Optional fields (`?`) may be omitted. Fields typed `X \| null` must be present, with `null` when unset. |
| User identity | No auth yet. All `/api/user/*` endpoints act on a single demo user. **Open question:** if we need per-user data, agree on a header (e.g. `X-User-Id`) before integration. |

### Shared enums

| Name | Values |
|---|---|
| `RiskProfile` | `"conservative"` \| `"moderate"` \| `"aggressive"` |
| `ExperienceLevel` | `"beginner"` \| `"intermediate"` \| `"experienced"` |
| `AssetClass` | `"us_stocks"` \| `"intl_stocks"` \| `"bonds"` \| `"cash"`. The frontend has a fixed colour per value, so **new values need a frontend change**. |
| `PerformanceRange` | `"1Y"` \| `"5Y"` \| `"10Y"` |

### Error response (all endpoints)

Any non-2xx response **must** use this body. The frontend shows `message` **directly to the user**, so write it as plain, user-safe language with no stack traces or SQL.

```ts
interface ApiErrorBody {
  error: {
    code: string     // machine-readable, snake_case
    message: string  // human-readable, shown in the UI
  }
}
```

```json
{ "error": { "code": "not_found", "message": "We couldn't find that portfolio." } }
```

| HTTP status | `code` | When |
|---|---|---|
| 400 | `invalid_request` | Malformed body, unknown enum value, missing field |
| 404 | `not_found` | Unknown `riskProfile` path segment, unknown resource |
| 409 | `assessment_required` | Changing the risk profile before any assessment exists (optional; see §10) |
| 500 | `internal_error` | Anything unexpected |
| 503 | `upstream_unavailable` | Analytics or AI dependency is down |

If the body isn't in this shape, the frontend falls back to `code: "http_error"`, `message: "Request failed (<status>)."`. If the server can't be reached, the frontend itself creates `code: "network_error"` (status `0`). **The backend never sends that one.**

---

## Endpoint summary

| # | Area | Method & path | Frontend type(s) | Service function | Status |
|---|---|---|---|---|---|
| 1a | Risk assessment: questions | `GET /api/questionnaire` | `Questionnaire` | `getQuestionnaire()` | IMPLEMENTED |
| 1b | Risk assessment: scoring | `POST /api/risk-assessment` | `RiskAssessmentRequest` → `RiskAssessmentResult` | `submitRiskAssessment()` | IMPLEMENTED |
| 2 | User profile | `GET /api/user/profile` | `UserProfile` | `getUserProfile()` | IMPLEMENTED (function exists, not yet called by any screen) |
| 3 | Portfolio | `GET /api/portfolios/{riskProfile}` | `Portfolio`, `AllocationSlice` | `getPortfolio()` | IMPLEMENTED |
| 4 | Holdings | *(part of #3)* | `Holding` | `getPortfolio()` | IMPLEMENTED |
| 5 | Risk metrics | `GET /api/portfolios/{riskProfile}/analytics` | `PortfolioAnalytics` | `getAnalytics()` | IMPLEMENTED |
| 6 | Historical performance | `GET /api/portfolios/{riskProfile}/performance?range=` | `PerformanceHistory`, `PerformancePoint` | `getPerformance()` | IMPLEMENTED |
| 7 | Scenario analysis | `GET /api/portfolios/{riskProfile}/scenarios` | *(none yet)* | *(none yet)* | PROPOSED |
| 8 | Educational content | `GET /api/education` | *(none yet)* | *(none yet)* | PROPOSED |
| 9 | AI explanation | `POST /api/explanations` | *(none yet)* | *(none yet)* | PROPOSED |
| 10 | Risk profile change | `PUT /api/user/risk-profile` | `UpdateRiskProfileRequest` → `UserProfile` | `updateRiskProfile()` | IMPLEMENTED |

---

## 1. Risk assessment

### 1a. `GET /api/questionnaire` (IMPLEMENTED)

Returns the quiz. The frontend renders questions **in array order**, one per screen, and requires exactly one option per question.

**Request body:** none.

**Response `200`:** `Questionnaire`

| Field | Type | Notes |
|---|---|---|
| `questionnaireId` | string | Echoed back in 1b |
| `version` | string | Not displayed |
| `questions` | `Question[]` | Empty array → frontend shows "No questions available right now" |
| `questions[].id` | string | Unique within questionnaire |
| `questions[].category` | `"experience"` \| `"risk_tolerance"` | Experience is kept **separate** from risk tolerance. The UI labels them "About you" and "Comfort with risk". |
| `questions[].prompt` | string | Question text |
| `questions[].helpText` | string? | Optional sub-text |
| `questions[].options` | `{ id: string; label: string }[]` | Rendered as radio buttons, in order |

```json
{
  "questionnaireId": "risk-quiz",
  "version": "2026-09-draft",
  "questions": [
    {
      "id": "experience",
      "category": "experience",
      "prompt": "How much investing experience do you have?",
      "helpText": "This helps us pitch explanations at the right level. It does not change your risk profile.",
      "options": [
        { "id": "none", "label": "None yet: I'm just getting started" },
        { "id": "some", "label": "Some: I've bought a fund or a few stocks" },
        { "id": "experienced", "label": "Experienced: I invest regularly" }
      ]
    },
    {
      "id": "decline",
      "category": "risk_tolerance",
      "prompt": "Imagine your investments drop 20% in one month. What would you most likely do?",
      "options": [
        { "id": "sell", "label": "Sell everything to avoid further losses" },
        { "id": "hold", "label": "Wait and do nothing" },
        { "id": "buy", "label": "Invest more while prices are lower" }
      ]
    }
  ]
}
```

The full six-question mock set (experience, horizon, goal, decline, loss, preference) is in [`frontend/src/mocks/questionnaire.ts`](../frontend/src/mocks/questionnaire.ts). The backend may copy it as the starting content.

### 1b. `POST /api/risk-assessment` (IMPLEMENTED)

**The backend calculates the risk profile.** The frontend does no scoring. It sends raw answers and displays the result. It also sends **one answer per question, in questionnaire order**.

**Request body:** `RiskAssessmentRequest`

| Field | Type | Notes |
|---|---|---|
| `questionnaireId` | string | From 1a |
| `answers` | `{ questionId: string; optionId: string }[]` | One entry per question |

```json
{
  "questionnaireId": "risk-quiz",
  "answers": [
    { "questionId": "experience", "optionId": "none" },
    { "questionId": "horizon", "optionId": "3to7" },
    { "questionId": "goal", "optionId": "balance" },
    { "questionId": "decline", "optionId": "hold" },
    { "questionId": "loss", "optionId": "loss15" },
    { "questionId": "preference", "optionId": "mixed" }
  ]
}
```

**Response `200`:** `RiskAssessmentResult`

| Field | Type | Notes |
|---|---|---|
| `assessmentId` | string | |
| `riskProfile` | `RiskProfile` | Drives the result screen and the initial dashboard |
| `riskScore` | integer 0–100 | **Whole number, not a decimal.** Higher means more tolerance. Not currently displayed. |
| `experienceLevel` | `ExperienceLevel` | Displayed separately from the risk profile |
| `summary` | string | 1–2 plain-language sentences, displayed under the profile name |
| `factors` | `RiskFactor[]` | 0–5 items. Empty array hides the "What shaped this result" list. |
| `factors[].questionId` | string | Used as a React key, so **must be unique** within `factors` |
| `factors[].label` | string | Short phrase |
| `factors[].impact` | `"lower_risk"` \| `"neutral"` \| `"higher_risk"` | Shown as an arrow icon and text |
| `disclaimer` | string | Displayed verbatim |

**Side effect:** the backend should save `riskProfile`, `experienceLevel` and `assessmentId` to the user profile (§2). The mock does this.

```json
{
  "assessmentId": "assess-mock-001",
  "riskProfile": "moderate",
  "riskScore": 54,
  "experienceLevel": "beginner",
  "summary": "Your answers suggest you are comfortable with some ups and downs in exchange for long-term growth, but would prefer to avoid very large losses.",
  "factors": [
    { "questionId": "horizon", "label": "Medium-to-long time horizon", "impact": "higher_risk" },
    { "questionId": "decline", "label": "Would hold steady during a market drop", "impact": "neutral" },
    { "questionId": "loss", "label": "Prefers to limit yearly losses to around 15%", "impact": "lower_risk" }
  ],
  "disclaimer": "This risk profile is for educational purposes only and is not personalized financial advice."
}
```

**Errors:** `400 invalid_request` for an unknown `questionnaireId`, a missing answer, or an unknown `optionId`.

---

## 2. User profile: `GET /api/user/profile` (IMPLEMENTED)

**Request body:** none.

**Response `200`:** `UserProfile`

| Field | Type | Notes |
|---|---|---|
| `userId` | string | |
| `displayName` | string | Not displayed yet |
| `riskProfile` | `RiskProfile \| null` | `null` before the first assessment |
| `experienceLevel` | `ExperienceLevel \| null` | `null` before the first assessment |
| `assessmentId` | `string \| null` | `null` before the first assessment |
| `updatedAt` | string (ISO datetime) | |

```json
{
  "userId": "demo-user",
  "displayName": "Demo Investor",
  "riskProfile": "moderate",
  "experienceLevel": "beginner",
  "assessmentId": "assess-mock-001",
  "updatedAt": "2026-09-26T14:03:00Z"
}
```

Before any assessment:

```json
{
  "userId": "demo-user",
  "displayName": "Demo Investor",
  "riskProfile": null,
  "experienceLevel": null,
  "assessmentId": null,
  "updatedAt": "2026-09-26T00:00:00Z"
}
```

---

## 3. Portfolio: `GET /api/portfolios/{riskProfile}` (IMPLEMENTED)

Returns the **illustrative example portfolio** for a risk level. It is the same for every user and is **not** personalized advice.

**Path param:** `riskProfile`, one of `RiskProfile`. Any other value returns `404 not_found`.
**Request body:** none.

**Response `200`:** `Portfolio`

| Field | Type | Notes |
|---|---|---|
| `riskProfile` | `RiskProfile` | Must equal the path param |
| `label` | string | e.g. "Moderate example portfolio". Not currently displayed. |
| `description` | string | One sentence, shown under the dashboard title |
| `isIllustrative` | `true` (literal) | Always `true` |
| `currency` | string | ISO 4217, `"USD"` |
| `startingValue` | number | Money. The hypothetical initial investment, `10000` in mocks. |
| `simulatedValue` | number | Money. Value today of `startingValue` invested at the start of the **default 5Y period** (see cleanup item C1). |
| `asOf` | string (date-only) | Date `simulatedValue` refers to |
| `allocation` | `AllocationSlice[]` | See below |
| `holdings` | `Holding[]` | See §4 |

`AllocationSlice`:

| Field | Type | Notes |
|---|---|---|
| `assetClass` | `AssetClass` | |
| `label` | string | Display name, e.g. "US stocks" |
| `weight` | number | **Decimal 0–1.** `0.4` = 40%. |

**Allocation rules the frontend relies on:**
- Include **all four asset classes in this fixed order: `us_stocks`, `intl_stocks`, `bonds`, `cash`**, even if a weight is `0`. The risk-change comparison lists rows from the *current* allocation and looks up the *new* one by `assetClass`, so a missing class won't appear.
- Weights sum to `1.0`.
- The frontend sums `us_stocks + intl_stocks` for the "60% stocks" donut label.

```json
{
  "riskProfile": "moderate",
  "label": "Moderate example portfolio",
  "description": "A mix of stocks for growth and bonds for stability.",
  "isIllustrative": true,
  "currency": "USD",
  "startingValue": 10000,
  "simulatedValue": 15459,
  "asOf": "2026-08-31",
  "allocation": [
    { "assetClass": "us_stocks",   "label": "US stocks",            "weight": 0.4 },
    { "assetClass": "intl_stocks", "label": "International stocks", "weight": 0.2 },
    { "assetClass": "bonds",       "label": "Bonds",                "weight": 0.35 },
    { "assetClass": "cash",        "label": "Cash",                 "weight": 0.05 }
  ],
  "holdings": [
    { "ticker": "USEQ", "name": "US Total Stock Market Index Fund", "assetClass": "us_stocks",   "weight": 0.4,  "value": 6183.6 },
    { "ticker": "INTL", "name": "International Stock Index Fund",   "assetClass": "intl_stocks", "weight": 0.2,  "value": 3091.8 },
    { "ticker": "BOND", "name": "Aggregate Bond Index Fund",        "assetClass": "bonds",       "weight": 0.35, "value": 5410.65 },
    { "ticker": "CASH", "name": "Money Market Fund",                "assetClass": "cash",        "weight": 0.05, "value": 772.95 }
  ]
}
```

Mock allocations for all three levels (weights):

| `riskProfile` | `us_stocks` | `intl_stocks` | `bonds` | `cash` |
|---|---|---|---|---|
| conservative | 0.20 | 0.10 | 0.55 | 0.15 |
| moderate | 0.40 | 0.20 | 0.35 | 0.05 |
| aggressive | 0.60 | 0.30 | 0.10 | 0.00 |

---

## 4. Holdings (IMPLEMENTED, embedded in §3)

There is **no separate holdings endpoint**. Holdings are returned in `Portfolio.holdings`.

`Holding`:

| Field | Type | Notes |
|---|---|---|
| `ticker` | string | Used as a React key, so **must be unique** within the portfolio. Mocks use fictional placeholders (`USEQ`, `INTL`, `BOND`, `CASH`) on purpose. The UI labels them "illustrative". |
| `name` | string | Fund name |
| `assetClass` | `AssetClass` | Colour of the row marker |
| `weight` | number | **Decimal 0–1** |
| `value` | number | Money = `simulatedValue × weight` |

Rules: omit holdings with weight `0` (the aggressive mock has no `CASH` row). An empty array shows "This portfolio has no holdings."

---

## 5. Risk metrics: `GET /api/portfolios/{riskProfile}/analytics` (IMPLEMENTED)

Historical risk and return statistics for the example portfolio, calculated by the **analytics service**. The frontend does no financial maths.

**Path param:** `riskProfile`. **Request body:** none. **No query params.** The period is fixed by the backend (currently 5 years; see cleanup item C2).

**Response `200`:** `PortfolioAnalytics`

| Field | Type | Notes |
|---|---|---|
| `riskProfile` | `RiskProfile` | |
| `periodStart` | string (date-only) | Displayed, e.g. "Aug 2021 – Aug 2026" |
| `periodEnd` | string (date-only) | |
| `annualizedReturn` | number | **Decimal.** Compound annual growth rate. `0.091` = +9.1%/yr. Can be negative. |
| `annualizedVolatility` | number | **Decimal, ≥ 0.** Annualized standard deviation of monthly returns (monthly σ × √12). `0.0942` = 9.4%. |
| `maxDrawdown` | number | **Decimal, ≤ 0 (negative).** Worst peak-to-trough fall. `-0.19` = −19%. **Do not send a positive number.** |
| `maxDrawdownPeriod.start` | string (date-only) | Peak date. Not currently displayed. |
| `maxDrawdownPeriod.end` | string (date-only) | Trough date. Not currently displayed. |

```json
{
  "riskProfile": "moderate",
  "periodStart": "2021-08-31",
  "periodEnd": "2026-08-31",
  "annualizedReturn": 0.091,
  "annualizedVolatility": 0.0942,
  "maxDrawdown": -0.19,
  "maxDrawdownPeriod": { "start": "2021-12-31", "end": "2022-10-31" }
}
```

Mock values (5Y, synthetic data):

| `riskProfile` | `annualizedReturn` | `annualizedVolatility` | `maxDrawdown` |
|---|---|---|---|
| conservative | 0.0527 | 0.0545 | -0.1137 |
| moderate | 0.091 | 0.0942 | -0.19 |
| aggressive | 0.129 | 0.1351 | -0.2595 |

The dashboard shows these, and the risk-change dialog shows them for both the current and the target profile (§10).

---

## 6. Historical performance: `GET /api/portfolios/{riskProfile}/performance?range={range}` (IMPLEMENTED)

Backtest of the example portfolio on historical market data.

**Path param:** `riskProfile`. **Query param:** `range`, a `PerformanceRange` (`1Y`, `5Y` or `10Y`). The frontend's default is `5Y`, and **all three must be supported** because the UI has a button for each. **Request body:** none.

**Response `200`:** `PerformanceHistory`

| Field | Type | Notes |
|---|---|---|
| `riskProfile` | `RiskProfile` | The frontend uses this (not the request) to pick the line colour |
| `range` | `PerformanceRange` | Echo of the query param |
| `dataType` | `"historical_backtest"` (literal) | |
| `startingValue` | number | Money. Drawn as a dashed reference line. |
| `series` | `PerformancePoint[]` | Chronological, oldest first |
| `series[].date` | string (date-only) | Month-end dates in mocks |
| `series[].value` | number | Money. Portfolio value on that date. |

**Rules:**
- The series is **rebased**: `series[0].value === startingValue` at the start of the requested range.
- Monthly points: `1Y` = 13 points, `5Y` = 61, `10Y` = 121 (includes the starting point). Other frequencies render fine, but keep it to a few hundred points at most.
- For ranges over 2 years the x-axis shows one tick per calendar year, using `date.slice(0, 4)`.
- An empty `series` shows "No performance history yet."

```json
{
  "riskProfile": "moderate",
  "range": "1Y",
  "dataType": "historical_backtest",
  "startingValue": 10000,
  "series": [
    { "date": "2025-08-31", "value": 10000 },
    { "date": "2025-09-30", "value": 9768.89 },
    { "date": "2025-10-31", "value": 10066.11 },
    { "date": "2026-08-31", "value": 10704.17 }
  ]
}
```
*(Example truncated. A real 1Y response has 13 points.)*

---

## 7. Scenario analysis: `GET /api/portfolios/{riskProfile}/scenarios` (PROPOSED)

> No frontend types, service function or UI exist yet. This is the proposed shape for the next milestone.

Shows how the example portfolio would have fared in historical crises (`historical_replay`), or would fare in made-up shocks (`hypothetical`). The UI will label them differently ("Historical data" vs "Hypothetical scenario").

**Path param:** `riskProfile`. **Request body:** none.

**Response `200`:** `ScenarioAnalysis` *(proposed)*

```ts
interface ScenarioAnalysis {
  riskProfile: RiskProfile
  scenarios: Scenario[]
  disclaimer: string
}

interface Scenario {
  id: string                                   // unique, e.g. "covid-2020"
  name: string                                 // "2020 COVID crash"
  kind: 'historical_replay' | 'hypothetical'
  description: string                          // 1–2 plain-language sentences
  portfolioImpact: number                      // DECIMAL, e.g. -0.18 = portfolio fell 18%
  period?: { start: string; end: string }      // date-only; required for historical_replay
  series?: { label: string; value: number }[]  // optional path for a small chart; value = money
}
```

```json
{
  "riskProfile": "moderate",
  "scenarios": [
    {
      "id": "covid-2020",
      "name": "2020 COVID crash",
      "kind": "historical_replay",
      "description": "Markets fell sharply in early 2020 and recovered within months.",
      "portfolioImpact": -0.18,
      "period": { "start": "2020-02-19", "end": "2020-03-23" }
    },
    {
      "id": "rates-up-2pct",
      "name": "Interest rates rise 2%",
      "kind": "hypothetical",
      "description": "A made-up shock where rates rise quickly, hurting bond prices.",
      "portfolioImpact": -0.07,
      "series": [
        { "label": "Start", "value": 10000 },
        { "label": "Month 3", "value": 9420 },
        { "label": "Month 6", "value": 9300 }
      ]
    }
  ],
  "disclaimer": "Scenarios are illustrative. Hypothetical scenarios are not predictions."
}
```

---

## 8. Educational content: `GET /api/education` (PROPOSED)

> No frontend types, service function or UI exist yet. Could also be static JSON served by the backend.

Cards for Stocks, Bonds and ETFs / Index Funds, plus optional locked advanced topics (e.g. options).

**Request body:** none.

**Response `200`:** `EducationContent` *(proposed)*

```ts
interface EducationContent {
  topics: EducationTopic[]
}

interface EducationTopic {
  id: string                         // "stocks" | "bonds" | "etfs" | ...
  title: string
  level: 'beginner' | 'advanced'
  locked: boolean                    // true = render as "coming soon"; content fields may be empty strings
  whatItIs: string                   // plain text, no HTML/markdown
  whyPeopleUseIt: string
  typicalRisks: string
  example: string
}
```

```json
{
  "topics": [
    {
      "id": "stocks",
      "title": "Stocks",
      "level": "beginner",
      "locked": false,
      "whatItIs": "A small share of ownership in a company.",
      "whyPeopleUseIt": "Over long periods, stocks have historically grown faster than most other investments.",
      "typicalRisks": "Prices can swing a lot, and a single company can lose most of its value.",
      "example": "If you own 1 share of a company with 1,000,000 shares, you own one-millionth of it."
    },
    {
      "id": "options",
      "title": "Options",
      "level": "advanced",
      "locked": true,
      "whatItIs": "",
      "whyPeopleUseIt": "",
      "typicalRisks": "",
      "example": ""
    }
  ]
}
```

---

## 9. AI explanation: `POST /api/explanations` (PROPOSED)

> No frontend types, service function or UI exist yet.

The frontend **never generates financial claims itself**. It displays `text` word for word, labelled "AI-generated", with `disclaimer` underneath. The AI service is responsible for keeping the text educational and non-personalized.

**Request body:** `ExplanationRequest` *(proposed)*

```ts
interface ExplanationRequest {
  context: 'portfolio' | 'risk_change' | 'scenario'
  riskProfile: RiskProfile
  fromProfile?: RiskProfile   // required when context = "risk_change"
  scenarioId?: string         // required when context = "scenario"
}
```

```json
{ "context": "risk_change", "riskProfile": "aggressive", "fromProfile": "moderate" }
```

**Response `200`:** `Explanation` *(proposed)*

```ts
interface Explanation {
  explanationId: string
  context: 'portfolio' | 'risk_change' | 'scenario'
  riskProfile: RiskProfile
  text: string              // plain text; paragraphs separated by "\n\n"; no HTML/markdown
  generatedBy: 'ai'
  generatedAt: string       // ISO datetime
  disclaimer: string
}
```

```json
{
  "explanationId": "exp-001",
  "context": "risk_change",
  "riskProfile": "aggressive",
  "text": "The aggressive example portfolio holds more stocks than the moderate one.\n\nIn the historical period shown, that meant a higher average return but also a deeper worst-case drop.",
  "generatedBy": "ai",
  "generatedAt": "2026-09-26T14:05:00Z",
  "disclaimer": "AI-generated explanation for education only. Not financial advice."
}
```

**Errors:** `400 invalid_request` if a required conditional field is missing. `503 upstream_unavailable` if the model is unavailable; the UI will show a retry button.

---

## 10. Risk profile change: `PUT /api/user/risk-profile` (IMPLEMENTED)

Saves a new risk profile after the user has **explicitly confirmed** a warning.

**How the frontend flow uses the API:**
1. The user picks a new level on the dashboard.
2. **Preview:** the frontend calls `GET /api/portfolios/{target}` (§3) and `GET /api/portfolios/{target}/analytics` (§5) in parallel. It shows the allocation and risk metrics before and after, next to the data it already has for the current level. **There is no separate preview endpoint.**
3. The frontend shows the warning text (currently written in the frontend; see §11) and an acknowledgement checkbox.
4. **Only after confirmation**, it sends the request below.
5. On `200`, the dashboard reloads portfolio, analytics and performance for the new level.

**Request body:** `UpdateRiskProfileRequest`

| Field | Type | Notes |
|---|---|---|
| `riskProfile` | `RiskProfile` | The new level |
| `acknowledged` | `true` (literal) | Always `true`. The frontend never sends this request unless the user ticked the confirmation. Backend should reject `false` or a missing value with `400`. |

```json
{ "riskProfile": "aggressive", "acknowledged": true }
```

**Response `200`:** the updated `UserProfile` (§2).

```json
{
  "userId": "demo-user",
  "displayName": "Demo Investor",
  "riskProfile": "aggressive",
  "experienceLevel": "beginner",
  "assessmentId": "assess-mock-001",
  "updatedAt": "2026-09-26T14:10:00Z"
}
```

The frontend currently only checks for success and ignores the response body. It keeps the chosen level in local state.

**Errors:** `400 invalid_request` (bad enum, `acknowledged` not `true`). Optional: `409 assessment_required`. The UI shows "Your change was not saved" with the message, and the user can try again.

---

## 11. Frontend data with no API contract

These are currently **hard-coded in the frontend** (presentation copy or tiny display maths). None of them are mock data, but some may belong in the API later.

| Data | Where | Suggestion |
|---|---|---|
| Risk level names, taglines, level 1–3, colours ("Moderate", "Balanced growth") | `utils/riskProfiles.ts` | Keep in frontend. `Portfolio.label` overlaps and is currently unused. |
| Asset-class colours | `utils/riskProfiles.ts` | Keep in frontend. This is why `AssetClass` is a closed enum. |
| **Risk-change warning text** ("You are changing from Moderate to Aggressive…") | `components/profile/RiskChangeModal.tsx` | Fixed text picked by direction (more or less risk). OK for MVP. Could come from §9 later (`context: "risk_change"`). |
| Acknowledgement checkbox text | `RiskChangeModal.tsx` | Keep in frontend. |
| Metric explanations ("How much the value bounced around…") | `components/dashboard/RiskMetrics.tsx` | Fixed definitions. Keep, or move to §8. |
| Experience-level labels, factor-impact labels | `pages/ResultPage.tsx` | Keep in frontend. |
| Site-wide disclaimer | `components/common/Disclaimer.tsx` | Keep. Per-response `disclaimer` fields override it where they exist. |
| "60% stocks" donut label | `DashboardPage.tsx` sums `us_stocks + intl_stocks` weights | Display-only sum. Could become `Portfolio.stockWeight` if preferred. |
| "+$5,459 since start" | `PortfolioSummary.tsx` computes `simulatedValue − startingValue` | Display-only subtraction. |
| Welcome page copy, quiz headings | `pages/*` | Keep in frontend. |
| Mock-mode notices | `components/common/MockDataNotice.tsx` | Frontend-only; shown only when `VITE_USE_MOCKS=true`. |

---

## 12. Open issues and cleanup before integration

| # | Issue | Impact | Proposed fix |
|---|---|---|---|
| C1 | `Portfolio.simulatedValue` has no explicit period. The mock uses the 5Y backtest end value, but the contract doesn't say so. | Backend may pick a different horizon, and the UI wouldn't show which. | Add `valuePeriod: { start, end }` (date-only) to `Portfolio`, or agree "always the 5Y period". |
| C2 | `/analytics` has no `range` param. Metrics are always about 5Y while the chart can show 1Y/10Y. | Users may assume metrics follow the chart range. | Agree on a fixed 5Y for MVP (the UI shows the period dates). Optionally add `?range=` later. |
| C3 | No user identity on `/api/user/*`. | Single shared demo user. | Fine for the hackathon demo. Otherwise agree on an `X-User-Id` header. |
| C4 | Frontend sends `Content-Type: application/json` on GETs, which triggers a CORS preflight. | Backend must handle `OPTIONS` and allow the header and the frontend origin. | Enable CORS on the backend, or add a Vite dev proxy. |
| C5 | Dates must be date-only (`YYYY-MM-DD`). | A datetime here gives "Invalid Date" in the UI. | Backend serializes date fields as dates, not datetimes. |
| C6 | `maxDrawdown` must be negative. | A positive value would show as a gain. | Backend returns ≤ 0. |
| C7 | Allocation must list all 4 asset classes in fixed order, including zeros. | Missing classes disappear from the risk-change comparison. | Backend always returns 4 slices. |
| C8 | Unused fields: `riskScore`, `displayName`, `Portfolio.label`, `isIllustrative`, `dataType`, `maxDrawdownPeriod`, `questionnaire.version`. | None. | Keep them (cheap, useful later) or drop them by agreement. |
| C9 | `getUserProfile()` exists but no screen calls it. Reloading the page restarts the flow. | Returning users don't skip the quiz. | Out of scope for MVP. Later, call it on load and jump to the dashboard if `riskProfile` is set. |
| C10 | §7–§9 have no frontend types yet. | None until those UIs are built. | When agreed, add the types to `types/api.ts` and mocks to `src/mocks/`. |

