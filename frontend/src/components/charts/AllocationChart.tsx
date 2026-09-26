import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { AllocationSlice } from '@/types/api'
import { formatPercent } from '@/utils/format'
import { ASSET_CLASS_COLORS } from '@/utils/riskProfiles'
import { ChartTooltip } from './ChartTooltip'

interface AllocationChartProps {
  allocation: AllocationSlice[]
  /** Text shown in the donut hole, e.g. "60% stocks". */
  centerLabel?: string
  centerSubLabel?: string
}

/** Donut + legend table. The legend doubles as the accessible table view. */
export function AllocationChart({ allocation, centerLabel, centerSubLabel }: AllocationChartProps) {
  const slices = allocation.filter((s) => s.weight > 0)

  if (slices.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No allocation data yet.</p>
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative aspect-square w-full max-w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="weight"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={0}
              stroke="var(--card)"
              strokeWidth={2}
              cornerRadius={4}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.assetClass} fill={ASSET_CLASS_COLORS[s.assetClass]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const slice = payload?.[0]?.payload as AllocationSlice | undefined
                if (!active || !slice) return null
                return (
                  <ChartTooltip
                    rows={[
                      {
                        label: slice.label,
                        value: formatPercent(slice.weight, 0),
                        color: ASSET_CLASS_COLORS[slice.assetClass],
                      },
                    ]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-semibold">{centerLabel}</span>
            {centerSubLabel && <span className="text-xs text-muted-foreground">{centerSubLabel}</span>}
          </div>
        )}
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Asset allocation</caption>
        <tbody>
          {allocation.map((s) => (
            <tr key={s.assetClass} className="border-b last:border-0">
              <th scope="row" className="py-2 text-left font-normal">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: ASSET_CLASS_COLORS[s.assetClass] }}
                    aria-hidden
                  />
                  {s.label}
                </span>
              </th>
              <td className="py-2 text-right font-medium tabular-nums">{formatPercent(s.weight, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

