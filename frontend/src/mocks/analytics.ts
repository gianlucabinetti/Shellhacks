import type { PortfolioAnalytics, RiskProfile } from '@/types/api'
import { mockPerformance } from './performance'

/**
 * Stands in for the analytics service: derives metrics from the same mock 5-year
 * series the chart shows, so numbers and chart agree. Not used in production mode.
 */
export function mockAnalytics(profile: RiskProfile): PortfolioAnalytics {
  const { series } = mockPerformance(profile, '5Y')
  const values = series.map((p) => p.value)

  const monthly = values.slice(1).map((v, i) => v / values[i] - 1)
  const mean = monthly.reduce((s, r) => s + r, 0) / monthly.length
  const variance = monthly.reduce((s, r) => s + (r - mean) ** 2, 0) / (monthly.length - 1)

  let peakIndex = 0
  let maxDrawdown = 0
  let ddStart = 0
  let ddEnd = 0
  values.forEach((v, i) => {
    if (v > values[peakIndex]) peakIndex = i
    const dd = v / values[peakIndex] - 1
    if (dd < maxDrawdown) {
      maxDrawdown = dd
      ddStart = peakIndex
      ddEnd = i
    }
  })

  const round = (n: number) => Math.round(n * 10_000) / 10_000
  return {
    riskProfile: profile,
    periodStart: series[0].date,
    periodEnd: series[series.length - 1].date,
    annualizedReturn: round((values[values.length - 1] / values[0]) ** (12 / monthly.length) - 1),
    annualizedVolatility: round(Math.sqrt(variance) * Math.sqrt(12)),
    maxDrawdown: round(maxDrawdown),
    maxDrawdownPeriod: { start: series[ddStart].date, end: series[ddEnd].date },
  }
}

