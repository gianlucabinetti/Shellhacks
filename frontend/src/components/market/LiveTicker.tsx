import { useEffect, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'

import { cn } from '@/lib/utils'
import { getMarketTicker } from '@/services/market'
import type { MarketTicker, TickerQuote } from '@/types/market'

const POLL_MS = 30_000

/** Tiny trend line of recent daily closes; color follows the day's direction. */
export function Sparkline({ values, up, className }: { values: number[]; up: boolean; className?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 48},${14 - ((v - min) / span) * 12}`).join(' ')
  return (
    <svg viewBox="0 0 48 16" className={cn('h-4 w-12', className)} aria-hidden>
      <polyline points={points} fill="none" stroke={up ? 'var(--positive)' : 'var(--negative)'} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Quote({ quote, flash }: { quote: TickerQuote; flash: 'up' | 'down' | undefined }) {
  const up = quote.change >= 0
  return (
    <div className={cn(
      'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-1 transition-colors duration-700',
      flash === 'up' && 'bg-[var(--positive)]/15', flash === 'down' && 'bg-[var(--negative)]/15',
    )}>
      <span className="text-xs font-semibold text-foreground">{quote.symbol.replace('/USD', '')}</span>
      <NumberFlow
        value={quote.price} className="font-market-data text-xs text-foreground/90"
        format={{ style: 'currency', currency: 'USD', maximumFractionDigits: quote.price < 5 ? 4 : 2 }}
      />
      <span className={cn('flex items-center font-market-data text-[0.68rem]', up ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
        <span aria-hidden>{up ? '▲' : '▼'}</span>
        <NumberFlow value={Math.abs(quote.change)} format={{ style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 2 }} />
      </span>
      <Sparkline values={quote.spark} up={quote.spark.length > 1 ? quote.spark[quote.spark.length - 1] >= quote.spark[0] : up} />
      {!quote.live && <span className="rounded-full border border-white/10 px-1.5 text-[0.58rem] uppercase tracking-wide text-muted-foreground">Closed</span>}
    </div>
  )
}

/** Real Alpaca prices, refreshed every 30 seconds while the tab is visible. */
export function LiveTicker() {
  const [data, setData] = useState<MarketTicker>()
  const [failed, setFailed] = useState(false)
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down'>>({})
  const previous = useRef<Record<string, number>>({})

  useEffect(() => {
    let active = true
    let timer: number | undefined
    const load = async () => {
      try {
        const next = await getMarketTicker()
        if (!active) return
        const changed: Record<string, 'up' | 'down'> = {}
        for (const q of next.quotes) {
          const before = previous.current[q.symbol]
          if (before !== undefined && before !== q.price) changed[q.symbol] = q.price > before ? 'up' : 'down'
          previous.current[q.symbol] = q.price
        }
        setData(next)
        setFailed(false)
        if (Object.keys(changed).length) {
          setFlashes(changed)
          window.setTimeout(() => active && setFlashes({}), 900)
        }
      } catch {
        if (active) setFailed(true)
      }
    }
    const schedule = () => {
      window.clearInterval(timer)
      if (document.visibilityState === 'visible') timer = window.setInterval(load, POLL_MS)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
      schedule()
    }
    void load()
    schedule()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const stocksClosed = data?.stocks_included && data.quotes.some(q => q.asset_class !== 'crypto' && !q.live)

  return (
    <section className="border-b border-white/[0.06] bg-black/30" aria-label="Live market prices">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <span className="flex shrink-0 items-center gap-2 py-2 pr-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--positive)]">
          <span className={cn('live-dot size-1.5 rounded-full', failed && !data ? 'bg-muted-foreground' : 'bg-[var(--positive)]')} aria-hidden />
          {failed && !data ? <span className="text-muted-foreground">Offline</span> : 'Live'}
        </span>
        <div className="ticker-viewport min-w-0 flex-1 overflow-hidden py-1.5 [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
          {data ? (
            <div className="ticker-track flex w-max">
              {[0, 1].map(copy => (
                <div key={copy} className="flex shrink-0 gap-1 pr-1" aria-hidden={copy === 1}>
                  {data.quotes.map(q => <Quote key={q.symbol} quote={q} flash={flashes[q.symbol]} />)}
                </div>
              ))}
            </div>
          ) : failed ? (
            <p className="py-1 text-xs text-muted-foreground">Live prices are unavailable. Start the backend to stream Alpaca data.</p>
          ) : (
            <div className="flex gap-3 py-1">{Array.from({ length: 6 }, (_, i) => <div key={i} className="shimmer h-5 w-40 rounded-md" />)}</div>
          )}
        </div>
        <span className="hidden shrink-0 text-[0.62rem] text-muted-foreground xl:block">
          Alpaca · crypto 24/7{stocksClosed ? ' · stocks at last close' : ''}
        </span>
      </div>
    </section>
  )
}
