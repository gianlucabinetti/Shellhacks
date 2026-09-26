import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { AllocationSlice } from '@/types/api'
import { formatPercent, formatSignedPercent } from '@/utils/format'
import { ASSET_CLASS_COLORS } from '@/utils/riskProfiles'

interface AllocationComparisonChartProps {
  current: AllocationSlice[]
  proposed: AllocationSlice[]
  currentLabel: string
  proposedLabel: string
}

/**
 * Two stacked 100% bars (before / after) plus a per-asset change list.
 * Same colour per asset class in both bars, so the eye tracks each slice.
 */
export function AllocationComparisonChart({
  current,
  proposed,
  currentLabel,
  proposedLabel,
}: AllocationComparisonChartProps) {
  const proposedByClass = new Map(proposed.map((s) => [s.assetClass, s.weight]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <StackedBar label={currentLabel} slices={current} />
        <StackedBar label={proposedLabel} slices={proposed} />
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {current.map((s) => {
          const next = proposedByClass.get(s.assetClass) ?? 0
          const delta = next - s.weight
          return (
            <li key={s.assetClass} className="flex items-center justify-between gap-2 py-1">
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: ASSET_CLASS_COLORS[s.assetClass] }}
                  aria-hidden
                />
                {s.label}
              </span>
              <span className="flex items-center gap-1.5 tabular-nums">
                <span className="text-muted-foreground">{formatPercent(s.weight, 0)}</span>
                <ArrowRight className="size-3 text-muted-foreground" aria-label="to" />
                <span className="font-medium">{formatPercent(next, 0)}</span>
                <span
                  className={cn(
                    'w-14 text-right text-xs',
                    delta === 0 ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  ({delta === 0 ? 'same' : formatSignedPercent(delta, 0)})
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function StackedBar({ label, slices }: { label: string; slices: AllocationSlice[] }) {
  const visible = slices.filter((s) => s.weight > 0)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div
        className="flex h-6 w-full gap-0.5"
        role="img"
        aria-label={`${label}: ${visible.map((s) => `${s.label} ${formatPercent(s.weight, 0)}`).join(', ')}`}
      >
        {visible.map((s) => (
          <div
            key={s.assetClass}
            className="rounded-sm first:rounded-l-md last:rounded-r-md"
            style={{ flexGrow: s.weight, flexBasis: 0, backgroundColor: ASSET_CLASS_COLORS[s.assetClass] }}
            title={`${s.label}: ${formatPercent(s.weight, 0)}`}
          />
        ))}
      </div>
    </div>
  )
}

