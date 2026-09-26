import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, RefreshCw, Sparkles } from 'lucide-react'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAsync } from '@/hooks/useAsync'
import { explainMarketPortfolio, getMarketAssets, getMarketPortfolio } from '@/services/market'
import type { MarketExplanation, MarketPortfolio, MarketRequest } from '@/types/market'

const INITIAL: MarketRequest = {
  holdings: [{ symbol: 'BTC/USD', weight: 0.5 }, { symbol: 'ETH/USD', weight: 0.3 }, { symbol: 'SOL/USD', weight: 0.2 }],
  initial_investment: 10000,
  days: 90,
}
const money = (value: number) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value)
const percent = (value: number) => new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 }).format(value)
const control = 'h-10 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary'
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.'

export function MarketPage() {
  const catalog = useAsync(getMarketAssets, [])
  const [search, setSearch] = useState('')
  const [weights, setWeights] = useState<Record<string, number>>({ 'BTC/USD': 50, 'ETH/USD': 30, 'SOL/USD': 20 })
  const [investment, setInvestment] = useState(10000)
  const [days, setDays] = useState<30 | 90 | 365>(90)
  const [applied, setApplied] = useState(INITIAL)
  const [revision, setRevision] = useState(0)
  const [formError, setFormError] = useState('')
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  const count = Object.keys(weights).length
  const filtered = catalog.data?.assets.filter(a =>
    (a.name + ' ' + a.symbol + ' ' + a.category).toLowerCase().includes(search.toLowerCase())) ?? []

  const apply = () => {
    if (!count || count > 12 || !Number.isFinite(total) || Math.abs(total - 100) > 0.0001 ||
        Object.values(weights).some(w => !Number.isFinite(w) || w <= 0) ||
        !Number.isFinite(investment) || investment <= 0 || investment > 1000000) {
      setFormError('Choose 1–12 assets, give each a positive weight totaling 100%, and enter $1–$1,000,000.')
      return
    }
    setFormError('')
    setApplied({
      holdings: Object.entries(weights).map(([symbol, weight]) => ({ symbol, weight: weight / total })),
      initial_investment: investment, days,
    })
    setRevision(r => r + 1)
  }
  const toggle = (symbol: string) => setWeights(current => {
    const next = { ...current }
    if (symbol in next) delete next[symbol]
    else next[symbol] = 0
    return next
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Alpaca market data</span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore a portfolio of possibilities</h1>
        <p className="max-w-3xl text-muted-foreground">
          Build an example mix of crypto, stocks, and ETFs. See how it would have performed using
          actual historical prices, without connecting a wallet or personal investment account.
        </p>
        <p className="text-sm text-muted-foreground">Completed daily prices · Fictional holdings · No trades</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Choose your example investments</CardTitle>
          <CardDescription>
            Start with Bitcoin, Ethereum, and Solana, or search the catalog for more.
            Categories describe token uses; they do not imply similar risks or expected returns.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setWeights({ 'BTC/USD': 50, 'ETH/USD': 30, 'SOL/USD': 20 })}>Crypto starter</Button>
            <Button variant="outline" disabled={!catalog.data?.stocks_configured} onClick={() => setWeights({ VTI: 60, BND: 40 })}>Stock / bond example</Button>
            <Button variant="outline" disabled={!catalog.data?.stocks_configured} onClick={() => setWeights({ VTI: 50, BND: 30, 'BTC/USD': 10, 'ETH/USD': 10 })}>Mixed example</Button>
          </div>
          {catalog.data && !catalog.data.stocks_configured && (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">
              Crypto data is available without an account. Stock and ETF examples become available
              when the app owner configures Alpaca market-data credentials.
            </p>
          )}
          {catalog.error && <ErrorState title="Could not load the asset catalog" error={catalog.error} onRetry={catalog.retry} />}
          {catalog.loading && <LoadingState label="Loading asset catalog" className="h-20" />}
          {catalog.data && (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Search supported assets
                <input className={control} value={search} onChange={e => setSearch(e.target.value)} placeholder="Bitcoin, SOL, DeFi, ETF…" />
              </label>
              <div className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" aria-label="Asset catalog">
                {filtered.map(asset => {
                  const selected = asset.symbol in weights
                  const locked = asset.asset_class !== 'crypto' && !catalog.data?.stocks_configured
                  return (
                    <label key={asset.symbol} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected ? 'border-primary bg-primary/5' : ''} ${locked ? 'opacity-50' : ''}`}>
                      <input className="mt-1" type="checkbox" checked={selected}
                        disabled={locked || (!selected && count >= 12)} onChange={() => toggle(asset.symbol)} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{asset.name} <span className="text-muted-foreground">{asset.symbol}</span></span>
                        <span className="text-xs text-muted-foreground">{asset.category}</span>
                      </span>
                    </label>
                  )
                })}
                {!filtered.length && <p className="p-3 text-sm text-muted-foreground">No supported assets match this search.</p>}
              </div>
            </>
          )}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(weights).map(([symbol, weight]) => (
              <label key={symbol} className="flex flex-col gap-1.5 text-sm font-medium">
                {symbol} weight (%)
                <input className={control} type="number" min="0.01" max="100" step="any"
                  value={Number.isFinite(weight) ? weight : ''} onChange={e => setWeights(w => ({ ...w, [symbol]: e.target.valueAsNumber }))} />
              </label>
            ))}
          </div>
          <p className={`text-sm ${Math.abs(total - 100) < 0.0001 ? 'text-muted-foreground' : 'text-destructive'}`}>
            {count} selected · Total weight: {Number.isFinite(total) ? total.toFixed(2) : '—'}%
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Fictional starting amount (USD)
              <input className={control} type="number" min="1" max="1000000" value={Number.isFinite(investment) ? investment : ''}
                onChange={e => setInvestment(e.target.valueAsNumber)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Historical period
              <select className={control} value={days} onChange={e => setDays(Number(e.target.value) as 30 | 90 | 365)}>
                <option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>1 year</option>
              </select>
            </label>
            <Button onClick={apply} disabled={!catalog.data}><RefreshCw aria-hidden /> Analyze portfolio</Button>
          </div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <p className="text-xs text-muted-foreground">Changes apply when you select Analyze portfolio. Prices may be cached for up to five minutes.</p>
        </CardContent>
      </Card>
      <PortfolioReport key={revision} request={applied} />
    </div>
  )
}

function PortfolioReport({ request }: { request: MarketRequest }) {
  const report = useAsync(() => getMarketPortfolio(request), [request])
  if (report.loading) return <LoadingState label="Fetching Alpaca prices and calculating your example portfolio" className="h-60" />
  if (report.error) return <ErrorState title="Market data is unavailable" error={report.error} onRetry={report.retry} />
  if (!report.data) return null
  return <ReportDetails data={report.data} />
}

function ReportDetails({ data }: { data: MarketPortfolio }) {
  const [explanation, setExplanation] = useState<MarketExplanation>()
  const [explaining, setExplaining] = useState(false)
  const [explanationError, setExplanationError] = useState('')
  const explain = async () => {
    setExplaining(true)
    setExplanationError('')
    setExplanation(undefined)
    try {
      const result = await explainMarketPortfolio(data.request)
      if (result.data_id !== data.data_id) throw new Error('The price history changed. Analyze the portfolio again before requesting an explanation.')
      setExplanation(result)
    } catch (error) {
      setExplanationError(message(error))
    } finally {
      setExplaining(false)
    }
  }
  const stats = [
    ['Hypothetical ending value', money(data.final_value)],
    ['Period return', percent(data.total_return)],
    ['Annualized volatility', percent(data.annualized_volatility)],
    ['Largest observed decline', percent(data.max_drawdown)],
  ]
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        <p className="font-medium">Actual historical prices · Hypothetical portfolio</p>
        <p>{data.start_date} to {data.end_date} · {data.feeds.join(' + ')}</p>
        <p className="mt-1 text-xs">Fetched {new Date(data.fetched_at).toLocaleString()} · {data.cached ? 'Cached response' : 'Fetched from provider'}. Closing dates are shown for each asset below.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => <Card key={label}><CardContent className="pt-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle>What {money(data.initial_value)} would have become</CardTitle>
          <CardDescription>Buy-and-hold example using completed daily observations. No fees, taxes, or staking income.</CardDescription></CardHeader>
        <CardContent><PerformanceChart points={data.performance} baseline={data.initial_value} preciseDates /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your example holdings</CardTitle><CardDescription>Initial weights and hypothetical fractional quantities. Prices are daily closes, not executable quotes.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground"><tr>
              {['Asset', 'Initial weight', 'Last close', 'Price date', 'Period return', 'Example value'].map(h => <th className="p-3 font-medium" key={h}>{h}</th>)}
            </tr></thead>
            <tbody>{data.positions.map(p => <tr key={p.symbol} className="border-b last:border-0">
              <td className="p-3"><span className="block font-medium">{p.name}</span><span className="text-xs text-muted-foreground">{p.symbol} · {p.category}</span></td>
              <td className="p-3 tabular-nums">{percent(p.weight)}</td>
              <td className="p-3 tabular-nums">{money(p.last_close)}</td>
              <td className="whitespace-nowrap p-3">{p.last_close_date}</td>
              <td className="p-3"><span className="inline-flex items-center gap-1 tabular-nums">
                {p.period_return >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}{percent(p.period_return)}
              </span></td>
              <td className="p-3 tabular-nums">{money(p.end_value)}</td>
            </tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Understand this portfolio</CardTitle>
          <CardDescription>Get an explanation of the calculated values and asset mix.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="self-start" disabled={explaining} onClick={() => { void explain() }}>
            <Sparkles aria-hidden />{explaining ? 'Preparing explanation…' : 'Explain my example'}
          </Button>
          {explanationError && <p role="alert" className="text-sm text-destructive">{explanationError}</p>}
          {explanation && (
            <div className="flex flex-col gap-3 text-sm" aria-live="polite">
              <span className="self-start rounded-full border px-3 py-1 text-xs font-medium">
                {explanation.source === 'bedrock' ? 'AI explanation · Amazon Bedrock' : 'Template explanation · AI unavailable or disabled'}
              </span>
              <p>{explanation.explanation.summary} {explanation.explanation.allocation_explanation}</p>
              <p>{explanation.explanation.risk_explanation}</p><p>{explanation.explanation.beginner_tip}</p>
              <p className="text-xs text-muted-foreground">{explanation.explanation.disclaimer}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <details className="rounded-lg border p-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">How these numbers are calculated</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">{data.notes.map(note => <li key={note}>{note}</li>)}</ul>
      </details>
    </div>
  )
}
