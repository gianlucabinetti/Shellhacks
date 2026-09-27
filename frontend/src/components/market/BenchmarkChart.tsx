import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { cn } from '@/lib/utils'
import type { BenchmarkId, MarketInsights } from '@/types/market'
import { formatCompactCurrency, formatCurrency, formatSignedPercent } from '@/utils/format'

const OPTIONS: { id: BenchmarkId | null; label: string; stocks: boolean }[] = [
  { id: 'SPY', label: 'S&P 500', stocks: true },
  { id: '60_40', label: '60/40', stocks: true },
  { id: 'BTC', label: 'Bitcoin', stocks: false },
  { id: null, label: 'None', stocks: false },
]

interface Props {
  points: { date: string; value: number }[]
  baseline: number
  benchmark: MarketInsights['benchmark'] | undefined
  benchmarkLoading: boolean
  selected: BenchmarkId | null
  onSelect: (id: BenchmarkId | null) => void
  stocksConfigured: boolean
  totalReturn: number
}

const day = (date: string, year = false) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC',
})

/** Portfolio value (area) against an optional benchmark (dashed line) on one currency axis. */
export function BenchmarkChart({
  points, baseline, benchmark, benchmarkLoading, selected, onSelect, stocksConfigured, totalReturn,
}: Props) {
  const bench = benchmark?.available ? new Map(benchmark.performance.map(p => [p.date, p.value])) : undefined
  const data = points.map(p => ({ date: p.date, portfolio: p.value, benchmark: bench?.get(p.date) }))
  const showBench = Boolean(bench && selected)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Chart legend">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-[var(--series-portfolio)]" aria-hidden />
            <span className="text-muted-foreground">Your portfolio</span>
            <span className="font-market-data font-medium tabular-nums">{formatSignedPercent(totalReturn)}</span>
          </span>
          {showBench && benchmark?.total_return != null && (
            <span className="flex items-center gap-2">
              <span className="h-0 w-5 border-t-2 border-dashed border-[var(--series-benchmark)]" aria-hidden />
              <span className="text-muted-foreground">{benchmark.name}</span>
              <span className="font-market-data font-medium tabular-nums">{formatSignedPercent(benchmark.total_return)}</span>
            </span>
          )}
        </div>
        <div role="radiogroup" aria-label="Compare against" className="inline-flex rounded-sm border bg-background p-0.5">
          {OPTIONS.map(option => {
            const disabled = option.stocks && !stocksConfigured
            const active = selected === option.id
            return (
              <button
                key={option.label} type="button" role="radio" aria-checked={active} disabled={disabled}
                title={disabled ? 'Needs Alpaca stock credentials on the backend' : `Compare against ${option.label}`}
                onClick={() => onSelect(option.id)}
                className={cn(
                  'h-8 rounded-[3px] px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-[300px] w-full" role="img" aria-label={`Portfolio value from ${day(points[0].date, true)} to ${day(points[points.length - 1].date, true)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-portfolio)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--series-portfolio)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date" tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickFormatter={(d: string) => day(d)}
              interval="preserveStartEnd" minTickGap={40}
            />
            <YAxis
              width={60} tickLine={false} axisLine={false} domain={['auto', 'auto']}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickFormatter={(v: number) => formatCompactCurrency(v)}
            />
            <ReferenceLine y={baseline} stroke="var(--chart-axis)" strokeDasharray="2 4" />
            <Tooltip
              cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as (typeof data)[number] | undefined
                if (!active || !row) return null
                const rows = [{ label: 'Your portfolio', value: formatCurrency(row.portfolio, 'USD', 2), color: 'var(--series-portfolio)' }]
                if (showBench && row.benchmark != null) {
                  rows.push({ label: benchmark!.name, value: formatCurrency(row.benchmark, 'USD', 2), color: 'var(--series-benchmark)' })
                  rows.push({ label: 'Difference', value: formatCurrency(row.portfolio - row.benchmark, 'USD', 2), color: '' })
                }
                return <ChartTooltip title={day(row.date, true)} rows={rows.map(r => ({ ...r, color: r.color || undefined }))} />
              }}
            />
            <Area
              type="monotone" dataKey="portfolio" stroke="var(--series-portfolio)" strokeWidth={2}
              fill="url(#portfolio-fill)" isAnimationActive={false}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-portfolio)' }}
            />
            {showBench && (
              <Line
                type="monotone" dataKey="benchmark" stroke="var(--series-benchmark)" strokeWidth={2}
                strokeDasharray="6 4" dot={false} isAnimationActive={false} connectNulls
                activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-benchmark)' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selected && benchmarkLoading && <p className="text-xs text-muted-foreground">Loading benchmark prices…</p>}
      {selected && !benchmarkLoading && benchmark && !benchmark.available && (
        <p className="text-xs text-muted-foreground">{benchmark.name} is unavailable: {benchmark.message}</p>
      )}
    </div>
  )
}
