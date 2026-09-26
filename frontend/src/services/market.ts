import { request } from './http'
import type { MarketCatalog, MarketExplanation, MarketPortfolio, MarketRequest } from '@/types/market'

// These functions always call the backend, independent of the legacy mock demo.
export const getMarketAssets = () => request<MarketCatalog>('/api/market/assets')
export const getMarketPortfolio = (body: MarketRequest) =>
  request<MarketPortfolio>('/api/market/portfolio', { method: 'POST', body: JSON.stringify(body) })
export const explainMarketPortfolio = (body: MarketRequest) =>
  request<MarketExplanation>('/api/market/explain', { method: 'POST', body: JSON.stringify(body) })
