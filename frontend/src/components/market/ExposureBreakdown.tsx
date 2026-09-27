import { useState } from 'react'
import { motion } from 'motion/react'
import { MessageCircleQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ExposureSlice, MarketExposure } from '@/types/market'
import { formatCurrency, formatMonthYear, formatPercent } from '@/utils/format'
import { Segmented } from './motion'

type View = 'sector' | 'type'

const HINTS: Record<string, string> = {
  stock_fund: 'Many companies in one fund',
  stock: 'One company each',
  bond: 'Loans to governments and companies',
  metal: 'Precious-metal funds',
  crypto: 'Digital currencies',
  Technology: 'Software, chips, hardware',
  Financials: 'Banks, insurers, payments',
  'Health care': 'Drugmakers, hospitals, medical devices',
  'Consumer discretionary': 'Shopping, cars, travel',
  Industrials: 'Machinery, transport, defense',
  'Communication services': 'Search, social media, telecom',
  'Consumer staples': 'Food, household essentials',
  Energy: 'Oil and gas',
  'Real estate': 'Property owners',
  Utilities: 'Power and water networks',
  Materials: 'Chemicals, mining',
}
const COLLAPSED = 6

const short = (symbol: string) => symbol.replace('/USD', '')
const sources = (slice: ExposureSlice) =>
  slice.holdings.map(h => `${short(h.symbol)} ${formatCurrency(h.value)}`).join(' · ')

function Row({ slice, index, muted, showMarker }: { slice: ExposureSlice; index: number; muted?: boolean; showMarker?: boolean }) {
  const hint = HINTS[slice.id]
  const marker = showMarker ? slice.market_weight : null
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5">
      <p className="min-w-0 truncate text-sm">
        <span className="font-medium">{slice.label}</span>
        {hint && <span className="hidden text-xs text-muted-foreground sm:inline"> · {hint}</span>}
      </p>
      <p className="text-right font-market-data text-sm tabular-nums">
        <span className="font-semibold">{formatPercent(slice.weight)}</span>
        <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(slice.value)}</span>
      </p>
      <div className="relative col-span-2 h-2 rounded-full bg-white/[0.06]" aria-hidden>
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: muted ? 'var(--chart-axis)' : 'var(--series-portfolio)' }}
          initial={{ width: 0 }} animate={{ width: `${Math.max(slice.weight * 100, 0.6)}%` }}
          transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.05 + index * 0.05 }}
        />
        {marker != null && (
          <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/85"
            style={{ left: `${marker * 100}%` }} />
        )}
      </div>
      <p className="col-span-2 truncate text-xs text-muted-foreground">
        from {sources(slice)}
        {marker != null && <span className="sr-only">. Market mix at your stock amount: {formatPercent(marker)}</span>}
      </p>
    </li>
  )
}

/** The portfolio's ending value by sector (funds split into the companies they hold) or by asset type. */
export function ExposureBreakdown({ data, endDate, onAsk }: {
  data: MarketExposure; endDate: string; onAsk: (q: string) => void
}) {
  const [view, setView] = useState<View>('sector')
  const [expanded, setExpanded] = useState(false)
  const sectors = data.by_sector
  const collapsible = sectors.length > COLLAPSED + 1
  const shownSectors = collapsible && !expanded ? sectors.slice(0, COLLAPSED) : sectors
  const top = sectors[0]
  const question = view === 'type' || !top
    ? 'What types of investments do I hold, and how risky is each?'
    : `Am I too concentrated in ${top.label.toLowerCase()}?`

  return (
    <div className="flex flex-col gap-5">
      <Segmented id="exposure-view" label="Group my money by" size="sm" className="self-start" value={view} onChange={setView}
        options={[{ value: 'sector', label: 'By sector' }, { value: 'type', label: 'By type' }]} />

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
          {view === 'sector'
            ? data.message
            : `${formatPercent(data.company_weight, 0)} of your money is invested in companies, through funds or individual stocks.`}
        </p>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => onAsk(question)}>
          <MessageCircleQuestion /> Ask the AI
        </Button>
      </div>

      {view === 'type' ? (
        <ul key="type" aria-label="Your money by type" className="flex flex-col gap-4">
          {data.by_type.map((s, i) => <Row key={s.id} slice={s} index={i} />)}
        </ul>
      ) : (
        <div key="sector" className="flex flex-col gap-4">
          {sectors.length > 0 && (
            <>
              <ul aria-label="Your money by sector" className="flex flex-col gap-4">
                {shownSectors.map((s, i) => <Row key={s.id} slice={s} index={i} showMarker />)}
              </ul>
              {collapsible && (
                <button type="button" onClick={() => setExpanded(e => !e)}
                  className="self-start text-xs font-medium text-primary hover:underline">
                  {expanded ? 'Show fewer sectors' : `Show all ${sectors.length} sectors`}
                </button>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-foreground/85" aria-hidden />
                Where each sector would be if your money in companies followed {data.reference_name}
              </p>
            </>
          )}
          {data.outside_companies.length > 0 && (
            <div className={cn('flex flex-col gap-4', sectors.length > 0 && 'border-t border-white/[0.06] pt-4')}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Not in companies · no sector</p>
              <ul aria-label="Money not invested in companies" className="flex flex-col gap-4">
                {data.outside_companies.map((s, i) => <Row key={s.id} slice={s} index={shownSectors.length + i} muted />)}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Ending values on {endDate}.
        {data.as_of && ` Funds are split by the sectors they held as of ${formatMonthYear(data.as_of)}.`} {data.source}
      </p>
    </div>
  )
}
