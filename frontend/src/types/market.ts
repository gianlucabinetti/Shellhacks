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
