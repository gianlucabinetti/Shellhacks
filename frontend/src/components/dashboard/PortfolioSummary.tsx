import { DataLabel } from '@/components/common/DataLabel'
import { RiskLevelMeter } from '@/components/profile/RiskLevelMeter'
import { Card, CardContent } from '@/components/ui/card'
import type { Portfolio } from '@/types/api'
import { formatCurrency, formatMonthYear } from '@/utils/format'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

export function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const meta = RISK_PROFILE_META[portfolio.riskProfile]
  const change = portfolio.simulatedValue - portfolio.startingValue

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <DataLabel kind="simulated" />
          <p className="text-sm text-muted-foreground">
            Simulated value of a {formatCurrency(portfolio.startingValue, portfolio.currency)} example
            investment
          </p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatCurrency(portfolio.simulatedValue, portfolio.currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {change >= 0 ? '+' : '−'}
              {formatCurrency(Math.abs(change), portfolio.currency)}
            </span>{' '}
            since start · as of {formatMonthYear(portfolio.asOf)}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border p-4 sm:min-w-56">
          <span className="text-xs text-muted-foreground">Current risk profile</span>
          <span className="text-xl font-semibold">{meta.name}</span>
          <RiskLevelMeter profile={portfolio.riskProfile} />
        </div>
      </CardContent>
    </Card>
  )
}

