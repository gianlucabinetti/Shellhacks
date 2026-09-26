import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'

import { AllocationChart } from '@/components/charts/AllocationChart'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { DataLabel } from '@/components/common/DataLabel'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { MockDataNotice } from '@/components/common/MockDataNotice'
import { HoldingsTable } from '@/components/dashboard/HoldingsTable'
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary'
import { RiskMetrics } from '@/components/dashboard/RiskMetrics'
import { RiskChangeModal } from '@/components/profile/RiskChangeModal'
import { RiskProfileSwitcher } from '@/components/profile/RiskProfileSwitcher'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { getAnalytics, getPerformance, getPortfolio } from '@/services/api'
import type { PerformanceRange, RiskProfile } from '@/types/api'
import { formatCurrency, formatMonthYear, formatPercent } from '@/utils/format'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

const RANGES: PerformanceRange[] = ['1Y', '5Y', '10Y']

interface DashboardPageProps {
  riskProfile: RiskProfile
  onRiskProfileChange: (profile: RiskProfile) => void
}

export function DashboardPage({ riskProfile, onRiskProfileChange }: DashboardPageProps) {
  const [range, setRange] = useState<PerformanceRange>('5Y')
  const [pendingProfile, setPendingProfile] = useState<RiskProfile | null>(null)
  const [justChangedTo, setJustChangedTo] = useState<RiskProfile | null>(null)

  const overview = useAsync(
    () => Promise.all([getPortfolio(riskProfile), getAnalytics(riskProfile)]),
    [riskProfile],
  )
  const performance = useAsync(() => getPerformance(riskProfile, range), [riskProfile, range])

  if (overview.error && !overview.data) {
    return <ErrorState title="We couldn't load your portfolio" error={overview.error} onRetry={overview.retry} />
  }
  if (!overview.data) {
    return (
      <div className="flex flex-col gap-6">
        <LoadingState label="Loading portfolio" className="h-40" />
        <LoadingState label="Loading charts" className="h-80" />
      </div>
    )
  }

  const [portfolio, analytics] = overview.data
  const stockWeight = portfolio.allocation
    .filter((s) => s.assetClass === 'us_stocks' || s.assetClass === 'intl_stocks')
    .reduce((sum, s) => sum + s.weight, 0)
  const updating = overview.loading

  return (
    <div className={cn('flex flex-col gap-6 transition-opacity', updating && 'pointer-events-none opacity-60')}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your example portfolio</h1>
        <p className="text-muted-foreground">{portfolio.description}</p>
      </div>

      <MockDataNotice>
        Demo mode: every number on this page is generated mock data for an illustrative portfolio.
        Performance and risk figures are not real market history.
      </MockDataNotice>

      {overview.error && (
        <ErrorState
          title="We couldn't refresh your portfolio"
          error={overview.error}
          onRetry={overview.retry}
        />
      )}

      {justChangedTo && !overview.error && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
        >
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Your risk level is now <strong>{RISK_PROFILE_META[justChangedTo].name}</strong>. The
              portfolio and charts below have been updated.
            </span>
          </span>
          <button type="button" onClick={() => setJustChangedTo(null)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      )}

      <PortfolioSummary portfolio={portfolio} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Asset allocation</CardTitle>
            <CardDescription>How the example portfolio is split across types of investments.</CardDescription>
            <CardAction>
              <DataLabel kind="simulated" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <AllocationChart
              allocation={portfolio.allocation}
              centerLabel={formatPercent(stockWeight, 0)}
              centerSubLabel="stocks"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk level</CardTitle>
            <CardDescription>
              Curious how a different approach compares? Pick one to preview it. Nothing changes until
              you confirm.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RiskProfileSwitcher current={riskProfile} onSelect={setPendingProfile} disabled={updating} />
            <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
              {[
                'Each level uses a different example mix of stocks, bonds and cash.',
                'Before switching, you see how the allocation and past risk would change.',
                'You confirm the change, then the dashboard updates.',
              ].map((text, i) => (
                <li key={text} className="flex gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical performance</CardTitle>
          <CardDescription>
            How {formatCurrency(portfolio.startingValue, portfolio.currency)} in this example portfolio would have
            changed, based on past market data.
          </CardDescription>
          <CardAction>
            <DataLabel kind="historical" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-1" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={r === range ? 'secondary' : 'ghost'}
                aria-pressed={r === range}
                onClick={() => setRange(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          {performance.error ? (
            <ErrorState error={performance.error} onRetry={performance.retry} className="h-70" />
          ) : performance.data ? (
            <div className={cn('transition-opacity', performance.loading && 'opacity-50')}>
              <PerformanceChart
                points={performance.data.series}
                baseline={performance.data.startingValue}
                color={RISK_PROFILE_META[performance.data.riskProfile].colorVar}
                currency={portfolio.currency}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Dashed line: starting value. Past performance does not guarantee future results.
              </p>
            </div>
          ) : (
            <LoadingState label="Loading performance" className="h-70" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk at a glance</CardTitle>
          <CardDescription>
            {formatMonthYear(analytics.periodStart)} – {formatMonthYear(analytics.periodEnd)}
          </CardDescription>
          <CardAction>
            <DataLabel kind="historical" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <RiskMetrics analytics={analytics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>Broad index funds used to build the example. Tickers are placeholders.</CardDescription>
          <CardAction>
            <DataLabel kind="simulated" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <HoldingsTable holdings={portfolio.holdings} currency={portfolio.currency} />
        </CardContent>
      </Card>

      <RiskChangeModal
        current={{ portfolio, analytics }}
        target={pendingProfile}
        onCancel={() => setPendingProfile(null)}
        onConfirmed={(profile) => {
          setPendingProfile(null)
          setJustChangedTo(profile)
          onRiskProfileChange(profile)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </div>
  )
}

