import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bitcoin, Bot, Check, Globe2, Landmark, Link2, MessageCircleQuestion, Plus, RefreshCw, Scale, Shuffle, Sparkles, X,
} from 'lucide-react'

import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { BenchmarkChart } from '@/components/market/BenchmarkChart'
import { AiBuildCard, BuildWithAI } from '@/components/market/BuildWithAI'
import { ContributionBreakdown } from '@/components/market/ContributionBreakdown'
import { CorrelationHeatmap, DiversificationSummary } from '@/components/market/DiversificationXRay'
import { FutureRange } from '@/components/market/FutureRange'
import { CountUp, Reveal, Segmented } from '@/components/market/motion'
import { PortfolioCopilot, type CopilotQuestion } from '@/components/market/PortfolioCopilot'
import { ShareDialog } from '@/components/market/ShareDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { getMarketAssets, getMarketInsights, getMarketPortfolio } from '@/services/market'
import type { BenchmarkId, BuildResponse, MarketAsset, MarketPortfolio, MarketRequest } from '@/types/market'
import { formatCurrency } from '@/utils/format'
import { readSharedPortfolio, syncShareUrl } from '@/utils/share'

type Weights = Record<string, number>
type Days = 30 | 90 | 365

const PRESETS: { label: string; weights: Weights; stocks: boolean; Icon: typeof Bitcoin }[] = [
  { label: 'Crypto starter', weights: { 'BTC/USD': 50, 'ETH/USD': 30, 'SOL/USD': 20 }, stocks: false, Icon: Bitcoin },
  { label: 'Stocks & bonds', weights: { VTI: 60, BND: 40 }, stocks: true, Icon: Landmark },
  { label: 'Mixed', weights: { VTI: 50, BND: 30, 'BTC/USD': 10, 'ETH/USD': 10 }, stocks: true, Icon: Shuffle },
  { label: 'Global balanced', weights: { VTI: 40, VXUS: 20, BND: 30, SGOV: 10 }, stocks: true, Icon: Globe2 },
]
const AMOUNTS = [1000, 10000, 100000]
const CLASS_STYLE = {
  crypto: { label: 'Crypto', avatar: 'bg-[#f5b94a]/15 text-[#f7c873]' },
  stock: { label: 'Stock', avatar: 'bg-[#7cb4ff]/15 text-[#a3caff]' },
  bond: { label: 'Bond', avatar: 'bg-[#5ee6c4]/15 text-[#7eecd0]' },
} as const

const input = 'h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm transition-colors focus-visible:border-primary/60 focus-visible:outline-none'
const short = (symbol: string) => symbol.replace('/USD', '')
const toRequest = (weights: Weights, investment: number, days: Days): MarketRequest => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  return { holdings: Object.entries(weights).map(([symbol, w]) => ({ symbol, weight: w / total })), initial_investment: investment, days }
}
const sameRequest = (a: MarketRequest, b: MarketRequest) =>
  a.days === b.days && a.initial_investment === b.initial_investment && a.holdings.length === b.holdings.length &&
  a.holdings.every(h => Math.abs(h.weight - (b.holdings.find(x => x.symbol === h.symbol)?.weight ?? -1)) < 1e-6)
const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
/** Rounds weights to 2 decimals and puts the rounding remainder on the last holding so they total exactly 100. */
const toPercentWeights = (fractions: [string, number][]): Weights => {
  const next = Object.fromEntries(fractions.map(([s, w]) => [s, Math.round(w * 10000) / 100]))
  const keys = Object.keys(next)
  next[keys[keys.length - 1]] = Math.round((100 - keys.slice(0, -1).reduce((sum, k) => sum + next[k], 0)) * 100) / 100
  return next
}

export interface MarketPreset { weights: Weights; label: string }

export function MarketPage({ preset }: { preset?: MarketPreset }) {
  const catalog = useAsync(getMarketAssets, [])
  // Start from the quiz's portfolio, else a shared link (?mix=…), else the crypto preset.
  const [shared] = useState(() => preset ? undefined : readSharedPortfolio())
  const startWeights = preset?.weights ?? shared?.weights ?? PRESETS[0].weights
  const startDays: Days = preset ? 365 : shared?.days ?? 90
  const [weights, setWeights] = useState<Weights>(startWeights)
  const [investment, setInvestment] = useState(shared?.investment ?? 10000)
  const [days, setDays] = useState<Days>(startDays)
  const [applied, setApplied] = useState<MarketRequest>(() => toRequest(startWeights, shared?.investment ?? 10000, startDays))
  const [revision, setRevision] = useState(0)
  const [formError, setFormError] = useState('')
  const [benchmark, setBenchmark] = useState<BenchmarkId | null | undefined>(shared?.benchmark)
  const [note, setNote] = useState(
    preset ? `Loaded your ${preset.label}, backtested over the last year on real prices.`
      : shared ? 'You opened a shared portfolio. Tweak it and make it yours.' : '')
  const [aiBuild, setAiBuild] = useState<{ request: MarketRequest; goal: string; build: BuildResponse }>()
  const resultsRef = useRef<HTMLDivElement>(null)
  const stocksConfigured = Boolean(catalog.data?.stocks_configured)
  const effectiveBenchmark = benchmark === undefined ? (stocksConfigured ? 'SPY' : 'BTC') : benchmark

  // Keep the address bar pointing at the analyzed portfolio, so copying the URL shares it too.
  useEffect(() => {
    if (catalog.data) syncShareUrl(applied, effectiveBenchmark)
  }, [applied, effectiveBenchmark, catalog.data])

  const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
  const count = Object.keys(weights).length
  const valid = count > 0 && count <= 12 && Number.isFinite(total) && Math.abs(total - 100) < 0.0001 &&
    Object.values(weights).every(w => Number.isFinite(w) && w > 0) && Number.isFinite(investment) && investment > 0 && investment <= 1000000
  const dirty = valid && !sameRequest(toRequest(weights, investment, days), applied)

  const run = (next: MarketRequest) => {
    setApplied(next)
    setRevision(r => r + 1)
    if (window.matchMedia('(max-width: 1023px)').matches) resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const analyze = () => {
    if (!valid) {
      setFormError('Choose 1–12 assets, give each a positive weight totaling 100%, and enter $1–$1,000,000.')
      return
    }
    setFormError('')
    run(toRequest(weights, investment, days))
  }
  const loadMix = (holdings: { symbol: string; weight: number }[]) => {
    const next = toPercentWeights(holdings.map(h => [h.symbol, h.weight]))
    const request = toRequest(next, investment, days)
    setWeights(next)
    setFormError('')
    run(request)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return request
  }
  const onBuilt = (goal: string, build: BuildResponse) => {
    setAiBuild({ request: loadMix(build.holdings), goal, build })
  }

  return (
    <div className="flex flex-col gap-8">
      <motion.header
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        className="flex flex-col gap-4"
      >
        <span className="flex w-fit items-center gap-2 rounded-full border border-[var(--positive)]/25 bg-[var(--positive)]/10 px-3 py-1 text-xs font-medium text-[var(--positive)]">
          <span className="live-dot size-1.5 rounded-full bg-[var(--positive)]" aria-hidden /> Live market data from Alpaca
        </span>
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          See what your money <span className="text-gradient">could have done</span>.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Pick real stocks, ETFs, and crypto. We backtest them on actual market prices, x-ray how diversified they
          really are, and an AI copilot explains it all in plain English. Practice mode: no real money moves.
        </p>
        <AnimatePresence>
          {note && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="flex w-fit items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <Link2 className="size-4 shrink-0 text-primary" aria-hidden /> {note}
              <button type="button" onClick={() => setNote('')} aria-label="Dismiss" className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="size-4" aria-hidden />
              </button>
            </motion.p>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[370px_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.08 }}
          className="lg:sticky lg:top-[5rem]"
        >
          <Card className="gap-5 lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto scrollbar-thin">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight">Build your portfolio</CardTitle>
              <CardDescription>Start from a preset or pick up to 12 assets.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {catalog.data && <BuildWithAI investment={investment} days={days} onBuilt={onBuilt} />}
              <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-widest text-muted-foreground" aria-hidden>
                <span className="h-px flex-1 bg-white/[0.07]" />or build it yourself<span className="h-px flex-1 bg-white/[0.07]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(({ label, weights: preset, stocks, Icon }) => (
                  <motion.button key={label} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    disabled={stocks && !stocksConfigured} onClick={() => { setWeights(preset); setFormError('') }}
                    title={stocks && !stocksConfigured ? 'Needs Alpaca stock keys on the backend' : undefined}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-left text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/[0.06] disabled:cursor-not-allowed disabled:opacity-35">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden />{label}
                  </motion.button>
                ))}
              </div>
              {catalog.error && <ErrorState title="Could not load the asset catalog" error={catalog.error} onRetry={catalog.retry} />}
              {catalog.loading && <LoadingState label="Loading asset catalog" className="h-40" />}
              {catalog.data && (
                <AssetPicker assets={catalog.data.assets} weights={weights} stocksConfigured={stocksConfigured}
                  onToggle={symbol => setWeights(current => {
                    const next = { ...current }
                    if (symbol in next) delete next[symbol]
                    else {
                      const remaining = Math.round((100 - Object.values(current).reduce((a, b) => a + b, 0)) * 100) / 100
                      next[symbol] = remaining >= 1 ? remaining : 10
                    }
                    return next
                  })} />
              )}
              {catalog.data && !stocksConfigured && (
                <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.07] p-3 text-xs text-amber-100">
                  Crypto works without an account. Stocks and ETFs unlock when the backend has Alpaca market-data keys.
                </p>
              )}

              <WeightEditor weights={weights} onChange={setWeights} total={total} />

              <div className="flex flex-col gap-2">
                <label htmlFor="amount" className="text-xs font-medium text-muted-foreground">Amount to invest (practice money)</label>
                <div className="flex gap-2">
                  <span className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input id="amount" className={cn(input, 'w-full pl-6 font-market-data')} type="number" min="1" max="1000000"
                      value={Number.isFinite(investment) ? investment : ''} onChange={e => setInvestment(e.target.valueAsNumber)} />
                  </span>
                  {AMOUNTS.map(a => (
                    <button key={a} type="button" onClick={() => setInvestment(a)}
                      className={cn('rounded-xl border px-2.5 font-market-data text-xs transition-colors',
                        investment === a ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-white/[0.07] text-muted-foreground hover:text-foreground')}>
                      {a >= 1000 ? `${a / 1000}K` : a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span id="period-label" className="text-xs font-medium text-muted-foreground">Look back</span>
                <Segmented<Days> id="period" label="Look-back period" size="sm" value={days} onChange={setDays}
                  options={[{ value: 30, label: '1M' }, { value: 90, label: '3M' }, { value: 365, label: '1Y' }]} />
              </div>

              <div className="relative">
                {dirty && <span className="absolute -inset-1 animate-pulse rounded-2xl bg-primary/20 blur-md" aria-hidden />}
                <Button size="lg" variant="gradient" onClick={analyze} disabled={!catalog.data} className="relative w-full">
                  <RefreshCw aria-hidden /> {dirty ? 'Analyze changes' : 'Analyze portfolio'}
                </Button>
              </div>
              <AnimatePresence>
                {formError && (
                  <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="-mt-2 text-sm text-destructive">{formError}</motion.p>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        <div ref={resultsRef} className="flex min-w-0 scroll-mt-24 flex-col gap-6 pb-20">
          {catalog.data
            ? <PortfolioReport key={revision} request={applied} stocksConfigured={stocksConfigured}
                benchmark={effectiveBenchmark} onBenchmark={setBenchmark} onLoadMix={loadMix}
                aiBuild={aiBuild?.request === applied ? aiBuild : undefined} onDismissAi={() => setAiBuild(undefined)} />
            : <ReportSkeleton />}
        </div>
      </div>
    </div>
  )
}

function AssetPicker({ assets, weights, stocksConfigured, onToggle }: {
  assets: MarketAsset[]; weights: Weights; stocksConfigured: boolean; onToggle: (symbol: string) => void
}) {
  const [search, setSearch] = useState('')
  const count = Object.keys(weights).length
  const filtered = assets.filter(a => (a.name + ' ' + a.symbol + ' ' + a.category).toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="flex flex-col gap-2">
      <label className="sr-only" htmlFor="asset-search">Search supported assets</label>
      <input id="asset-search" className={input} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Bitcoin, Apple, bonds…" />
      <ul className="max-h-56 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-1 scrollbar-thin" aria-label="Asset catalog">
        {filtered.map(asset => {
          const selected = asset.symbol in weights
          const locked = asset.asset_class !== 'crypto' && !stocksConfigured
          const style = CLASS_STYLE[asset.asset_class]
          return (
            <li key={asset.symbol}>
              <button type="button" aria-pressed={selected} disabled={locked || (!selected && count >= 12)} onClick={() => onToggle(asset.symbol)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                  selected ? 'bg-primary/[0.1]' : 'hover:bg-white/[0.04]')}>
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full font-market-data text-[0.62rem] font-semibold', style.avatar)} aria-hidden>
                  {short(asset.symbol).slice(0, 4)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{asset.name}</span>
                  <span className="block truncate text-[0.7rem] text-muted-foreground">{style.label} · {asset.category}</span>
                </span>
                <motion.span
                  animate={{ scale: selected ? 1 : 0.9 }}
                  className={cn('grid size-6 shrink-0 place-items-center rounded-full border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15 text-muted-foreground')}>
                  {selected ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                </motion.span>
              </button>
            </li>
          )
        })}
        {!filtered.length && <li className="p-3 text-sm text-muted-foreground">No supported assets match this search.</li>}
      </ul>
    </div>
  )
}

function WeightEditor({ weights, onChange, total }: { weights: Weights; onChange: (w: Weights) => void; total: number }) {
  const entries = Object.entries(weights)
  const balanced = Math.abs(total - 100) < 0.0001
  const normalize = () => {
    if (total > 0) onChange(toPercentWeights(entries.map(([k, w]) => [k, w / total])))
  }
  const equal = () => onChange(toPercentWeights(entries.map(([k]) => [k, 1 / entries.length])))
  if (!entries.length) return <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-muted-foreground">Select at least one asset above.</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Weights</span>
        <button type="button" onClick={equal} className="flex items-center gap-1 text-xs text-primary hover:underline"><Scale className="size-3.5" aria-hidden /> Split evenly</button>
      </div>
      <ul className="flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {entries.map(([symbol, weight]) => (
            <motion.li key={symbol} layout
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-[3.75rem_1fr_4.25rem_1.5rem] items-center gap-2 overflow-hidden py-0.5">
              <span className="truncate font-market-data text-xs">{short(symbol)}</span>
              <input type="range" min={0} max={100} step={1} value={Number.isFinite(weight) ? weight : 0} aria-label={`${symbol} weight slider`}
                onChange={e => onChange({ ...weights, [symbol]: e.target.valueAsNumber })}
                className="range" style={{ '--fill': `${Number.isFinite(weight) ? weight : 0}%` } as React.CSSProperties} />
              <span className="relative">
                <input type="number" min="0.01" max="100" step="any" aria-label={`${symbol} weight percent`}
                  value={Number.isFinite(weight) ? weight : ''} onChange={e => onChange({ ...weights, [symbol]: e.target.valueAsNumber })}
                  className="h-8 w-full rounded-lg border border-white/10 bg-white/[0.04] pr-5 pl-2 text-right font-market-data text-xs focus-visible:border-primary/60 focus-visible:outline-none" />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.65rem] text-muted-foreground">%</span>
              </span>
              <button type="button" aria-label={`Remove ${symbol}`} onClick={() => { const next = { ...weights }; delete next[symbol]; onChange(next) }}
                className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground">
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
          <motion.div className={cn('h-full rounded-full', balanced ? 'bg-gradient-ai' : 'bg-destructive')}
            animate={{ width: `${Math.min(100, Number.isFinite(total) ? total : 0)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={balanced ? 'text-muted-foreground' : 'text-destructive'}>Total {Number.isFinite(total) ? total.toFixed(2) : '—'}%</span>
          {!balanced && total > 0 && <button type="button" onClick={normalize} className="text-primary hover:underline">Scale to 100%</button>}
        </div>
      </div>
    </div>
  )
}

interface DashboardProps {
  stocksConfigured: boolean
  benchmark: BenchmarkId | null
  onBenchmark: (id: BenchmarkId | null) => void
  onLoadMix: (h: { symbol: string; weight: number }[]) => void
  aiBuild: { goal: string; build: BuildResponse } | undefined
  onDismissAi: () => void
}

function PortfolioReport({ request, ...rest }: DashboardProps & { request: MarketRequest }) {
  const report = useAsync(() => getMarketPortfolio(request), [request])
  if (report.loading) return <ReportSkeleton />
  if (report.error) return <ErrorState title="Market data is unavailable" error={report.error} onRetry={report.retry} className="min-h-80 rounded-2xl" />
  if (!report.data) return null
  return <Dashboard key={report.data.data_id} data={report.data} {...rest} />
}

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Fetching real prices and calculating your portfolio" className="flex flex-col gap-6">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
      <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div>
  )
}

function Dashboard({ data, stocksConfigured, benchmark, onBenchmark, onLoadMix, aiBuild, onDismissAi }: DashboardProps & { data: MarketPortfolio }) {
  const insights = useAsync(() => getMarketInsights(data.request, benchmark), [data.data_id, benchmark])
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [question, setQuestion] = useState<CopilotQuestion>()
  const current = insights.data?.data_id === data.data_id ? insights.data : undefined
  const bench = current?.benchmark?.available && benchmark ? current.benchmark : undefined
  const ask = (text: string) => {
    setCopilotOpen(true)
    setQuestion(q => ({ id: (q?.id ?? 0) + 1, text }))
  }
  const gain = data.final_value - data.initial_value
  const up = gain >= 0
  const pct = { style: 'percent', maximumFractionDigits: 1, minimumFractionDigits: 1 } as const
  const signedPct = { ...pct, signDisplay: 'always' } as const

  const tiles = [
    {
      label: 'Volatility', value: data.annualized_volatility, format: pct,
      sub: 'yearly swing size', q: `What does ${(data.annualized_volatility * 100).toFixed(1)}% annualized volatility mean in plain English?`,
    },
    {
      label: 'Worst drop', value: data.max_drawdown, format: signedPct,
      sub: 'from a previous high', q: `Why did my portfolio fall ${(Math.abs(data.max_drawdown) * 100).toFixed(1)}% at its worst?`,
    },
    {
      label: 'Diversification', value: current?.diversification.score, format: undefined, suffix: '/100',
      sub: current?.diversification.label, q: 'How diversified is this portfolio really?',
    },
    {
      label: bench ? `vs ${bench.name}` : 'vs benchmark', value: bench?.excess_return ?? undefined, format: signedPct,
      sub: bench ? (bench.excess_return! >= 0 ? 'ahead, same dates' : 'behind, same dates') : benchmark ? undefined : 'no benchmark selected',
      q: 'How did I do against the benchmark, and why?',
    },
  ]

  return (
    <>
      {aiBuild && <Reveal><AiBuildCard goal={aiBuild.goal} build={aiBuild.build} onDismiss={onDismissAi} /></Reveal>}
      <Reveal>
        <Card className="glow-card gap-0 overflow-hidden py-0">
          <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="flex flex-col justify-center gap-2 border-b border-white/[0.06] p-6 sm:p-8 lg:border-r lg:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  If you had invested <span className="font-medium text-foreground">{formatCurrency(data.initial_value)}</span> on{' '}
                  <span className="font-medium text-foreground">{longDate(data.start_date)}</span>
                </p>
                <ShareDialog portfolio={data} benchmark={benchmark} />
              </div>
              <CountUp value={data.final_value} from={data.initial_value}
                format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                className="text-5xl font-semibold tracking-tighter tabular-nums sm:text-6xl" />
              <p className="text-sm text-muted-foreground">would be worth on {longDate(data.end_date)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
                  className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 font-market-data text-sm font-semibold',
                    up ? 'bg-[var(--positive)]/15 text-[var(--positive)]' : 'bg-[var(--negative)]/15 text-[var(--negative)]')}>
                  <span aria-hidden>{up ? '▲' : '▼'}</span>
                  <CountUp value={Math.abs(data.total_return)} from={0} format={{ style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 2 }} />
                </motion.span>
                <span className="font-market-data text-sm text-muted-foreground">
                  {up ? '+' : '−'}{formatCurrency(Math.abs(gain), 'USD', 2)} {up ? 'gain' : 'loss'}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--positive)]" aria-hidden />
                Backtested on real daily closes · {data.feeds.join(' + ')} · updated {new Date(data.fetched_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <dl className="grid grid-cols-2">
              {tiles.map((t, i) => (
                <motion.div key={t.label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 260, damping: 26 }}
                  className={cn('group relative flex flex-col gap-1 p-5 transition-colors hover:bg-white/[0.02] sm:p-6', i % 2 === 0 && 'border-r border-white/[0.06]', i < 2 && 'border-b border-white/[0.06]')}>
                  <dt className="pr-7 text-xs text-muted-foreground">{t.label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight">
                    {t.value == null
                      ? (t.sub === 'no benchmark selected' ? <span className="text-muted-foreground">—</span> : <Skeleton className="mt-1 h-7 w-20" />)
                      : <CountUp value={t.value} from={0} format={t.format} suffix={t.suffix} className="tabular-nums" />}
                  </dd>
                  {t.sub && <dd className="text-xs text-muted-foreground">{t.sub}</dd>}
                  <button type="button" onClick={() => ask(t.q)} aria-label={`Ask the AI about ${t.label}`} title="Ask the AI"
                    className="absolute top-4 right-4 rounded-full p-1.5 text-muted-foreground opacity-50 transition hover:bg-primary/15 hover:text-primary hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100">
                    <MessageCircleQuestion className="size-4" aria-hidden />
                  </button>
                </motion.div>
              ))}
            </dl>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Performance vs the market</CardTitle>
            <CardDescription>Real daily closing prices, buy and hold. Hit Replay to watch it unfold.</CardDescription>
          </CardHeader>
          <CardContent>
            <BenchmarkChart points={data.performance} baseline={data.initial_value} benchmark={current?.benchmark}
              benchmarkLoading={insights.loading} selected={benchmark} onSelect={onBenchmark}
              stocksConfigured={stocksConfigured} totalReturn={data.total_return} />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Where could it go from here?</CardTitle>
            <CardDescription>
              The range of outcomes for {formatCurrency(data.request.initial_investment)} invested today in this mix, based on its real volatility.
            </CardDescription>
          </CardHeader>
          <CardContent><FutureRange portfolio={data} /></CardContent>
        </Card>
      </Reveal>

      <section aria-labelledby="xray-title" className="flex flex-col gap-4">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Diversification X-ray</span>
          <h2 id="xray-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Are you as diversified as you think?</h2>
        </Reveal>
        {insights.error && !current && <ErrorState title="Insights are unavailable" error={insights.error} onRetry={insights.retry} className="rounded-2xl" />}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Reveal className="flex">
            <Card className="flex-1">
              <CardHeader><CardTitle className="tracking-tight">Diversification score</CardTitle></CardHeader>
              <CardContent>
                {current ? <DiversificationSummary data={current.diversification} holdings={data.positions.length} onAsk={ask} /> : <LoadingState className="h-64" label="Measuring diversification" />}
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={0.08} className="flex">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="tracking-tight">How your holdings move together</CardTitle>
                <CardDescription>Correlation of daily price changes on shared trading days.</CardDescription>
              </CardHeader>
              <CardContent>
                {current ? <CorrelationHeatmap data={current.correlation} /> : <LoadingState className="h-64" label="Calculating correlations" />}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">What drove your result</CardTitle>
            <CardDescription>Each holding's gain or loss depends on its price change and how much of the portfolio it was.</CardDescription>
          </CardHeader>
          <CardContent><ContributionBreakdown positions={data.positions} contributions={current?.contributions} /></CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <div className="ai-ring rounded-2xl">
          <Card className="glow-card border-transparent">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span className="bg-gradient-ai grid size-12 shrink-0 place-items-center rounded-2xl text-[#07080a]"><Sparkles className="size-6" aria-hidden /></span>
              <div className="flex-1">
                <p className="font-semibold">Ask the portfolio copilot</p>
                <p className="text-sm text-muted-foreground">Plain-English answers grounded in these exact numbers. Try a what-if and it recalculates on real prices.</p>
              </div>
              <Button variant="gradient" onClick={() => setCopilotOpen(true)}><Bot /> Open copilot</Button>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">How these numbers are calculated</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {data.notes.map(note => <li key={note}>{note}</li>)}
          <li>Diversification uses the diversification ratio (weighted average asset volatility ÷ portfolio volatility). Its square estimates the number of independent bets; the score is 100 × (1 − 1 / bets). Correlations use only days when every holding has a real closing price.</li>
          <li>Benchmarks are calculated the same way as your portfolio and rescaled to your portfolio's value on the first shared date.</li>
        </ul>
      </details>

      <AnimatePresence>
        {!copilotOpen && (
          <motion.button type="button" onClick={() => setCopilotOpen(true)}
            initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="ai-ring fixed right-5 bottom-5 z-30 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <span className="flex items-center gap-2 rounded-full bg-[#0c0e12] px-5 py-3 text-sm font-semibold shadow-xl shadow-black/50">
              <Sparkles className="size-4 text-[#a88bff]" aria-hidden /> Ask AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <PortfolioCopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} portfolio={data} benchmark={benchmark}
        question={question} stocksConfigured={stocksConfigured} onLoadMix={onLoadMix} diversification={current?.diversification.score} />
    </>
  )
}
