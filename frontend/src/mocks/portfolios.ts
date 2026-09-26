import type { AssetClass, Holding, Portfolio, RiskProfile } from '@/types/api'
import { allocationFor, MOCK_WEIGHTS } from './allocations'
import { mockPerformance } from './performance'

/** Illustrative index-fund placeholders; tickers are fictional on purpose. */
const HOLDING_META: Record<AssetClass, { ticker: string; name: string }> = {
  us_stocks: { ticker: 'USEQ', name: 'US Total Stock Market Index Fund' },
  intl_stocks: { ticker: 'INTL', name: 'International Stock Index Fund' },
  bonds: { ticker: 'BOND', name: 'Aggregate Bond Index Fund' },
  cash: { ticker: 'CASH', name: 'Money Market Fund' },
}

const PROFILE_COPY: Record<RiskProfile, { label: string; description: string }> = {
  conservative: {
    label: 'Conservative example portfolio',
    description: 'Mostly bonds and cash, with a smaller slice of stocks. Aims for stability over growth.',
  },
  moderate: {
    label: 'Moderate example portfolio',
    description: 'A mix of stocks for growth and bonds for stability.',
  },
  aggressive: {
    label: 'Aggressive example portfolio',
    description: 'Mostly stocks. Aims for higher long-term growth and accepts larger swings.',
  },
}

export function mockPortfolio(profile: RiskProfile): Portfolio {
  const performance = mockPerformance(profile, '5Y')
  const simulatedValue = performance.series[performance.series.length - 1].value
  const weights = MOCK_WEIGHTS[profile]

  const holdings: Holding[] = (Object.keys(weights) as AssetClass[])
    .filter((asset) => weights[asset] > 0)
    .map((asset) => ({
      ...HOLDING_META[asset],
      assetClass: asset,
      weight: weights[asset],
      value: Math.round(simulatedValue * weights[asset] * 100) / 100,
    }))

  return {
    riskProfile: profile,
    ...PROFILE_COPY[profile],
    isIllustrative: true,
    currency: 'USD',
    startingValue: performance.startingValue,
    simulatedValue,
    asOf: performance.series[performance.series.length - 1].date,
    allocation: allocationFor(profile),
    holdings,
  }
}

