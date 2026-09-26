import type { Holding } from '@/types/api'
import { formatCurrency, formatPercent } from '@/utils/format'
import { ASSET_CLASS_COLORS } from '@/utils/riskProfiles'

export function HoldingsTable({ holdings, currency }: { holdings: Holding[]; currency: string }) {
  if (holdings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">This portfolio has no holdings.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">Fund</th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">Weight</th>
            <th scope="col" className="py-2 text-right font-medium">Simulated value</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.ticker} className="border-b last:border-0">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: ASSET_CLASS_COLORS[h.assetClass] }}
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.ticker} · illustrative</p>
                  </div>
                </div>
              </td>
              <td className="py-3 pr-4 text-right tabular-nums">{formatPercent(h.weight, 0)}</td>
              <td className="py-3 text-right tabular-nums">{formatCurrency(h.value, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

