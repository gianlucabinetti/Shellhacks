import { motion } from 'motion/react'

import type { MarketInsights, MarketPosition } from '@/types/market'
import { formatCurrency, formatPercent, formatSignedPercent } from '@/utils/format'

const CLASS_LABEL = { crypto: 'Crypto', stock: 'Stock', bond: 'Bond' } as const

const signedMoney = (value: number) => `${value >= 0 ? '+' : '−'}${formatCurrency(Math.abs(value), 'USD', 2)}`

/** Each holding's dollar gain or loss as a bar diverging from zero, with its details alongside. */
export function ContributionBreakdown({ positions, contributions }: {
  positions: MarketPosition[]
  contributions: MarketInsights['contributions'] | undefined
}) {
  const byPosition = new Map(positions.map(p => [p.symbol, p]))
  const rows = contributions
    ? contributions.map(c => ({ ...byPosition.get(c.symbol)!, dollars: c.dollars }))
    : positions.map(p => ({ ...p, dollars: p.end_value - p.end_value / (1 + p.period_return) }))
  const scale = Math.max(...rows.map(r => Math.abs(r.dollars)), 1)
  const hasNegative = rows.some(r => r.dollars < 0)

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-white/[0.06]">
            <th className="py-2 pr-3 font-medium">Holding</th>
            <th className="px-3 py-2 text-right font-medium">Weight</th>
            <th className="px-3 py-2 text-right font-medium">Price change</th>
            <th className="w-[38%] px-3 py-2 font-medium">Gain / loss contribution</th>
            <th className="py-2 pl-3 text-right font-medium">Ending value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => (
            <tr key={r.symbol} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]">
              <td className="py-3 pr-3">
                <span className="block font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.symbol} · {CLASS_LABEL[r.asset_class]} · last close {formatCurrency(r.last_close, 'USD', r.last_close < 1 ? 4 : 2)} on {r.last_close_date}</span>
              </td>
              <td className="px-3 py-3 text-right font-market-data tabular-nums">{formatPercent(r.weight, 0)}</td>
              <td className="px-3 py-3 text-right font-market-data tabular-nums">{formatSignedPercent(r.period_return)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-2.5 flex-1" aria-hidden>
                    {hasNegative && <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[var(--chart-axis)]" />}
                    <motion.span
                      className="absolute inset-y-0 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(Math.abs(r.dollars) / scale) * (hasNegative ? 50 : 100)}%` }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.1 + index * 0.08 }}
                      style={{
                        background: r.dollars >= 0 ? 'var(--positive)' : 'var(--negative)',
                        ...(hasNegative
                          ? r.dollars >= 0 ? { left: '50%' } : { right: '50%' }
                          : { left: 0 }),
                      }}
                    />
                  </div>
                  <span className="w-24 text-right font-market-data text-xs tabular-nums">{signedMoney(r.dollars)}</span>
                </div>
              </td>
              <td className="py-3 pl-3 text-right font-market-data tabular-nums">{formatCurrency(r.end_value, 'USD', 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
