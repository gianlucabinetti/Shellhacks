export interface MarketAsset {
  symbol: string
  name: string
  asset_class: 'crypto' | 'stock' | 'bond'
  category: string
}
export interface MarketCatalog {
  assets: MarketAsset[]
  stocks_configured: boolean
  crypto_requires_keys: boolean
}
export interface MarketRequest {
  holdings: { symbol: string; weight: number }[]
  initial_investment: number
  days: 30 | 90 | 365
}
export interface MarketPosition extends MarketAsset {
  weight: number
  start_price: number
  last_close: number
  last_close_date: string
  units: number
  end_value: number
  period_return: number
}
export interface MarketPortfolio {
  request: MarketRequest
  data_id: string
  provider: string
  feeds: string[]
  prices_source: string
  holdings_source: string
  is_simulated: boolean
  start_date: string
  end_date: string
  fetched_at: string
  cached: boolean
  initial_value: number
  final_value: number
  total_return: number
  annualized_return: number | null
  annualized_volatility: number
  max_drawdown: number
  positions: MarketPosition[]
  performance: { date: string; value: number }[]
  notes: string[]
}
export interface MarketExplanation {
  data_id: string
  source: 'bedrock' | 'fallback'
  explanation: {
    summary: string
    allocation_explanation: string
    risk_explanation: string
    beginner_tip: string
    disclaimer: string
  }
}

export type BenchmarkId = 'SPY' | '60_40' | 'BTC'
export interface CorrelationPair { a: string; b: string; correlation: number }
export interface ExposureSlice {
  id: string
  label: string
  /** Share of the portfolio's ending value. */
  weight: number
  value: number
  holdings: { symbol: string; value: number }[]
  /** Sectors only: this sector's share if the money in companies followed the reference market. */
  market_weight: number | null
}
export interface MarketExposure {
  by_type: ExposureSlice[]
  by_sector: ExposureSlice[]
  outside_companies: ExposureSlice[]
  company_weight: number
  reference_name: string
  as_of: string | null
  source: string
  message: string
}
export interface MarketInsights {
  data_id: string
  correlation: { symbols: string[]; matrix: (number | null)[][]; observations: number }
  diversification: {
    score: number
    label: string
    effective_bets: number
    diversification_ratio: number
    average_correlation: number | null
    observations: number
    most_correlated: CorrelationPair | null
    least_correlated: CorrelationPair | null
    message: string
  }
  contributions: { symbol: string; dollars: number; portfolio_return: number }[]
  benchmark: {
    id: BenchmarkId
    name: string
    available: boolean
    message: string | null
    performance: { date: string; value: number }[]
    total_return: number | null
    annualized_volatility: number | null
    max_drawdown: number | null
    excess_return: number | null
  } | null
  exposure?: MarketExposure | null
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface WhatIfResult {
  holdings: { symbol: string; weight: number }[]
  total_return: number
  annualized_volatility: number
  max_drawdown: number
  final_value: number
  diversification_score: number
}
export interface ChatResponse {
  data_id: string
  source: 'bedrock' | 'fallback'
  reply: string
  what_ifs: WhatIfResult[]
  suggestions: string[]
}
export interface TickerQuote {
  symbol: string
  name: string
  asset_class: 'crypto' | 'stock' | 'bond'
  price: number
  change: number
  as_of: string
  live: boolean
  spark: number[]
}
export interface MarketTicker { quotes: TickerQuote[]; fetched_at: string; stocks_included: boolean }
export type ProjectionYears = 1 | 3 | 5 | 10
export interface Projection {
  data_id: string
  start_value: number
  annual_volatility: number
  annual_return: number
  years: number
  volatility_window_days: number
  probability_below_start: number
  points: { month: number; p5: number; p25: number; p50: number; p75: number; p95: number }[]
  notes: string[]
}
export interface BuildResponse {
  source: 'bedrock' | 'fallback'
  name: string
  summary: string
  holdings: { symbol: string; weight: number; reason: string }[]
  result: WhatIfResult
  tested: WhatIfResult[]
}
