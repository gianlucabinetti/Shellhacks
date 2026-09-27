import type { AssetClass, RiskProfile } from '@/types/api'

/** Presentation metadata only (names, ordering, colours). No scoring logic. */
export const RISK_PROFILES: RiskProfile[] = ['conservative', 'moderate', 'aggressive']

export const RISK_PROFILE_META: Record<
  RiskProfile,
  { name: string; tagline: string; level: 1 | 2 | 3; colorVar: string; textClass: string; bgClass: string }
> = {
  conservative: {
    name: 'Conservative',
    tagline: 'Stability first',
    level: 1,
    colorVar: 'var(--risk-conservative)',
    textClass: 'text-[var(--risk-conservative)]',
    bgClass: 'bg-emerald-950/30',
  },
  moderate: {
    name: 'Moderate',
    tagline: 'Balanced growth',
    level: 2,
    colorVar: 'var(--risk-moderate)',
    textClass: 'text-[var(--risk-moderate)]',
    bgClass: 'bg-sky-950/30',
  },
  aggressive: {
    name: 'Aggressive',
    tagline: 'Growth first',
    level: 3,
    colorVar: 'var(--risk-aggressive)',
    textClass: 'text-[var(--risk-aggressive)]',
    bgClass: 'bg-orange-950/30',
  },
}

/** Fixed colour per asset class, so a colour always means the same thing across charts. */
export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  us_stocks: 'var(--chart-1)',
  intl_stocks: 'var(--chart-2)',
  bonds: 'var(--chart-3)',
  cash: 'var(--chart-4)',
}

