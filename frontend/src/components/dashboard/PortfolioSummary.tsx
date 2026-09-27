import { RiskLevelMeter } from '@/components/profile/RiskLevelMeter'
import type { Portfolio, PortfolioAnalytics } from '@/types/api'
import { formatCurrency, formatMonthYear, formatPercent } from '@/utils/format'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

export function PortfolioSummary({ portfolio, analytics }: { portfolio: Portfolio; analytics: PortfolioAnalytics }) {
  const meta = RISK_PROFILE_META[portfolio.riskProfile]
  const change = portfolio.simulatedValue - portfolio.startingValue
  const totalReturn = change / portfolio.startingValue

  return (
    <section className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr]" aria-label="Portfolio summary">
      <div className="bg-[#181b1d] p-5 sm:p-6">
        <p className="eyebrow">Portfolio value · Simulated</p>
        <p className="font-market-data mt-3 text-3xl font-medium tabular-nums sm:text-4xl">{formatCurrency(portfolio.simulatedValue, portfolio.currency)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatCurrency(portfolio.startingValue, portfolio.currency)} initial value · as of {formatMonthYear(portfolio.asOf)}
        </p>
      </div>
      <SummaryMetric label="Total return" value={`${totalReturn >= 0 ? '+' : '−'}${formatPercent(Math.abs(totalReturn))}`} detail={`${change >= 0 ? '+' : '−'}${formatCurrency(Math.abs(change), portfolio.currency)} since start`} tone={change >= 0 ? 'positive' : 'negative'} />
      <div className="flex flex-col justify-center gap-2 bg-[#181b1d] p-5 sm:p-6">
        <p className="eyebrow">Risk profile</p>
        <p className="font-editorial text-2xl font-semibold uppercase">{meta.name}</p>
        <RiskLevelMeter profile={portfolio.riskProfile} />
      </div>
      <SummaryMetric label="Maximum drawdown" value={formatPercent(analytics.maxDrawdown)} detail="Largest observed peak-to-trough fall" tone="negative" />
    </section>
  )
}

function SummaryMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'positive' | 'negative' }) {
  return (
    <div className="flex flex-col justify-center gap-2 bg-[#181b1d] p-5 sm:p-6">
      <p className="eyebrow">{label}</p>
      <p className={`font-market-data text-2xl font-medium tabular-nums ${tone === 'positive' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{value}</p>
      <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}

