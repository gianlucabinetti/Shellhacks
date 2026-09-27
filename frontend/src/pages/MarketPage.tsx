import { useRef, useState } from 'react'
import {
  Bot, Check, Database, MessageCircleQuestion, Plus, RefreshCw, Scale, ShieldCheck, Sparkles, X,
} from 'lucide-react'

import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { BenchmarkChart } from '@/components/market/BenchmarkChart'
import { ContributionBreakdown } from '@/components/market/ContributionBreakdown'
import { CorrelationHeatmap, DiversificationSummary } from '@/components/market/DiversificationXRay'
import { PortfolioCopilot, type CopilotQuestion } from '@/components/market/PortfolioCopilot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { getMarketAssets, getMarketInsights, getMarketPortfolio } from '@/services/market'
import type { BenchmarkId, MarketAsset, MarketPortfolio, MarketRequest } from '@/types/market'
import { formatCurrency, formatPercent, formatSignedPercent } from '@/utils/format'

type Weights = Record<string, number>
type Days = 30 | 90 | 365

const PRESETS: { label: string; weights: Weights; stocks: boolean }[] = [
  { label: 'Crypto starter', weights: { 'BTC/USD': 50, 'ETH/USD': 30, 'SOL/USD': 20 }, stocks: false },
  { label: 'Stocks & bonds', weights: { VTI: 60, BND: 40 }, stocks: true },
  { label: 'Mixed', weights: { VTI: 50, BND: 30, 'BTC/USD': 10, 'ETH/USD': 10 }, stocks: true },
  { label: 'Global balanced', weights: { VTI: 40, VXUS: 20, BND: 30, SGOV: 10 }, stocks: true },
]
const PERIODS: { days: Days; label: string }[] = [{ days: 30, label: '30D' }, { days: 90, label: '90D' }, { days: 365, label: '1Y' }]
const CLASS_LABEL = { crypto: 'Crypto', stock: 'Stock', bond: 'Bond' } as const
const BADGES = [
  { Icon: Database, label: 'Actual Alpaca prices' },
  { Icon: Bot, label: 'AI copilot · Amazon Bedrock' },
  { Icon: ShieldCheck, label: 'No real money or trades' },
]

const control = 'h-10 rounded-sm border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary'
const toRequest = (weights: Weights, investment: number, days: Days): MarketRequest => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  return { holdings: Object.entries(weights).map(([symbol, w]) => ({ symbol, weight: w / total })), initial_investment: investment, days }
}
const sameRequest = (a: MarketRequest, b: MarketRequest) =>
  a.days === b.days && a.initial_investment === b.initial_investment && a.holdings.length === b.holdings.length &&
  a.holdings.every(h => Math.abs(h.weight - (b.holdings.find(x => x.symbol === h.symbol)?.weight ?? -1)) < 1e-6)
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export function MarketPage() {
  const catalog = useAsync(getMarketAssets, [])
  const [weights, setWeights] = useState<Weights>(PRESETS[0].weights)
  const [investment, setInvestment] = useState(10000)
  const [days, setDays] = useState<Days>(90)
  const [applied, setApplied] = useState<MarketRequest>(() => toRequest(PRESETS[0].weights, 10000, 90))
  const [revision, setRevision] = useState(0)
  const [formError, setFormError] = useState('')
  const [benchmark, setBenchmark] = useState<BenchmarkId | null>()
  const resultsRef = useRef<HTMLDivElement>(null)
  const stocksConfigured = Boolean(catalog.data?.stocks_configured)

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
    const next = Object.fromEntries(holdings.map(h => [h.symbol, Math.round(h.weight * 10000) / 100]))
    const keys = Object.keys(next)
    next[keys[keys.length - 1]] = Math.round((100 - keys.slice(0, -1).reduce((s, k) => s + next[k], 0)) * 100) / 100
    setWeights(next)
    setFormError('')
    run(toRequest(next, investment, days))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 border-b border-white/15 pb-5 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-primary">Portfolio lab · Real historical prices</span>
          <h1 className="font-editorial text-4xl font-semibold uppercase leading-none sm:text-5xl">X-ray any portfolio</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Build an example mix of crypto, stocks, and bonds. See how it really would have performed, whether it was
            as diversified as it looks, and ask an AI copilot to explain it or test what-ifs.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs">
          {BADGES.map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
              <Icon className="size-3.5 text-primary" aria-hidden />{label}
            </li>
          ))}
        </ul>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="gap-5 lg:sticky lg:top-[5.25rem] lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto scrollbar-thin">
          <CardHeader>
            <CardTitle className="text-lg">Build your portfolio</CardTitle>
            <CardDescription>Pick a preset or choose up to 12 assets.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button key={p.label} type="button" disabled={p.stocks && !stocksConfigured} onClick={() => { setWeights(p.weights); setFormError('') }}
                  title={p.stocks && !stocksConfigured ? 'Needs Alpaca stock credentials on the backend' : undefined}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                  {p.label}
                </button>
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
              <p className="border border-amber-300/25 bg-amber-950/25 p-3 text-xs text-amber-100">
                Crypto works without an account. Stocks and ETFs unlock when the backend has Alpaca market-data keys.
              </p>
            )}

            <WeightEditor weights={weights} onChange={setWeights} total={total} />

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                Starting amount (fictional)
                <span className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input className={cn(control, 'w-full pl-6 font-market-data text-foreground')} type="number" min="1" max="1000000"
                    value={Number.isFinite(investment) ? investment : ''} onChange={e => setInvestment(e.target.valueAsNumber)} />
                </span>
              </label>
              <div className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                <span id="period-label">Period</span>
                <div role="radiogroup" aria-labelledby="period-label" className="inline-flex h-10 rounded-sm border bg-background p-0.5">
                  {PERIODS.map(p => (
                    <button key={p.days} type="button" role="radio" aria-checked={days === p.days} onClick={() => setDays(p.days)}
                      className={cn('rounded-[3px] px-3 font-market-data text-xs', days === p.days ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button size="lg" onClick={analyze} disabled={!catalog.data} className="w-full">
              <RefreshCw aria-hidden /> {dirty ? 'Analyze changes' : 'Analyze portfolio'}
            </Button>
            {formError && <p role="alert" className="-mt-2 text-sm text-destructive">{formError}</p>}
            {dirty && !formError && <p className="-mt-3 text-center text-xs text-primary">You have changes that aren't analyzed yet.</p>}
          </CardContent>
        </Card>

        <div ref={resultsRef} className="flex min-w-0 scroll-mt-24 flex-col gap-6 pb-16">
          {catalog.data
            ? <PortfolioReport key={revision} request={applied} stocksConfigured={stocksConfigured}
                benchmark={benchmark === undefined ? (stocksConfigured ? 'SPY' : 'BTC') : benchmark}
                onBenchmark={setBenchmark} onLoadMix={loadMix} />
            : <LoadingState label="Loading" className="h-96" />}
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
      <input id="asset-search" className={control} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Bitcoin, SPY, bonds, DeFi…" />
      <ul className="max-h-52 overflow-y-auto rounded-sm border scrollbar-thin" aria-label="Asset catalog">
        {filtered.map(asset => {
          const selected = asset.symbol in weights
          const locked = asset.asset_class !== 'crypto' && !stocksConfigured
          const full = !selected && count >= 12
          return (
            <li key={asset.symbol} className="border-b last:border-0">
              <button type="button" aria-pressed={selected} disabled={locked || full} onClick={() => onToggle(asset.symbol)}
                className={cn('flex w-full items-center gap-3 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  selected ? 'bg-primary/[0.09]' : 'hover:bg-secondary/60')}>
                <span className={cn('grid size-5 shrink-0 place-items-center rounded-[3px] border', selected ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                  {selected ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{asset.name}</span>
                  <span className="block truncate text-[0.7rem] text-muted-foreground">{asset.category}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="font-market-data text-xs">{asset.symbol.replace('/USD', '')}</span>
                  <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">{CLASS_LABEL[asset.asset_class]}</span>
                </span>
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
    if (!(total > 0)) return
    const keys = Object.keys(weights)
    const next = Object.fromEntries(keys.map(k => [k, Math.round((weights[k] / total) * 10000) / 100]))
    next[keys[keys.length - 1]] = Math.round((100 - keys.slice(0, -1).reduce((s, k) => s + next[k], 0)) * 100) / 100
    onChange(next)
  }
  const equal = () => {
    const keys = Object.keys(weights)
    const each = Math.floor(10000 / keys.length) / 100
    onChange(Object.fromEntries(keys.map((k, i) => [k, i === keys.length - 1 ? Math.round((100 - each * (keys.length - 1)) * 100) / 100 : each])))
  }
  if (!entries.length) return <p className="rounded-sm border border-dashed p-4 text-center text-sm text-muted-foreground">Select at least one asset above.</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Weights</span>
        <button type="button" onClick={equal} className="flex items-center gap-1 text-xs text-primary hover:underline"><Scale className="size-3.5" aria-hidden /> Equal weights</button>
      </div>
      <ul className="flex flex-col gap-2.5">
        {entries.map(([symbol, weight]) => (
          <li key={symbol} className="grid grid-cols-[4.5rem_1fr_4.25rem_1.5rem] items-center gap-2">
            <span className="truncate font-market-data text-xs">{symbol.replace('/USD', '')}</span>
            <input type="range" min={0} max={100} step={1} value={Number.isFinite(weight) ? weight : 0} aria-label={`${symbol} weight slider`}
              onChange={e => onChange({ ...weights, [symbol]: e.target.valueAsNumber })} className="accent-[var(--primary)]" />
            <span className="relative">
              <input type="number" min="0.01" max="100" step="any" aria-label={`${symbol} weight percent`}
                value={Number.isFinite(weight) ? weight : ''} onChange={e => onChange({ ...weights, [symbol]: e.target.valueAsNumber })}
                className="h-8 w-full rounded-sm border bg-background pr-5 pl-2 text-right font-market-data text-xs focus-visible:outline-2 focus-visible:outline-primary" />
              <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.65rem] text-muted-foreground">%</span>
            </span>
            <button type="button" aria-label={`Remove ${symbol}`} onClick={() => { const next = { ...weights }; delete next[symbol]; onChange(next) }}
              className="grid size-6 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div className={cn('h-full rounded-full transition-all', balanced ? 'bg-primary' : 'bg-destructive')} style={{ width: `${Math.min(100, Number.isFinite(total) ? total : 0)}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={balanced ? 'text-muted-foreground' : 'text-destructive'}>Total {Number.isFinite(total) ? total.toFixed(2) : '—'}%</span>
          {!balanced && total > 0 && <button type="button" onClick={normalize} className="text-primary hover:underline">Scale to 100%</button>}
        </div>
      </div>
    </div>
  )
}

function PortfolioReport({ request, ...rest }: {
  request: MarketRequest; stocksConfigured: boolean; benchmark: BenchmarkId | null
  onBenchmark: (id: BenchmarkId | null) => void; onLoadMix: (h: { symbol: string; weight: number }[]) => void
}) {
  const report = useAsync(() => getMarketPortfolio(request), [request])
  if (report.loading) return <ReportSkeleton />
  if (report.error) return <ErrorState title="Market data is unavailable" error={report.error} onRetry={report.retry} className="min-h-80" />
  if (!report.data) return null
  return <Dashboard key={report.data.data_id} data={report.data} {...rest} />
}

function ReportSkeleton() {
  return (
    <div role="status" aria-label="Fetching Alpaca prices and calculating your portfolio" className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-96 w-full" />
      <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  )
}

function Dashboard({ data, stocksConfigured, benchmark, onBenchmark, onLoadMix }: {
  data: MarketPortfolio; stocksConfigured: boolean; benchmark: BenchmarkId | null
  onBenchmark: (id: BenchmarkId | null) => void; onLoadMix: (h: { symbol: string; weight: number }[]) => void
}) {
  const insights = useAsync(() => getMarketInsights(data.request, benchmark), [data.data_id, benchmark])
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [question, setQuestion] = useState<CopilotQuestion>()
  const current = insights.data?.data_id === data.data_id ? insights.data : undefined
  const bench = current?.benchmark?.available && benchmark ? current.benchmark : undefined
  const ask = (text: string) => {
    setCopilotOpen(true)
    setQuestion(q => ({ id: (q?.id ?? 0) + 1, text }))
  }

  const tiles = [
    {
      label: 'Annualized volatility', value: formatPercent(data.annualized_volatility),
      hint: 'How much the value swung day to day, scaled to a year.',
      q: `What does ${formatPercent(data.annualized_volatility)} annualized volatility mean in plain English?`,
    },
    {
      label: 'Largest decline', value: formatSignedPercent(data.max_drawdown),
      hint: 'Biggest drop from a previous high during the period.',
      q: `Why did my portfolio fall ${formatPercent(Math.abs(data.max_drawdown))} at its worst?`,
    },
    {
      label: 'Diversification', value: current ? `${current.diversification.score}/100` : undefined,
      sub: current?.diversification.label,
      hint: 'How independently your holdings moved. 0 means they all acted like one bet.',
      q: 'How diversified is this portfolio really?',
    },
    {
      label: bench ? `vs ${bench.name}` : 'vs benchmark',
      value: bench?.excess_return != null ? `${formatSignedPercent(bench.excess_return)}` : benchmark ? undefined : '—',
      sub: bench ? (bench.excess_return! >= 0 ? 'ahead over the same days' : 'behind over the same days') : benchmark ? undefined : 'No benchmark selected',
      hint: 'Your return minus the benchmark return over the same dates.',
      q: 'How did I do against the benchmark, and why?',
    },
  ]

  return (
    <>
      <Card className="glow-card gap-0 overflow-hidden py-0">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          <div className="flex flex-col justify-center gap-3 border-b p-6 lg:border-r lg:border-b-0">
            <span className="eyebrow">Hypothetical ending value</span>
            <p className="font-market-data text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{formatCurrency(data.final_value, 'USD', 2)}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn('rounded-sm px-2 py-0.5 font-market-data font-semibold tabular-nums',
                data.total_return >= 0 ? 'bg-[var(--positive)]/15 text-[var(--positive)]' : 'bg-[var(--negative)]/15 text-[var(--negative)]')}>
                {data.total_return >= 0 ? '▲' : '▼'} {formatSignedPercent(data.total_return, 2)}
              </span>
              <span className="text-muted-foreground">from {formatCurrency(data.initial_value)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{shortDate(data.start_date)} – {shortDate(data.end_date)}</p>
          </div>
          <dl className="grid grid-cols-2">
            {tiles.map((t, i) => (
              <div key={t.label} className={cn('group relative flex flex-col gap-1 p-5', i % 2 === 0 && 'border-r', i < 2 && 'border-b')}>
                <dt className="pr-6 text-xs text-muted-foreground" title={t.hint}>{t.label}</dt>
                <dd className="font-market-data text-2xl font-semibold tabular-nums">
                  {t.value ?? <Skeleton className="mt-1 h-7 w-20" />}
                </dd>
                {t.sub && <dd className="text-xs text-muted-foreground">{t.sub}</dd>}
                <button type="button" onClick={() => ask(t.q)} aria-label={`Ask the AI about ${t.label}`} title="Ask the AI"
                  className="absolute top-4 right-4 rounded-sm p-1 text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-primary hover:opacity-100 focus-visible:opacity-100">
                  <MessageCircleQuestion className="size-4" aria-hidden />
                </button>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-background/40 px-6 py-2.5 text-[0.7rem] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[var(--positive)]" aria-hidden />Actual historical prices · {data.feeds.join(' + ')}</span>
          <span>Holdings are fictional</span>
          <span>Fetched {new Date(data.fetched_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{data.cached ? ' · cached' : ''}</span>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance vs the market</CardTitle>
          <CardDescription>Buy and hold, completed daily closes. Both lines start from the same value on the first shared day.</CardDescription>
        </CardHeader>
        <CardContent>
          <BenchmarkChart points={data.performance} baseline={data.initial_value} benchmark={current?.benchmark}
            benchmarkLoading={insights.loading} selected={benchmark} onSelect={onBenchmark}
            stocksConfigured={stocksConfigured} totalReturn={data.total_return} />
        </CardContent>
      </Card>

      <section aria-labelledby="xray-title" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="eyebrow text-primary">Diversification X-ray</span>
            <h2 id="xray-title" className="font-editorial text-2xl uppercase">Are you as diversified as you think?</h2>
          </div>
        </div>
        {insights.error && !current && <ErrorState title="Insights are unavailable" error={insights.error} onRetry={insights.retry} />}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Card>
            <CardHeader><CardTitle>Diversification score</CardTitle></CardHeader>
            <CardContent>
              {current ? <DiversificationSummary data={current.diversification} holdings={data.positions.length} onAsk={ask} /> : <LoadingState className="h-64" label="Measuring diversification" />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>How your holdings move together</CardTitle>
              <CardDescription>Correlation of daily price changes on shared trading days.</CardDescription>
            </CardHeader>
            <CardContent>
              {current ? <CorrelationHeatmap data={current.correlation} /> : <LoadingState className="h-64" label="Calculating correlations" />}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>What drove your result</CardTitle>
          <CardDescription>Each holding's dollar gain or loss depends on its price change and how much of the portfolio it was.</CardDescription>
        </CardHeader>
        <CardContent><ContributionBreakdown positions={data.positions} contributions={current?.contributions} /></CardContent>
      </Card>

      <Card className="glow-card">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary"><Sparkles className="size-6" aria-hidden /></span>
          <div className="flex-1">
            <p className="font-semibold">Ask the portfolio copilot</p>
            <p className="text-sm text-muted-foreground">Get plain-English answers grounded in these exact numbers, or test a what-if mix against the same price history.</p>
          </div>
          <Button onClick={() => setCopilotOpen(true)}><Bot /> Open copilot</Button>
        </CardContent>
      </Card>

      <details className="rounded-sm border p-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">How these numbers are calculated</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {data.notes.map(note => <li key={note}>{note}</li>)}
          <li>Diversification uses the diversification ratio (weighted average asset volatility ÷ portfolio volatility). Its square estimates the number of independent bets; the score is 100 × (1 − 1 / bets). Correlations use only days when every holding has a real closing price.</li>
          <li>Benchmarks are calculated the same way as your portfolio and rescaled to your portfolio's value on the first shared date.</li>
        </ul>
      </details>

      {!copilotOpen && (
        <button type="button" onClick={() => setCopilotOpen(true)}
          className="fixed right-5 bottom-5 z-30 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/40 transition hover:bg-[#9acbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Sparkles className="size-4" aria-hidden /> Ask AI
        </button>
      )}
      <PortfolioCopilot open={copilotOpen} onClose={() => setCopilotOpen(false)} portfolio={data} benchmark={benchmark}
        question={question} stocksConfigured={stocksConfigured} onLoadMix={onLoadMix} diversification={current?.diversification.score} />
    </>
  )
}
