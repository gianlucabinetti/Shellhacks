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
        <div key={m.key} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{m.label}</dt>
          {proposed ? (
            <dd className="flex flex-col gap-0.5 tabular-nums">
              <span className="text-2xl font-semibold">{m.format(proposed[m.key])}</span>
              <span className="text-xs text-muted-foreground">
                was {m.format(analytics[m.key])} with {currentLabel}
              </span>
            </dd>
          ) : (
            <dd className="text-2xl font-semibold tabular-nums">{m.format(analytics[m.key])}</dd>
          )}
          {!compact && <dd className="text-xs text-muted-foreground">{m.explain}</dd>}
        </div>
      ))}
    </dl>
  )
}

