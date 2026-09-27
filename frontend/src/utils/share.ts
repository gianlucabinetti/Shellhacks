/** Encodes a portfolio in the page URL so a link or QR code reopens exactly the same analysis. */
import type { BenchmarkId, MarketRequest } from '@/types/market'

export interface SharedPortfolio {
  weights: Record<string, number>
  investment: number
  days: MarketRequest['days']
  benchmark: BenchmarkId | null | undefined
}

const DAYS = [30, 90, 365] as const
const BENCHMARKS = ['SPY', '60_40', 'BTC'] as const

/** ?mix=BTC-USD:50,ETH-USD:30&amt=10000&d=90&vs=SPY — "/" becomes "-" so links stay readable. */
export function shareUrl(request: MarketRequest, benchmark: BenchmarkId | null, origin = window.location.origin) {
  const params = new URLSearchParams({
    mix: request.holdings.map(h => `${h.symbol.replace('/', '-')}:${+(h.weight * 100).toFixed(2)}`).join(','),
    amt: String(request.initial_investment),
    d: String(request.days),
    vs: benchmark ?? 'none',
  })
  return `${origin}${window.location.pathname}?${params.toString().replace(/%2C/g, ',').replace(/%3A/g, ':')}`
}

/** Reads a shared portfolio from the current URL, or undefined if absent or malformed. */
export function readSharedPortfolio(search = window.location.search): SharedPortfolio | undefined {
  const params = new URLSearchParams(search)
  const mix = params.get('mix')
  if (!mix) return undefined
  const weights: Record<string, number> = {}
  for (const part of mix.split(',').slice(0, 12)) {
    const [symbol, raw] = part.split(':')
    const weight = Number(raw)
    if (!symbol || !/^[A-Z0-9-]{1,24}$/i.test(symbol) || !(weight > 0 && weight <= 100)) return undefined
    weights[symbol.toUpperCase().replace('-', '/')] = weight
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (!Object.keys(weights).length || Math.abs(total - 100) > 0.5) return undefined
  // Links carry 2-decimal weights; rescale so they total exactly 100 again.
  const keys = Object.keys(weights)
  for (const k of keys) weights[k] = Math.round((weights[k] / total) * 10000) / 100
  weights[keys[keys.length - 1]] = Math.round((100 - keys.slice(0, -1).reduce((s, k) => s + weights[k], 0)) * 100) / 100
  const investment = Number(params.get('amt') ?? 10000)
  const days = Number(params.get('d') ?? 90) as MarketRequest['days']
  const vs = params.get('vs')
  return {
    weights,
    investment: investment > 0 && investment <= 1_000_000 ? investment : 10000,
    days: DAYS.includes(days) ? days : 90,
    benchmark: vs === 'none' ? null : (BENCHMARKS as readonly string[]).includes(vs ?? '') ? (vs as BenchmarkId) : undefined,
  }
}

/** Keeps the address bar in sync with the analyzed portfolio without adding history entries. */
export function syncShareUrl(request: MarketRequest, benchmark: BenchmarkId | null) {
  const url = shareUrl(request, benchmark)
  if (url !== window.location.href) window.history.replaceState(null, '', url)
}

export const isLocalOnly = () => ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
