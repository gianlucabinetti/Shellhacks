import { useEffect, useMemo, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'motion/react'
import { Play, Square } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { Button } from '@/components/ui/button'
import type { BenchmarkId, MarketInsights } from '@/types/market'
import { formatCompactCurrency, formatCurrency, formatSignedPercent } from '@/utils/format'
import { Segmented } from './motion'

const REPLAY_MS = 6000

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

/** Portfolio value (area) against an optional benchmark (dashed line) on one currency axis, with a replay. */
export function BenchmarkChart({
  points, baseline, benchmark, benchmarkLoading, selected, onSelect, stocksConfigured, totalReturn,
}: Props) {
  const bench = useMemo(
    () => benchmark?.available ? new Map(benchmark.performance.map(p => [p.date, p.value])) : undefined,
    [benchmark],
  )
  const showBench = Boolean(bench && selected)
  const full = useMemo(() => points.map(p => ({ date: p.date, portfolio: p.value, benchmark: bench?.get(p.date) })), [points, bench])
  // Fixed y-range so the axis does not jump while replaying.
  const domain = useMemo(() => {
    const values = full.flatMap(d => showBench && d.benchmark != null ? [d.portfolio, d.benchmark] : [d.portfolio]).concat(baseline)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.08 || max * 0.02
    return [min - pad, max + pad]
  }, [full, showBench, baseline])

  const [playhead, setPlayhead] = useState<number | null>(null)
  // After a replay the full line is already drawn; re-running the entry animation would flicker.
  const [replayed, setReplayed] = useState(false)
  const frame = useRef<number>(undefined)
  const settle = useRef<number>(undefined)
  const cancel = () => {
    if (frame.current) cancelAnimationFrame(frame.current)
    window.clearTimeout(settle.current)
  }
  const replay = () => {
    cancel()
    if (playhead !== null) return setPlayhead(null)
    setReplayed(true)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / REPLAY_MS)
      // Ease-in-out so the story starts and lands gently.
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      setPlayhead(Math.round(eased * (full.length - 1)))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else settle.current = window.setTimeout(() => setPlayhead(null), 1400)
    }
    frame.current = requestAnimationFrame(tick)
  }
  useEffect(() => cancel, [])

  const data = playhead === null ? full : full.map((d, i) => i <= playhead ? d : { ...d, portfolio: null, benchmark: undefined })
  const head = playhead === null ? undefined : full[playhead]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Chart legend">
          <span className="flex items-center gap-2">
            <span className="h-[3px] w-5 rounded-full bg-[var(--series-portfolio)]" aria-hidden />
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
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<BenchmarkId | null>
            id="benchmark" label="Compare against" size="sm" value={selected} onChange={onSelect}
            options={[
              { value: 'SPY', label: 'S&P 500', disabled: !stocksConfigured, title: stocksConfigured ? undefined : 'Needs Alpaca stock keys on the backend' },
              { value: '60_40', label: '60/40', disabled: !stocksConfigured, title: stocksConfigured ? undefined : 'Needs Alpaca stock keys on the backend' },
              { value: 'BTC', label: 'Bitcoin' },
              { value: null, label: 'None' },
            ]}
          />
          <Button size="sm" variant="outline" onClick={replay} aria-pressed={playhead !== null}>
            {playhead !== null ? <><Square className="size-3.5" /> Stop</> : <><Play className="size-3.5" /> Replay</>}
          </Button>
        </div>
      </div>

      <div className="relative h-[320px] w-full" role="img"
        aria-label={`Portfolio value from ${day(points[0].date, true)} to ${day(points[points.length - 1].date, true)}`}>
        <AnimatePresence>
          {head && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="glass pointer-events-none absolute top-2 left-16 z-10 rounded-xl border border-white/10 px-4 py-2.5"
              aria-live="off"
            >
              <p className="font-market-data text-[0.68rem] uppercase tracking-wide text-muted-foreground">{day(head.date, true)}</p>
              <NumberFlow value={head.portfolio} locales="en-US" format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
                className="font-market-data text-2xl font-semibold" />
              {showBench && head.benchmark != null && (
                <p className="font-market-data text-xs text-[var(--series-benchmark)]">
                  {benchmark!.name}: {formatCurrency(head.benchmark)}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolio-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series-portfolio)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--series-portfolio)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date" tickLine={false} axisLine={false}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickFormatter={(d: string) => day(d)}
              interval="preserveStartEnd" minTickGap={48}
            />
            <YAxis
              width={60} tickLine={false} axisLine={false} domain={domain} allowDataOverflow
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }} tickFormatter={(v: number) => formatCompactCurrency(v)}
            />
            <ReferenceLine y={baseline} stroke="var(--chart-axis)" strokeDasharray="2 4" strokeOpacity={0.6} />
            {playhead === null && (
              <Tooltip
                cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof full)[number] | undefined
                  if (!active || !row) return null
                  const rows = [{ label: 'Your portfolio', value: formatCurrency(row.portfolio, 'USD', 2), color: 'var(--series-portfolio)' as string | undefined }]
                  if (showBench && row.benchmark != null) {
                    rows.push({ label: benchmark!.name, value: formatCurrency(row.benchmark, 'USD', 2), color: 'var(--series-benchmark)' })
                    rows.push({ label: 'Difference', value: formatCurrency(row.portfolio - row.benchmark, 'USD', 2), color: undefined })
                  }
                  return <ChartTooltip title={day(row.date, true)} rows={rows} />
                }}
              />
            )}
            <Area
              type="monotone" dataKey="portfolio" stroke="var(--series-portfolio)" strokeWidth={2.25}
              fill="url(#portfolio-fill)" isAnimationActive={!replayed} animationDuration={1100} animationEasing="ease-out"
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-portfolio)' }}
            />
            {showBench && (
              <Line
                type="monotone" dataKey="benchmark" stroke="var(--series-benchmark)" strokeWidth={2}
                strokeDasharray="6 4" dot={false} isAnimationActive={!replayed} animationDuration={1100}
                activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2, fill: 'var(--series-benchmark)' }}
              />
            )}
            {head && <ReferenceDot x={head.date} y={head.portfolio} r={6} fill="var(--series-portfolio)" stroke="#fff" strokeWidth={2} />}
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
