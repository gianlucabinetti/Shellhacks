import { request } from './http'
import type {
  BenchmarkId, ChatMessage, ChatResponse, MarketCatalog, MarketExplanation, MarketInsights, MarketPortfolio, MarketRequest, MarketTicker,
} from '@/types/market'

// These functions always call the backend, independent of the legacy mock demo.
export const getMarketAssets = () => request<MarketCatalog>('/api/market/assets')
export const getMarketPortfolio = (body: MarketRequest) =>
  request<MarketPortfolio>('/api/market/portfolio', { method: 'POST', body: JSON.stringify(body) })
export const explainMarketPortfolio = (body: MarketRequest) =>
  request<MarketExplanation>('/api/market/explain', { method: 'POST', body: JSON.stringify(body) })
export const getMarketInsights = (portfolio: MarketRequest, benchmark: BenchmarkId | null) =>
  request<MarketInsights>('/api/market/insights', { method: 'POST', body: JSON.stringify({ portfolio, benchmark }) })
export const askPortfolioChat = (portfolio: MarketRequest, benchmark: BenchmarkId | null, messages: ChatMessage[]) =>
  request<ChatResponse>('/api/market/chat', { method: 'POST', body: JSON.stringify({ portfolio, benchmark, messages }) })
export const getMarketTicker = () => request<MarketTicker>('/api/market/ticker')
