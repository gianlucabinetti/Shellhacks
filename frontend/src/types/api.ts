/**
 * API response/request shapes.
 *
 * Documented in docs/api-contracts.md (v0.1 draft, not yet agreed with backend,
 * analytics or AI). Keep this file, src/mocks/ and that doc in sync; components only
 * depend on these types, not on where the data comes from.
 *
 * Conventions: camelCase fields, weights/returns as decimals (0.6 = 60%),
 * dates as ISO 8601 strings, money as plain numbers in `currency`.
 */

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'

export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced'

export type AssetClass = 'us_stocks' | 'intl_stocks' | 'bonds' | 'cash'

export type PerformanceRange = '1Y' | '5Y' | '10Y'

/** Error envelope returned by the backend for non-2xx responses. */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

// ---------- Questionnaire: GET /api/questionnaire ----------

/** Experience questions are kept separate from risk-tolerance questions. */
export type QuestionCategory = 'experience' | 'risk_tolerance'

export interface QuestionOption {
  id: string
  label: string
}

export interface Question {
  id: string
  category: QuestionCategory
  prompt: string
  helpText?: string
  options: QuestionOption[]
}

export interface Questionnaire {
  questionnaireId: string
  version: string
  questions: Question[]
}

// ---------- Risk assessment: POST /api/risk-assessment ----------

export interface QuestionAnswer {
  questionId: string
  optionId: string
}

export interface RiskAssessmentRequest {
  questionnaireId: string
  answers: QuestionAnswer[]
}

export interface RiskFactor {
  questionId: string
  label: string
  impact: 'lower_risk' | 'neutral' | 'higher_risk'
}

/** Scoring happens on the backend; the frontend only displays the result. */
export interface RiskAssessmentResult {
  assessmentId: string
  riskProfile: RiskProfile
  /** 0–100, higher means more tolerance for short-term losses. */
  riskScore: number
  experienceLevel: ExperienceLevel
  summary: string
  factors: RiskFactor[]
  disclaimer: string
}

// ---------- User profile: GET /api/user/profile, PUT /api/user/risk-profile ----------

export interface UserProfile {
  userId: string
  displayName: string
  riskProfile: RiskProfile | null
  experienceLevel: ExperienceLevel | null
  assessmentId: string | null
  updatedAt: string
}

export interface UpdateRiskProfileRequest {
  riskProfile: RiskProfile
  /** The user explicitly confirmed the risk-change warning. */
  acknowledged: true
}

// ---------- Portfolio: GET /api/portfolios/{riskProfile} ----------

export interface AllocationSlice {
  assetClass: AssetClass
  label: string
  weight: number
}

export interface Holding {
  ticker: string
  name: string
  assetClass: AssetClass
  weight: number
  value: number
}

export interface Portfolio {
  riskProfile: RiskProfile
  label: string
  description: string
  /** Always true: these are example portfolios, not individualized advice. */
  isIllustrative: true
  currency: string
  startingValue: number
  simulatedValue: number
  asOf: string
  allocation: AllocationSlice[]
  holdings: Holding[]
}

// ---------- Performance: GET /api/portfolios/{riskProfile}/performance?range= ----------

export interface PerformancePoint {
  date: string
  value: number
}

export interface PerformanceHistory {
  riskProfile: RiskProfile
  range: PerformanceRange
  /** Backtest of the example portfolio on historical market data. */
  dataType: 'historical_backtest'
  startingValue: number
  series: PerformancePoint[]
}

// ---------- Analytics: GET /api/portfolios/{riskProfile}/analytics ----------

export interface PortfolioAnalytics {
  riskProfile: RiskProfile
  periodStart: string
  periodEnd: string
  annualizedReturn: number
  annualizedVolatility: number
  /** Negative decimal, e.g. -0.21 = worst peak-to-trough fall of 21%. */
  maxDrawdown: number
  maxDrawdownPeriod: {
    start: string
    end: string
  }
}

