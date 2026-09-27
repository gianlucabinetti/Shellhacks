import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { PerformancePoint } from '@/types/api'
import { formatCompactCurrency, formatCurrency, formatMonthYear } from '@/utils/format'
import { ChartTooltip } from './ChartTooltip'

interface PerformanceChartProps {
  points: PerformancePoint[]
  /** Dashed reference line, e.g. the starting investment. */
  baseline?: number
  color?: string
  currency?: string
  height?: number
  preciseDates?: boolean
}

/** Single-series value-over-time chart with a crosshair tooltip. */
export function PerformanceChart({
  points,
  baseline,
  color,
  currency = 'USD',
  height = 280,
  preciseDates = false,
}: PerformanceChartProps) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No performance history yet.</p>
  }

  const lineColor = color ?? (points[points.length - 1].value >= (baseline ?? points[0].value) ? 'var(--positive)' : 'var(--negative)')
  const gradientId = `perf-fill-${lineColor.replace(/[^a-z0-9]/gi, '')}`
  const showYearTicks = !preciseDates && points.length > 24
  const dateLabel = (date: string) => preciseDates
    ? new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : formatMonthYear(date)
  // One tick at the first data point of each calendar year.
  const yearTicks = showYearTicks
    ? points
        .filter((p, i) => i > 0 && p.date.slice(0, 4) !== points[i - 1].date.slice(0, 4))
        .map((p) => p.date)
    : undefined

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="date"
            ticks={yearTicks}
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickFormatter={(d: string) => (showYearTicks ? d.slice(0, 4) : dateLabel(d))}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
            domain={['auto', 'auto']}
          />
          {baseline !== undefined && (
            <ReferenceLine y={baseline} stroke="var(--chart-axis)" strokeDasharray="4 4" />
          )}
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as PerformancePoint | undefined
              if (!active || !point) return null
              return (
                <ChartTooltip
                  title={dateLabel(point.date)}
                  rows={[{ label: 'Value', value: formatCurrency(point.value, currency), color: lineColor }]}
                />
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

