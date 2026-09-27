import type { PortfolioAnalytics } from '@/types/api'
import { formatPercent, formatSignedPercent } from '@/utils/format'

interface MetricDef {
  key: 'annualizedReturn' | 'annualizedVolatility' | 'maxDrawdown'
  label: string
  explain: string
  format: (v: number) => string
}

const METRICS: MetricDef[] = [
  {
    key: 'annualizedReturn',
    label: 'Average yearly return',
    explain: 'How much the portfolio grew per year, on average, over the period.',
    format: (v) => formatSignedPercent(v),
  },
  {
    key: 'annualizedVolatility',
    label: 'Volatility',
    explain: 'How much the value bounced around. Higher means a bumpier ride.',
    format: (v) => formatPercent(v),
  },
  {
    key: 'maxDrawdown',
    label: 'Biggest drop',
    explain: 'The largest fall from a high point to a low point before recovering.',
    format: (v) => formatSignedPercent(v),
  },
]

interface RiskMetricsProps {
  analytics: PortfolioAnalytics
  /** When provided, shows the proposed value with the current one underneath. */
  proposed?: PortfolioAnalytics
  /** Name of the current profile, used in comparison mode ("was 9.4% with Moderate"). */
  currentLabel?: string
  compact?: boolean
}

export function RiskMetrics({
  analytics,
  proposed,
  currentLabel = 'current',
  compact = false,
}: RiskMetricsProps) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {METRICS.map((m) => (
        <div key={m.key} className="flex flex-col gap-2 border-t border-white/15 py-4 first:border-t-0 sm:border-t-0 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
          <dt className="eyebrow">{m.label}</dt>
          {proposed ? (
            <dd className="flex flex-col gap-0.5 tabular-nums">
              <span className={`font-market-data text-2xl font-medium ${m.key === 'annualizedReturn' ? 'text-[var(--positive)]' : m.key === 'maxDrawdown' ? 'text-[var(--negative)]' : ''}`}>{m.format(proposed[m.key])}</span>
              <span className="text-xs text-muted-foreground">
                was {m.format(analytics[m.key])} with {currentLabel}
              </span>
            </dd>
          ) : (
            <dd className={`font-market-data text-2xl font-medium tabular-nums ${m.key === 'annualizedReturn' ? 'text-[var(--positive)]' : m.key === 'maxDrawdown' ? 'text-[var(--negative)]' : ''}`}>{m.format(analytics[m.key])}</dd>
          )}
          {!compact && <dd className="text-xs text-muted-foreground">{m.explain}</dd>}
        </div>
      ))}
    </dl>
  )
}

