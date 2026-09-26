import type { AssetClass, PerformanceHistory, PerformanceRange, RiskProfile } from '@/types/api'
import { MOCK_WEIGHTS } from './allocations'

/**
 * Synthetic but deterministic monthly market history (Sep 2016 to Aug 2026), used only
 * to produce realistic-looking mock responses. The real series will come from the
 * analytics service. Includes stylised 2020 and 2022 drawdowns.
 */

const MONTHS = 120
const START_VALUE = 10_000
const RANGE_MONTHS: Record<PerformanceRange, number> = { '1Y': 12, '5Y': 60, '10Y': 120 }

/** Month-specific shocks added to the random returns: [stocks, bonds]. */
const SHOCKS: Record<string, [number, number]> = {
  '2018-10': [-0.07, 0],
  '2018-12': [-0.08, 0.01],
  '2020-02': [-0.08, 0.01],
  '2020-03': [-0.13, -0.01],
  '2020-04': [0.11, 0.01],
  '2022-01': [-0.05, -0.02],
  '2022-04': [-0.08, -0.03],
  '2022-06': [-0.07, -0.02],
  '2022-09': [-0.08, -0.04],
  '2022-11': [0.05, 0.03],
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function monthEnd(index: number): string {
  // index 0 = 2016-08-31 (starting point), index 120 = 2026-08-31
  const d = new Date(Date.UTC(2016, 8 + index, 0))
  return d.toISOString().slice(0, 10)
}

function buildAssetReturns(): Record<AssetClass, number[]> {
  const rand = mulberry32(99)
  const normal = () => {
    const u = Math.max(rand(), 1e-9)
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
  }
  const out: Record<AssetClass, number[]> = { us_stocks: [], intl_stocks: [], bonds: [], cash: [] }
  for (let i = 1; i <= MONTHS; i++) {
    const [stockShock, bondShock] = SHOCKS[monthEnd(i).slice(0, 7)] ?? [0, 0]
    const zUs = normal()
    const zIntl = 0.8 * zUs + 0.6 * normal()
    out.us_stocks.push(0.011 + 0.035 * zUs + stockShock)
    out.intl_stocks.push(0.008 + 0.038 * zIntl + stockShock * 1.1)
    out.bonds.push(0.0025 + 0.009 * normal() + bondShock)
    out.cash.push(0.0015)
  }
  return out
}

const ASSET_RETURNS = buildAssetReturns()

/** Full 10-year value path for a monthly-rebalanced example portfolio. */
function fullSeries(profile: RiskProfile): number[] {
  const weights = MOCK_WEIGHTS[profile]
  const values = [START_VALUE]
  for (let i = 0; i < MONTHS; i++) {
    let r = 0
    for (const asset of Object.keys(weights) as AssetClass[]) {
      r += weights[asset] * ASSET_RETURNS[asset][i]
    }
    values.push(values[i] * (1 + r))
  }
  return values
}

export function mockPerformance(profile: RiskProfile, range: PerformanceRange): PerformanceHistory {
  const values = fullSeries(profile)
  const startIndex = MONTHS - RANGE_MONTHS[range]
  const base = values[startIndex]
  return {
    riskProfile: profile,
    range,
    dataType: 'historical_backtest',
    startingValue: START_VALUE,
    series: values.slice(startIndex).map((v, i) => ({
      date: monthEnd(startIndex + i),
      value: Math.round((v / base) * START_VALUE * 100) / 100,
    })),
  }
}

