import { useState } from 'react'
import { motion } from 'motion/react'
import { MessageCircleQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { MarketInsights } from '@/types/market'
import { CountUp } from './motion'

const short = (symbol: string) => symbol.replace('/USD', '')

/** Semicircle gauge for the 0–100 diversification score. */
export function ScoreGauge({ score, label }: { score: number; label: string }) {
  return (
    <figure className="relative mx-auto w-48" aria-label={`Diversification score ${score} out of 100, ${label}`}>
      <svg viewBox="0 0 128 72" className="w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="gauge-fill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#7cb4ff" /><stop offset="100%" stopColor="#5ee6c4" />
          </linearGradient>
        </defs>
        <path d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="var(--secondary)" strokeWidth="10" strokeLinecap="round" />
        <motion.path
          d="M12 64 A52 52 0 0 1 116 64" fill="none" stroke="url(#gauge-fill)" strokeWidth="10" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: Math.max(score, 1) / 100 }}
          transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.15 }}
        />
      </svg>
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <CountUp value={score} from={0} className="font-market-data text-4xl font-semibold leading-none" />
        <span className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted-foreground">out of 100</span>
      </figcaption>
    </figure>
  )
}

export function DiversificationSummary({ data, holdings, onAsk }: {
  data: MarketInsights['diversification']; holdings: number; onAsk: (q: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <ScoreGauge score={data.score} label={data.label} />
      <div className="text-center">
        <p className="text-xl font-semibold tracking-tight">{data.label}</p>
        {holdings > 1 && (
          <p className="text-sm text-muted-foreground">
            {holdings} holdings acting like <span className="font-medium text-foreground">≈{data.effective_bets.toFixed(1)}</span> independent bets
          </p>
        )}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{data.message}</p>
      <Button variant="outline" size="sm" className="self-start"
        onClick={() => onAsk(`Why is my diversification score ${data.score}, and what would raise it?`)}>
        <MessageCircleQuestion /> Ask the AI why
      </Button>
    </div>
  )
}

/** Diverging fill: blue for opposite moves, neutral gray for independent, red for moving together. */
function cellColor(value: number) {
  const pole = value < 0 ? 'var(--div-negative)' : 'var(--div-positive)'
  return `color-mix(in oklab, ${pole} ${Math.round(Math.abs(value) * 100)}%, var(--div-neutral))`
}

function describe(value: number) {
  if (value >= 0.7) return 'move closely together'
  if (value >= 0.3) return 'tend to move together'
  if (value > -0.3) return 'move mostly independently'
  return 'tend to move in opposite directions'
}

export function CorrelationHeatmap({ data }: { data: MarketInsights['correlation'] }) {
  const [hover, setHover] = useState<{ a: string; b: string; value: number | null }>()
  const n = data.symbols.length
  const showValues = n <= 6

  if (n < 2) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Add a second asset to see how your holdings move together.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="mx-auto border-separate border-spacing-[2px] font-market-data text-xs" onMouseLeave={() => setHover(undefined)}>
          <caption className="sr-only">Correlation of daily returns between each pair of holdings</caption>
          <thead>
            <tr>
              <th />
              {data.symbols.map(s => <th key={s} scope="col" className="px-1 pb-1 font-medium text-muted-foreground">{short(s)}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.symbols.map((row, i) => (
              <tr key={row}>
                <th scope="row" className="pr-2 text-right font-medium text-muted-foreground">{short(row)}</th>
                {data.matrix[i].map((value, j) => {
                  const col = data.symbols[j]
                  const diagonal = i === j
                  const label = diagonal ? `${short(row)} with itself` : value == null
                    ? `${short(row)} and ${short(col)}: not enough data`
                    : `${short(row)} and ${short(col)}: ${value.toFixed(2)}, ${describe(value)}`
                  return (
                    <motion.td
                      key={col} tabIndex={diagonal ? -1 : 0} aria-label={label}
                      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.05 + (i + j) * 0.035 }}
                      onMouseEnter={() => !diagonal && setHover({ a: row, b: col, value })}
                      onFocus={() => !diagonal && setHover({ a: row, b: col, value })}
                      className="size-11 rounded-lg text-center tabular-nums outline-none ring-foreground/70 transition-shadow hover:ring-2 focus-visible:ring-2 sm:size-12"
                      style={{
                        background: diagonal ? 'var(--secondary)' : value == null ? 'transparent' : cellColor(value),
                        color: value != null && !diagonal && Math.abs(value) > 0.6 ? 'var(--background)' : 'var(--foreground)',
                        border: value == null && !diagonal ? '1px dashed var(--border)' : undefined,
                      }}
                    >
                      {diagonal ? <span className="text-muted-foreground">—</span> : showValues && value != null ? value.toFixed(2) : ''}
                    </motion.td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="min-h-5 text-center text-sm" aria-live="polite">
        {hover
          ? hover.value == null
            ? `${short(hover.a)} × ${short(hover.b)}: not enough shared trading days`
            : <><span className="font-medium">{short(hover.a)} × {short(hover.b)}: {hover.value.toFixed(2)}</span> <span className="text-muted-foreground">— they {describe(hover.value)}</span></>
          : <span className="text-muted-foreground">Hover a square to compare two holdings</span>}
      </p>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-1.5">
        <div className="h-1.5 rounded-full" aria-hidden
          style={{ background: 'linear-gradient(90deg, var(--div-negative), var(--div-neutral), var(--div-positive))' }} />
        <div className="flex justify-between text-[0.68rem] text-muted-foreground">
          <span>−1 Opposite</span><span>0 Independent</span><span>+1 Together</span>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">Based on {data.observations} shared daily price changes.</p>
    </div>
  )
}
