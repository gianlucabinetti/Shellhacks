import type { AllocationSlice, AssetClass, RiskProfile } from '@/types/api'

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  us_stocks: 'US stocks',
  intl_stocks: 'International stocks',
  bonds: 'Bonds',
  cash: 'Cash',
}

/** Illustrative example allocations, not individualized recommendations. */
export const MOCK_WEIGHTS: Record<RiskProfile, Record<AssetClass, number>> = {
  conservative: { us_stocks: 0.2, intl_stocks: 0.1, bonds: 0.55, cash: 0.15 },
  moderate: { us_stocks: 0.4, intl_stocks: 0.2, bonds: 0.35, cash: 0.05 },
  aggressive: { us_stocks: 0.6, intl_stocks: 0.3, bonds: 0.1, cash: 0 },
}

export function allocationFor(profile: RiskProfile): AllocationSlice[] {
  return (Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((assetClass) => ({
    assetClass,
    label: ASSET_CLASS_LABELS[assetClass],
    weight: MOCK_WEIGHTS[profile][assetClass],
  }))
}

