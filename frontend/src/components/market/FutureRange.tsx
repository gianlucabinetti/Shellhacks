import { useState } from 'react'
import { Info } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { ErrorState } from '@/components/common/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getProjection } from '@/services/market'
import type { MarketPortfolio, ProjectionYears } from '@/types/market'
import { formatCompactCurrency, formatCurrency } from '@/utils/format'
import { CountUp, Segmented } from './motion'

const RETURNS = [0, 0.04, 0.07]
const monthLabel = (m: number) => m === 0 ? 'Now' : m % 12 === 0 ? `${m / 12}y` : `${m}mo`

/** Fan chart: where this mix's real volatility could take today's amount, under an assumed average return. */
export function FutureRange({ portfolio }: { portfolio: MarketPortfolio }) {
  const [years, setYears] = useState<ProjectionYears>(5)
  const [assumed, setAssumed] = useState(0.04)
  const projection = useAsync(() => getProjection(portfolio.request, years, assumed), [portfolio.data_id, years, assumed])
  const p = projection.data?.data_id === portfolio.data_id ? projection.data : undefined
  const start = portfolio.request.initial_investment

  const data = p?.points.map(pt => ({ month: pt.month, band90: [pt.p5, pt.p95], band50: [pt.p25, pt.p75], p50: pt.p50, raw: pt }))
  const end = p?.points[p.points.length - 1]
  const step = years === 1 ? 3 : 12
  const ticks = data?.filter(d => d.month % step === 0).map(d => d.month)
  const money = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Time horizon</span>
          <Segmented<ProjectionYears> id="years" label="Time horizon" size="sm" value={years} onChange={setYears}
            options={[1, 3, 5, 10].map(y => ({ value: y as ProjectionYears, label: `${y}Y` }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground" id="assumed-label">Your assumed average return / year</span>
          <Segmented<number> id="assumed" label="Assumed average yearly return" size="sm" value={assumed} onChange={setAssumed}
            options={RETURNS.map(r => ({ value: r, label: `${Math.round(r * 100)}%` }))} />
        </div>
      </div>

      {projection.error && !p && <ErrorState title="Could not calculate the range" error={projection.error} onRetry={projection.retry} className="rounded-2xl" />}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Typical outcome', hint: 'Half of outcomes land above, half below', value: end?.p50 },
          { label: 'Rough ride (1 in 20)', hint: '5% of outcomes end lower than this', value: end?.p5 },
          { label: 'Lucky run (1 in 20)', hint: '5% of outcomes end higher than this', value: end?.p95 },
          { label: `Chance of ending below ${formatCurrency(start)}`, hint: `After ${years} year${years > 1 ? 's' : ''}`, value: p?.probability_below_start, percent: true },
        ].map(t => (
          <div key={t.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <dt className="text-xs text-muted-foreground">{t.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
              {t.value == null ? <Skeleton className="h-7 w-24" />
                : <CountUp value={t.value} from={t.percent ? 0 : start} format={t.percent ? { style: 'percent', maximumFractionDigits: 0 } : money} />}
            </dd>
            <dd className="mt-0.5 text-[0.7rem] text-muted-foreground">{t.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="h-[300px] w-full" role="img"
        aria-label={end ? `Range of outcomes after ${years} years: typical ${formatCurrency(end.p50)}, 90% between ${formatCurrency(end.p5)} and ${formatCurrency(end.p95)}` : 'Loading range of outcomes'}>
        {data ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" ticks={ticks} tickFormatter={monthLabel} tickLine={false} axisLine={false}
                tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} />
              <YAxis width={60} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
                tickFormatter={(v: number) => formatCompactCurrency(v)} />
              <ReferenceLine y={start} stroke="var(--chart-axis)" strokeDasharray="2 4" strokeOpacity={0.7}
                label={{ value: 'Starting amount', position: 'insideBottomRight', fill: 'var(--chart-axis)', fontSize: 11 }} />
              <Tooltip
                cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof data)[number] | undefined
                  if (!active || !row) return null
                  const r = row.raw
                  return <ChartTooltip title={row.month === 0 ? 'Now' : `After ${monthLabel(row.month)}`} rows={[
                    { label: 'Lucky run (95th)', value: formatCurrency(r.p95) },
                    { label: 'Upper middle (75th)', value: formatCurrency(r.p75) },
                    { label: 'Typical (median)', value: formatCurrency(r.p50), color: 'var(--series-portfolio)' },
                    { label: 'Lower middle (25th)', value: formatCurrency(r.p25) },
                    { label: 'Rough ride (5th)', value: formatCurrency(r.p5) },
                  ]} />
                }}
              />
              <Area type="monotone" dataKey="band90" stroke="none" fill="var(--series-portfolio)" fillOpacity={0.14} animationDuration={700} />
              <Area type="monotone" dataKey="band50" stroke="none" fill="var(--series-portfolio)" fillOpacity={0.3} animationDuration={700} />
              <Line type="monotone" dataKey="p50" stroke="var(--series-portfolio)" strokeWidth={2.25} dot={false} animationDuration={700}
                activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-portfolio)' }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <Skeleton className="size-full rounded-2xl" />}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Chart legend">
        <span className="flex items-center gap-2"><span className="h-[3px] w-5 rounded-full bg-[var(--series-portfolio)]" aria-hidden />Typical outcome</span>
        <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-[var(--series-portfolio)]/30" aria-hidden />Middle 50% of outcomes</span>
        <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-[var(--series-portfolio)]/15" aria-hidden />90% of outcomes</span>
      </div>

      <p className="flex gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <strong className="text-foreground">Not a forecast.</strong> This uses the mix's real volatility
          ({p ? `${(p.annual_volatility * 100).toFixed(1)}%` : '…'} a year, measured on actual prices) and <em>your</em> assumed
          average return to show how wide the range of outcomes gets. Higher volatility pulls the typical outcome down even when the
          average return is the same.{p && p.volatility_window_days < 365 ? ' Volatility from a short look-back is a rough estimate; try 1Y.' : ''}
        </span>
      </p>
    </div>
  )
}
